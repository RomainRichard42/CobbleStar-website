import { z } from "zod";

// These are the built sites, not editable world coordinates or console commands.
export const arenaSites = [
  ["bug", "bug", -240, -180], ["grass", "grass", -80, -180],
  ["water", "water", 80, -180], ["ice", "ice", 240, -180],
  ["rock", "rock", 240, 180], ["fire", "fire", 80, 180],
  ["flying", "flying", -80, 180], ["psychic", "psychic", -240, 180],
  ["elite_electric", "league", -96, 480], ["elite_ground", "league", -48, 480],
  ["elite_ghost", "league", 0, 480], ["elite_dragon", "league", 48, 480],
  ["champion", "league", 96, 480],
] as const;
const resource = z.string().max(160).regex(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/).refine(v => !v.includes("://"), "Choisis une ressource du serveur, pas une URL.");
const trait = z.string().max(160).regex(/^(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+$/).refine(v => !v.includes("://"), "Choisis une ressource du serveur, pas une URL.");
const optionalTrait = z.union([z.literal(""), trait]);
// Real 1.8 forms include Unown character-? / character-! and Oricorio pa'u-style.
const aspect = z.string().max(96).regex(/^[a-z0-9_:=.!?'-]+$/);
const name = (max: number) => z.string().trim().min(1).max(max).refine(v => !/[\u0000-\u001f\u007f§]/.test(v), "Nom : aucun caractère de contrôle ou code de formatage.");
const stats = (max: number) => z.object({
  hp: z.number().int().min(0).max(max), atk: z.number().int().min(0).max(max),
  def: z.number().int().min(0).max(max), spa: z.number().int().min(0).max(max),
  spd: z.number().int().min(0).max(max), spe: z.number().int().min(0).max(max),
}).strict();
export const arenaPokemon = z.object({
  species: trait, level: z.number().int().min(1).max(100), shiny: z.boolean(),
  nature: optionalTrait, ability: optionalTrait, moves: z.array(trait).max(4),
  heldItem: z.union([z.literal(""), resource.refine(v => v !== "minecraft:air", "Choisis un objet, ou laisse vide.")]),
  gender: z.enum(["random", "male", "female", "genderless"]), ivs: stats(31), evs: stats(252),
  aspects: z.array(aspect).max(16),
  // Migration-only field. Publication can preserve an observed value, never invent one.
  legacyProperties: z.string().max(1024).refine(v => !/[\u0000-\u001f\u007f]/.test(v)).optional(),
}).strict().superRefine((p, ctx) => {
  if (Object.values(p.evs).reduce((sum, v) => sum + v, 0) > 510) ctx.addIssue({ code: "custom", path: ["evs"], message: "Maximum 510 EV au total." });
  if (new Set(p.moves.map(normalizeTrait)).size !== p.moves.length) ctx.addIssue({ code: "custom", path: ["moves"], message: "Une attaque ne peut pas être répétée." });
  if (new Set(p.aspects).size !== p.aspects.length) ctx.addIssue({ code: "custom", path: ["aspects"], message: "Aspects dupliqués." });
});
export const arenaRewards = z.object({
  items: z.array(z.object({ item: resource.refine(v => v !== "minecraft:air", "Récompense vide non autorisée."), count: z.number().int().min(1).max(64) }).strict()).max(8),
  experiencePoints: z.number().int().min(0).max(100000),
  cobbleCoins: z.number().int().min(0).max(1000000),
}).strict();
export const arenaTrainer = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,47}$/).refine(v => v !== "champion", "Identifiant réservé au champion."), name: name(64), enabled: z.boolean(), required: z.boolean(),
  slot: z.number().int().min(0).max(5), npcClass: resource, skill: z.number().int().min(0).max(100),
  team: z.array(arenaPokemon).min(1).max(6), rewards: arenaRewards,
}).strict();
export const arenaStage = z.object({
  id: z.string().max(48), index: z.number().int(), name: name(80), theme: z.string().max(32), champion: name(64),
  level: z.number().int().min(1).max(100), x: z.number().int(), z: z.number().int(), league: z.boolean(),
  badgeItem: resource, npcClass: resource, skill: z.number().int().min(0).max(100),
  team: z.array(arenaPokemon).min(1).max(6), rewards: arenaRewards, trainers: z.array(arenaTrainer).max(6),
}).strict();
export const arenaContent = z.object({ schemaVersion: z.literal(1), stages: z.array(arenaStage).length(13) }).strict().superRefine((content, ctx) => {
  content.stages.forEach((stage, i) => {
    const site = arenaSites[i]!;
    const fail = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: "custom", path: ["stages", i, ...path], message });
    if (stage.id !== site[0] || stage.theme !== site[1] || stage.x !== site[2] || stage.z !== site[3] || stage.index !== i + 1 || stage.league !== (i >= 8)) fail("L'ordre, le type et la position des 13 sites ne peuvent pas être modifiés.");
    if (stage.badgeItem !== `cobblestar_planets:arena_badge_${site[1]}`) fail("Le badge de cette arène est fixe.", ["badgeItem"]);
    if (new Set(stage.trainers.map(t => t.id)).size !== stage.trainers.length) fail("Identifiants de dresseurs dupliqués.", ["trainers"]);
    if (new Set(stage.trainers.map(t => t.slot)).size !== stage.trainers.length) fail("Chaque dresseur doit avoir un emplacement distinct.", ["trainers"]);
    if (stage.trainers.some(t => t.required && !t.enabled)) fail("Un dresseur obligatoire doit être activé.", ["trainers"]);
  });
});

