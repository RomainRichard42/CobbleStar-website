import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool, transaction } from "./db.js";
import { config } from "./config.js";
import { canReadGame, canWriteGame } from "./game-admin.js";
import { studioContent, emptyStudio } from "./quest-studio-schema.js";

type Actor = { id: string; discord_id: string | null };
type Auth = { session: (req: FastifyRequest) => Promise<Actor | null>; server: (req: FastifyRequest) => boolean };
const serverId = z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/);
const params = z.object({ serverId });
const decode = (v: unknown) => typeof v === "string" ? JSON.parse(v) : v;
const options = { bodyLimit: 2 * 1024 * 1024, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } };
const saveBody = z.object({ baseRevision: z.number().int().nonnegative(), content: studioContent }).strict();
const publishBody = z.object({ baseRevision: z.number().int().nonnegative(), reason: z.string().trim().min(5).max(300) }).strict();

export function registerQuestStudio(app: FastifyInstance, auth: Auth) {
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
    const [servers] = await pool.query<RowDataPacket[]>("SELECT server_id AS serverId,published_revision AS publishedRevision,applied_revision AS appliedRevision,last_seen_at AS lastSeenAt,sync_error AS error FROM quest_studio ORDER BY server_id");
    return { servers, canWrite: canWriteGame(actor) };
  });
  app.get("/api/admin/quests/:serverId", options, async (req, reply) => {
    const actor = await authorize(req, reply); if (!actor) return;
    const { serverId: key } = params.parse(req.params);
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT * FROM quest_studio WHERE server_id=?", [key]);
    if (!rows[0]) return reply.code(404).send({ error: "SERVER_NOT_OBSERVED" });
    const row = rows[0];
    const [history] = await pool.execute<RowDataPacket[]>("SELECT revision,actor_discord_id AS actor,reason,created_at AS createdAt FROM quest_publications WHERE server_id=? ORDER BY revision DESC LIMIT 20", [key]);
    return { content: decode(row.draft_json) ?? emptyStudio, observed: decode(row.observed_json), placements: decode(row.placements_json) ?? [],
      draftRevision: Number(row.draft_revision), publishedRevision: Number(row.published_revision), appliedRevision: Number(row.applied_revision),
      lastSeenAt: row.last_seen_at, error: row.sync_error, history, canWrite: canWriteGame(actor) };
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
    const revision = await transaction(async c => {
      const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM quest_studio WHERE server_id=? FOR UPDATE", [key]);
      const row = rows[0];
      if (!row || !row.draft_json || Number(row.draft_revision) !== input.baseRevision) return null;
      const content = JSON.stringify(studioContent.parse(decode(row.draft_json)));
      const next = Number(row.published_revision) + 1;
      await c.execute("INSERT INTO quest_publications(server_id,revision,content_json,actor_discord_id,reason) VALUES(?,?,?,?,?)", [key, next, content, actor.discord_id, input.reason]);
      await c.execute("UPDATE quest_studio SET published_json=?,published_revision=? WHERE server_id=?", [content, next, key]);
      return next;
    });
    if (revision === null) return reply.code(409).send({ error: "DRAFT_CONFLICT" });
    return { publishedRevision: revision };
  });
  app.get("/api/admin/quests/:serverId/history/:revision", options, async (req, reply) => {
    if (!await authorize(req, reply)) return;
    const p = params.extend({ revision: z.coerce.number().int().positive() }).parse(req.params);
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT content_json FROM quest_publications WHERE server_id=? AND revision=?", [p.serverId, p.revision]);
    if (!rows[0]) return reply.code(404).send({ error: "REVISION_NOT_FOUND" });
    return { content: decode(rows[0].content_json) };
  });
  app.post("/api/internal/quests/sync", options, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!auth.server(req)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const input = z.object({ serverId, appliedRevision: z.number().int().nonnegative(), error: z.string().max(500),
      observed: z.object({ questConfig: z.record(z.string(), z.unknown()), npcs: z.array(z.unknown()).max(250) }),
      placements: z.array(z.object({ key: z.string().max(160), name: z.string().max(64), templateId: z.string().max(48) })).max(2000),
    }).strict().parse(req.body);
    await pool.execute(`INSERT INTO quest_studio(server_id,observed_json,placements_json,applied_revision,sync_error,last_seen_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE observed_json=VALUES(observed_json),placements_json=VALUES(placements_json),applied_revision=VALUES(applied_revision),sync_error=VALUES(sync_error),last_seen_at=UTC_TIMESTAMP(3)`,
    [input.serverId, JSON.stringify(input.observed), JSON.stringify(input.placements), input.appliedRevision, input.error]);
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT published_revision,published_json FROM quest_studio WHERE server_id=?", [input.serverId]);
    return { revision: Number(rows[0]!.published_revision), content: decode(rows[0]!.published_json) };
  });
}
