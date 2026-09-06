import { z } from "zod";

const id = z.string().regex(/^[a-z0-9_-]{2,48}$/);
const item = z.string().regex(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/);
const text = (max: number) => z.string().max(max);
const skin = text(256).refine(v => v === ""
  || /^player:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}:[A-Za-z0-9_]{1,16}$/.test(v)
  || (!v.startsWith("player:") && !v.includes("://") && /^(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+$/.test(v)),
  "Skin : ressource du mod, champ vide (Steve), ou player:UUID:pseudo. Les URL et player:pseudo seul ne sont pas pris en charge par le Studio.");
const shopOffers = text(8000).refine(value => value.split(/\r?\n/).every(line => {
  if (!line.trim() || line.trim().startsWith("#")) return true;
  const fields = line.split("|").map(v => v.trim());
  if (fields.length !== 4 || !item.safeParse(fields[0]).success || !fields.slice(1).every(v => /^\d+$/.test(v))) return false;
  const [count, buy, sell] = fields.slice(1).map(Number);
  return count! >= 1 && count! <= 64 && Number.isSafeInteger(buy) && Number.isSafeInteger(sell) && (buy! > 0 || sell! > 0);
}), "Offre : namespace:objet|quantité (1–64)|prix achat|prix revente ; prix entiers positifs, 0 désactive ce sens de transaction.");
// Reward commands cannot become a remote console or a way to grant staff permissions.
export const rewardCommand = z.string().max(180).refine(value =>
  /^give \{player\} [a-z0-9_.-]+:[a-z0-9_./-]+ ([1-9]|[1-5][0-9]|6[0-4])$/.test(value)
  || /^experience add \{player\} ([1-9][0-9]{0,4}) (points|levels)$/.test(value),
  "Utiliser give {player} namespace:objet 1–64 ou experience add {player} quantité points|levels");