const choice = z.object({ id: trait, label: z.string().max(240) }).strict();
export const arenaCatalog = z.object({
  protocol: z.literal(1), species: z.array(choice.extend({ forms: z.array(z.object({ id: z.string().max(80), label: z.string().max(120), aspects: z.array(aspect).max(16) }).strict()).max(300).optional() })).max(15000), items: z.array(choice.extend({ id: resource })).max(30000),
  moves: z.array(choice).max(10000), abilities: z.array(choice).max(10000), natures: z.array(choice).max(1000), npcClasses: z.array(choice).max(2000),
}).strict();
export const ARENA_MAX_REVISION = 2147483647;
export const arenaRuntime = z.object({
  pendingRewards: z.number().int().min(0).max(ARENA_MAX_REVISION), reviewRewards: z.number().int().min(0).max(ARENA_MAX_REVISION),
  activeBattles: z.number().int().min(0).max(ARENA_MAX_REVISION), worldReady: z.boolean(),
}).strict();
export const arenaObserved = z.object({ arenaConfig: arenaContent, catalog: arenaCatalog.optional(), runtime: arenaRuntime.optional() }).strict();
export const arenaSync = z.object({
  serverId: z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/), appliedRevision: z.number().int().min(0).max(ARENA_MAX_REVISION),
  error: z.string().max(500), observed: arenaObserved,
}).strict();
export type ArenaContent = z.infer<typeof arenaContent>;
export type ArenaCatalog = z.infer<typeof arenaCatalog>;
export const normalizeTrait = (id: string) => id.includes(":") ? id : `cobblemon:${id}`;

/** Server registries, never a hand-maintained web list. Species legality is checked again by the mod. */
export function validateArenaCatalog(content: ArenaContent, catalog: ArenaCatalog, preserved: ArenaContent[] = []): string[] {
  const sets = {
    species: new Set(catalog.species.map(v => normalizeTrait(v.id))),
    items: new Set(catalog.items.map(v => v.id)),
    moves: new Set(catalog.moves.map(v => normalizeTrait(v.id))),
    abilities: new Set(catalog.abilities.map(v => normalizeTrait(v.id))),
    natures: new Set(catalog.natures.map(v => normalizeTrait(v.id))),
    npcClasses: new Set(catalog.npcClasses.map(v => normalizeTrait(v.id))),
  };
  const issues: string[] = [];
  const oldPokemon = preserved.flatMap(c => c.stages.flatMap(s => [...s.team, ...s.trainers.flatMap(t => t.team)]));
  const aspectKey = (aspects: string[]) => [...aspects].sort().join(",");
  const oldAspects = new Set(oldPokemon.map(p => `${normalizeTrait(p.species)}|${aspectKey(p.aspects)}`));
  const oldProperties = new Set(oldPokemon.filter(p => p.legacyProperties).map(p => `${normalizeTrait(p.species)}|${p.legacyProperties}`));
  const speciesForms = new Map(catalog.species.map(s => [normalizeTrait(s.id), new Set((s.forms ?? []).map(f => aspectKey(f.aspects)))]));
  const check = (kind: keyof typeof sets, value: string, label: string) => {
    if (value && !sets[kind].has(kind === "items" ? value : normalizeTrait(value))) issues.push(`${label} : « ${value} » n'existe plus dans le catalogue du serveur.`);
  };
  for (const stage of content.stages) {
    check("items", stage.badgeItem, `${stage.name}, badge`);
    for (const person of [{ name: stage.champion, npcClass: stage.npcClass, team: stage.team, rewards: stage.rewards }, ...stage.trainers]) {
      const label = `${stage.name} · ${person.name}`;
      check("npcClasses", person.npcClass, `${label}, apparence`);
      for (const [i, pokemon] of person.team.entries()) {
        const prefix = `${label}, Pokémon ${i + 1}`;
        check("species", pokemon.species, prefix);
        check("natures", pokemon.nature, `${prefix}, nature`);
        check("abilities", pokemon.ability, `${prefix}, talent`);
        check("items", pokemon.heldItem, `${prefix}, objet tenu`);
        for (const move of pokemon.moves) check("moves", move, `${prefix}, attaque`);
        const species = normalizeTrait(pokemon.species), aspects = aspectKey(pokemon.aspects);
        if (pokemon.aspects.length && !speciesForms.get(species)?.has(aspects) && !oldAspects.has(`${species}|${aspects}`)) issues.push(`${prefix} : cette forme n'est pas disponible dans le catalogue du serveur.`);
        if (pokemon.legacyProperties && !oldProperties.has(`${species}|${pokemon.legacyProperties}`)) issues.push(`${prefix} : les propriétés de migration ne peuvent pas être créées ou modifiées depuis le site.`);
      }
      for (const reward of person.rewards.items) check("items", reward.item, `${label}, récompense`);
    }
  }
  return issues.slice(0, 12);
}
