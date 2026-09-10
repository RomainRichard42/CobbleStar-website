import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool, transaction } from "./db.js";
import { config } from "./config.js";
import { canReadGame, canWriteGame } from "./game-admin.js";
import { studioContent, studioDraft, emptyStudio } from "./quest-studio-schema.js";
import { storyEvents } from "./quest-events.js";
import { createQuestUploadReceiver } from "./quest-sync-upload.js";

type Actor = { id: string; discord_id: string | null };
type Auth = { session: (req: FastifyRequest) => Promise<Actor | null>; server: (req: FastifyRequest) => boolean };
const serverId = z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/);
const params = z.object({ serverId });
const decode = (v: unknown) => typeof v === "string" ? JSON.parse(v) : v;
const options = { bodyLimit: 2 * 1024 * 1024, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } };
// The installed modpack registry is much larger than a draft. Keep drafts at
// 2 MiB and raise only the authenticated server catalogue transport to 16 MiB.
const syncOptions = { ...options, bodyLimit: 16 * 1024 * 1024 };
// last_seen_at is written with UTC_TIMESTAMP, regardless of the Node host TZ.
const lastSeenSql = "CONCAT(LEFT(DATE_FORMAT(last_seen_at,'%Y-%m-%dT%H:%i:%s.%f'),23),'Z')";
const saveBody = z.object({ baseRevision: z.number().int().nonnegative(), content: studioDraft }).strict();
const publishBody = z.object({ baseRevision: z.number().int().nonnegative(), reason: z.string().trim().min(5).max(300) }).strict();
const choice = z.object({ id: z.string().max(180), label: z.string().max(240) });
const catalogSchema = z.object({ protocol: z.literal(2), items: z.array(choice).max(30000), blocks: z.array(choice).max(20000), entities: z.array(choice).max(10000), species: z.array(choice).max(10000), biomes: z.array(choice).max(10000), dimensions: z.array(choice).max(1000) });
function narrativeOnly(value: unknown) {
  const content = decode(value) as typeof emptyStudio | null;
  if (!content) return emptyStudio;
  // Migration of old drafts, without mutating stored publications or player progress.
  const live = content.questConfig.quests.filter(q => ['STORY','SIDE'].includes(q.kind));
  const ids = new Set(live.map(q => q.id));
  return { ...content, questConfig: { ...content.questConfig, quests: live.map(q => ({...q,sequential:q.sequential ?? false})), chapters: content.questConfig.chapters.map(c => ({...c,questIds:c.questIds.filter(id => ids.has(id))})) } };
}