export const questSchema = z.object({
  id, title: z.string().trim().min(1).max(100), description: text(2000),
  category: z.string().min(1).max(48), chapterId: text(48).default(""), chapterTitle: text(100).default(""),
  kind: z.enum(["STORY", "SIDE", "DAILY", "WEEKLY", "MONTHLY"]),
  difficulty: z.enum(["FACILE", "NORMAL", "DIFFICILE", "EXPERT"]),
  icon: item, accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), order: z.number().int().min(0).max(10000), autoStart: z.boolean(),
  requires: z.array(id).max(40),
  objectives: z.array(z.object({ source: z.string().regex(/^[a-z0-9_:-]{2,80}$/), label: z.string().min(1).max(160), target: z.number().int().min(1).max(1000000),
    unique: z.boolean(), optional: z.boolean().default(false), alternativeGroup: text(48).default(""), filters: z.record(z.string().regex(/^[a-z0-9_]{1,40}$/), text(160)).default({}),
  }).strict()).min(1).max(24),
  rewards: z.array(z.object({ label: z.string().min(1).max(100), icon: item, choice: z.boolean(), commands: z.array(rewardCommand).max(8) }).strict()).max(20),
}).strict();
const graph = z.object({ start: id, nodes: z.array(z.object({ id, title: text(100), text: text(4000), canvasX: z.number().int().min(-10000).max(10000).default(0), canvasY: z.number().int().min(-10000).max(10000).default(0),
  choices: z.array(z.object({ label: z.string().min(1).max(120), target: text(48), action: z.string().regex(/^(|close|accept:[a-z0-9_-]{2,48})$/) }).strict()).max(8),
}).strict()).min(1).max(80) }).strict();
export const npcTemplateSchema = z.object({
  id, name: z.string().trim().min(1).max(64).refine(v => !v.toLowerCase().startsWith("local:") && !/[\r\n§]/.test(v), "Nom réservé ou formatage non autorisé"), enabled: z.boolean(),
  role: z.enum(["DIALOGUE_ONLY", "DIALOGUE_QUEST", "TURN_IN", "DAYCARE", "RANKED", "SHOP"]),
  dialogue: text(4000), dialogueGraph: graph, questIds: z.array(id).max(40), permission: z.number().int().min(0).max(4),
  repeatableDialogue: z.boolean(), skin, nameColor: z.enum(["NONE", "ROLE", "CYAN", "PINK", "GOLD", "GREEN", "VIOLET"]),
  visualRole: z.enum(["STORY", "SIDE", "MERCHANT", "EVENT"]), shopOffers,
}).strict();
export const studioContent = z.object({
  questConfig: z.object({ resetHour: z.number().int().min(0).max(23), quests: z.array(questSchema).max(500),
    chapters: z.array(z.object({ id, title: z.string().min(1).max(100), order: z.number().int().min(0).max(10000), unlockMode: z.enum(["PREVIOUS", "IMMEDIATE", "MANUAL"]), questIds: z.array(id).max(500) }).strict()).max(80),
  }).strict(), npcs: z.array(npcTemplateSchema).max(250),
}).strict().superRefine((content, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  const quests = new Map(content.questConfig.quests.map(q => [q.id, q]));
  if (quests.size !== content.questConfig.quests.length) fail("Identifiants de quête dupliqués");
  const visiting = new Set<string>(), visited = new Set<string>();
  function visit(key: string) {
    if (visiting.has(key)) { fail(`Cycle de prérequis : ${key}`); return; }
    if (visited.has(key)) return;
    visiting.add(key);
    for (const dependency of quests.get(key)?.requires ?? []) {
      if (!quests.has(dependency)) fail(`Prérequis inconnu : ${dependency}`); else visit(dependency);
    }
    visiting.delete(key); visited.add(key);
  }
  for (const q of quests.values()) { visit(q.id); if (q.rewards.filter(r => r.choice).length > 4) fail(`${q.id} : maximum 4 récompenses au choix`); }
  const chapters = new Set<string>(), assigned = new Set<string>();
  for (const chapter of content.questConfig.chapters) {
    if (chapters.has(chapter.id)) fail(`Chapitre dupliqué : ${chapter.id}`); chapters.add(chapter.id);
    for (const key of chapter.questIds) { if (!quests.has(key) || assigned.has(key)) fail(`Quête de chapitre inconnue ou affectée deux fois : ${key}`); assigned.add(key); }
  }
  const names = new Set<string>(), ids = new Set<string>();
  for (const npc of content.npcs) {
    if (Buffer.byteLength(JSON.stringify(npc), "utf8") > 18000) fail(`${npc.name} : dialogue trop volumineux pour le paquet Minecraft (18 Ko par fiche). Réduis ou sépare le personnage.`);
    const name = npc.name.trim().replace(/\s+/g, " ").toLowerCase();
    if (names.has(name) || ids.has(npc.id)) fail(`Nom ou identifiant de PNJ dupliqué : ${npc.name}`);
    names.add(name); ids.add(npc.id);
    const nodes = new Set(npc.dialogueGraph.nodes.map(n => n.id));
    if (nodes.size !== npc.dialogueGraph.nodes.length || !nodes.has(npc.dialogueGraph.start)) fail(`${npc.name} : entrée de dialogue invalide`);
    for (const key of npc.questIds) if (!quests.has(key)) fail(`${npc.name} : quête inconnue ${key}`);
    for (const node of npc.dialogueGraph.nodes) for (const choice of node.choices) {
      if (choice.target && !nodes.has(choice.target)) fail(`${npc.name} : branche inconnue ${choice.target}`);
      if (choice.action.startsWith("accept:") && !npc.questIds.includes(choice.action.slice(7))) fail(`${npc.name} : le choix propose une quête non attribuée au PNJ`);
    }
  }
});
export type StudioContent = z.infer<typeof studioContent>;
export type StudioQuest = z.infer<typeof questSchema>;
export type StudioNpc = z.infer<typeof npcTemplateSchema>;
export const emptyStudio: StudioContent = { questConfig: { resetHour: 6, quests: [], chapters: [] }, npcs: [] };