export function registerQuestStudio(app: FastifyInstance, auth: Auth) {
  const receiveUpload = createQuestUploadReceiver();
  async function authorize(req: FastifyRequest, reply: FastifyReply, write = false) {
    reply.header("Cache-Control", "no-store");
    const actor = await auth.session(req);
    if (!actor) { reply.code(401).send({ error: "AUTH_REQUIRED" }); return null; }
    if (!(write ? canWriteGame(actor) : canReadGame(actor))) { reply.code(403).send({ error: "GAME_ADMIN_REQUIRED" }); return null; }
    if (write && req.headers.origin !== new URL(config.SITE_ORIGIN).origin) { reply.code(403).send({ error: "INVALID_ORIGIN" }); return null; }
    return actor;
  }
  app.get("/api/admin/quests", options, async (req, reply) => {
    const actor = await authorize(req, reply); if (!actor) return;
    const [servers] = await pool.query<RowDataPacket[]>(`SELECT server_id AS serverId,published_revision AS publishedRevision,applied_revision AS appliedRevision,${lastSeenSql} AS lastSeenAt,sync_error AS error FROM quest_studio ORDER BY server_id`);
    return { servers, canWrite: canWriteGame(actor) };
  });
  app.get("/api/admin/quests/:serverId", options, async (req, reply) => {
    const actor = await authorize(req, reply); if (!actor) return;
    const { serverId: key } = params.parse(req.params);
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT *,${lastSeenSql} AS last_seen_iso FROM quest_studio WHERE server_id=?`, [key]);
    if (!rows[0]) return reply.code(404).send({ error: "SERVER_NOT_OBSERVED" });
    const row = rows[0];
    const [history] = await pool.execute<RowDataPacket[]>("SELECT revision,actor_discord_id AS actor,reason,created_at AS createdAt FROM quest_publications WHERE server_id=? ORDER BY revision DESC LIMIT 20", [key]);
    const observed = decode(row.observed_json);
    return { content: narrativeOnly(row.draft_json), observed: observed ? narrativeOnly(observed) : null, catalog: observed?.catalog ?? null, placements: decode(row.placements_json) ?? [],
      draftRevision: Number(row.draft_revision), publishedRevision: Number(row.published_revision), appliedRevision: Number(row.applied_revision),
      lastSeenAt: row.last_seen_iso ?? null, error: row.sync_error, history, canWrite: canWriteGame(actor) };
  });
  app.put("/api/admin/quests/:serverId", options, async (req, reply) => {
    if (!await authorize(req, reply, true)) return;
    const { serverId: key } = params.parse(req.params);
    const parsed = saveBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT", message: parsed.error.issues.slice(0, 12).map(i => `${i.path.join(".")} : ${i.message}`).join("\n") });
    const input = parsed.data;
    const result = await transaction(async c => {
      const [rows] = await c.execute<RowDataPacket[]>("SELECT draft_revision FROM quest_studio WHERE server_id=? FOR UPDATE", [key]);
      if (!rows[0] || Number(rows[0].draft_revision) !== input.baseRevision) return null;
      await c.execute("UPDATE quest_studio SET draft_json=?,draft_revision=draft_revision+1 WHERE server_id=?", [JSON.stringify(input.content), key]);
      return input.baseRevision + 1;
    });
    if (result === null) return reply.code(409).send({ error: "DRAFT_CONFLICT", message: "Le brouillon a changé. Actualise avant de reprendre." });
    return { draftRevision: result };
  });
  app.post("/api/admin/quests/:serverId/publish", options, async (req, reply) => {
    const actor = await authorize(req, reply, true); if (!actor) return;
    const { serverId: key } = params.parse(req.params), input = publishBody.parse(req.body);
    let validationMessage = '';
    const revision = await transaction(async c => {
      const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM quest_studio WHERE server_id=? FOR UPDATE", [key]);
      const row = rows[0];
      if (!row || !row.draft_json || Number(row.draft_revision) !== input.baseRevision) return null;
      if (decode(row.observed_json)?.catalog?.protocol !== 2) return -1;
      const parsed = studioContent.safeParse(decode(row.draft_json));
      if (!parsed.success) { validationMessage = parsed.error.issues.slice(0,12).map(i => i.message).join('\n'); return -2; }
      const catalog = catalogSchema.safeParse(decode(row.observed_json)?.catalog);
      if (!catalog.success) return -1;
      for (const q of parsed.data.questConfig.quests) {
        if (!q.autoStart && !parsed.data.npcs.some(n => n.enabled && ['DIALOGUE_QUEST','TURN_IN','SHOP'].includes(n.role) && n.questIds.includes(q.id))) {
          validationMessage = `${q.title} : choisis le personnage qui propose l’histoire, ou un démarrage automatique.`; return -2;
        }
        for (const [i, o] of q.objectives.entries()) for (const field of storyEvents.find(e => e.id === o.source)!.fields) {
          if (['number','boolean','npcs'].includes(field.kind) || !o.filters[field.key]) continue;
          const choices = catalog.data[field.kind as 'items'|'blocks'|'entities'|'species'|'biomes'|'dimensions'];
          if (!choices.some(c => c.id === o.filters[field.key])) { validationMessage = `${q.title}, étape ${i+1} : la sélection « ${field.label} » n’est plus disponible sur le serveur.`; return -2; }
        }
        for (const reward of q.rewards) for (const command of reward.commands) {
          const itemId = /^give \{player\} (\S+) /.exec(command)?.[1];
          if (itemId && !catalog.data.items.some(item => item.id === itemId)) { validationMessage = `${q.title} : choisis à nouveau l’objet offert dans « ${reward.label} » ; il est absent du serveur.`; return -2; }
        }
      }
      const content = JSON.stringify(parsed.data);
      const next = Number(row.published_revision) + 1;
      await c.execute("INSERT INTO quest_publications(server_id,revision,content_json,actor_discord_id,reason) VALUES(?,?,?,?,?)", [key, next, content, actor.discord_id, input.reason]);
      await c.execute("UPDATE quest_studio SET published_json=?,published_revision=? WHERE server_id=?", [content, next, key]);
      return next;
    });
    if (revision === -1) return reply.code(409).send({ error: "STORY_ENGINE_REQUIRED", message: "Le catalogue des scénarios du serveur est absent ou incompatible. Vérifie la synchronisation Quest Studio dans le journal serveur et la version de l’API. Le brouillon reste enregistré." });
    if (revision === -2) return reply.code(400).send({ error: "STORY_INCOMPLETE", message: validationMessage });
    if (revision === null) return reply.code(409).send({ error: "DRAFT_CONFLICT" });
    return { publishedRevision: revision };
  });
  app.get("/api/admin/quests/:serverId/history/:revision", options, async (req, reply) => {
    if (!await authorize(req, reply)) return;
    const p = params.extend({ revision: z.coerce.number().int().positive() }).parse(req.params);
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT content_json FROM quest_publications WHERE server_id=? AND revision=?", [p.serverId, p.revision]);
    if (!rows[0]) return reply.code(404).send({ error: "REVISION_NOT_FOUND" });
    return { content: narrativeOnly(rows[0].content_json) };
  });
  app.post("/api/internal/quests/sync", { ...syncOptions, onRequest: async (req: FastifyRequest, reply: FastifyReply) => {
    if (!auth.server(req)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
  } }, async (req, reply) => sync(req, reply, req.body));
  app.post("/api/internal/quests/sync-chunk", {
    bodyLimit: 96 * 1024, config: { rateLimit: { max: 1800, timeWindow: "1 minute" } },
    onRequest: async (req: FastifyRequest, reply: FastifyReply) => {
      if (!auth.server(req)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    },
  }, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    const result = await receiveUpload(req.body);
    return result.complete ? sync(req, reply, result.body) : result;
  });
  async function sync(req: FastifyRequest, reply: FastifyReply, body: unknown) {
    reply.header("Cache-Control", "no-store");
    if (!auth.server(req)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const parsed = z.object({ serverId, appliedRevision: z.number().int().nonnegative(), error: z.string().max(500),
      observed: z.object({ questConfig: z.record(z.string(), z.unknown()), npcs: z.array(z.unknown()).max(250), catalog: catalogSchema.optional() }),
      placements: z.array(z.object({ key: z.string().max(160), name: z.string().max(64), templateId: z.string().max(48) })).max(2000),
    }).strict().safeParse(body);
    if (!parsed.success) {
      // Paths/codes only: no catalogue, dialogue, request headers or server key.
      req.log.warn({ issues: parsed.error.issues.slice(0, 8).map(i => ({ path: i.path.join('.'), code: i.code })) }, 'Quest Studio sync schema rejected');
      return reply.code(400).send({ error: "INVALID_QUEST_SYNC", message: "Catalogue ou PNJ non conformes au schéma Quest Studio." });
    }
    const input = parsed.data;
    await pool.execute(`INSERT INTO quest_studio(server_id,observed_json,placements_json,applied_revision,sync_error,last_seen_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE observed_json=JSON_MERGE_PATCH(COALESCE(observed_json,JSON_OBJECT()),VALUES(observed_json)),placements_json=VALUES(placements_json),applied_revision=VALUES(applied_revision),sync_error=VALUES(sync_error),last_seen_at=UTC_TIMESTAMP(3)`,
    [input.serverId, JSON.stringify(input.observed), JSON.stringify(input.placements), input.appliedRevision, input.error]);
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT published_revision,published_json FROM quest_studio WHERE server_id=?", [input.serverId]);
    return { revision: Number(rows[0]!.published_revision), content: decode(rows[0]!.published_json) };
  }
}
