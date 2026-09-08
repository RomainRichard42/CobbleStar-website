import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { isDeepStrictEqual } from "node:util";
import { pool, transaction } from "./db.js";
import { config } from "./config.js";
import { canReadGame, canWriteGame } from "./game-admin.js";
import { arenaContent, arenaCatalog, arenaSync, ARENA_MAX_REVISION, validateArenaCatalog } from "./arena-studio-schema.js";

type Actor = { id: string; discord_id: string | null };
type Auth = { session: (req: FastifyRequest) => Promise<Actor | null>; server: (req: FastifyRequest) => boolean };
const MAX_REVISION = ARENA_MAX_REVISION; // Java bridge uses a signed int, not MySQL's full unsigned range.
const revision = z.number().int().min(0).max(MAX_REVISION);
const serverId = z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/);
const params = z.object({ serverId });
const options = { bodyLimit: 2 * 1024 * 1024, config: { rateLimit: { max: 60, timeWindow: "1 minute" } } };
const saveBody = z.object({ baseRevision: revision, content: arenaContent }).strict();
const publishBody = z.object({ baseRevision: revision, reason: z.string().trim().min(5).max(300) }).strict();
const decode = (value: unknown): any => typeof value === "string" ? JSON.parse(value) : value;
const issueText = (error: z.ZodError) => error.issues.slice(0, 12).map(i => `${i.path.join(".")} : ${i.message}`).join("\n");
function parse<T>(schema: z.ZodType<T>, value: unknown, reply: FastifyReply): T | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  reply.code(400).send({ error: "INVALID_INPUT", message: issueText(result.error) }); return null;
}
class SyncConflict extends Error {}

export function registerArenaStudio(app: FastifyInstance, auth: Auth) {
  async function authorize(req: FastifyRequest, reply: FastifyReply, write = false) {
    reply.header("Cache-Control", "no-store");
    const actor = await auth.session(req);
    if (!actor) { reply.code(401).send({ error: "AUTH_REQUIRED" }); return null; }
    if (!(write ? canWriteGame(actor) : canReadGame(actor))) { reply.code(403).send({ error: "GAME_ADMIN_REQUIRED" }); return null; }
    if (write && req.headers.origin !== new URL(config.SITE_ORIGIN).origin) { reply.code(403).send({ error: "INVALID_ORIGIN" }); return null; }
    return actor;
  }
  app.get("/api/admin/arenas", options, async (req, reply) => {
    const actor = await authorize(req, reply); if (!actor) return;
    const [servers] = await pool.query<RowDataPacket[]>("SELECT server_id AS serverId,published_revision AS publishedRevision,applied_revision AS appliedRevision,last_seen_at AS lastSeenAt,sync_error AS error FROM arena_studio ORDER BY server_id");
    return { servers, canWrite: canWriteGame(actor) };
  });
  app.get("/api/admin/arenas/:serverId", options, async (req, reply) => {
    const actor = await authorize(req, reply); if (!actor) return;
    const p = parse(params, req.params, reply); if (!p) return;
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT * FROM arena_studio WHERE server_id=?", [p.serverId]);
    const row = rows[0];
    if (!row) return reply.code(404).send({ error: "SERVER_NOT_OBSERVED" });
    const [history] = await pool.execute<RowDataPacket[]>("SELECT revision,actor_discord_id AS actor,reason,created_at AS createdAt FROM arena_publications WHERE server_id=? ORDER BY revision DESC LIMIT 20", [p.serverId]);
    const observed = decode(row.observed_json), content = decode(row.draft_json);
    // Draft edits and publications have independent counters; compare content, not revision numbers.
    const hasUnpublishedChanges = content != null && !isDeepStrictEqual(content, decode(row.published_json));
    return { content, hasUnpublishedChanges, observed: observed?.arenaConfig ?? null, catalog: observed?.catalog ?? null, runtime: observed?.runtime ?? null,
      draftRevision: Number(row.draft_revision), publishedRevision: Number(row.published_revision), appliedRevision: Number(row.applied_revision),
      lastSeenAt: row.last_seen_at, error: row.sync_error, history, canWrite: canWriteGame(actor) };
  });
  app.put("/api/admin/arenas/:serverId", options, async (req, reply) => {
    if (!await authorize(req, reply, true)) return;
    const p = parse(params, req.params, reply); if (!p) return;
    const input = parse(saveBody, req.body, reply); if (!input) return;
    if (input.baseRevision === MAX_REVISION) return reply.code(409).send({ error: "REVISION_LIMIT", message: "Limite de révisions atteinte." });
    const result = await transaction(async c => {
      const [rows] = await c.execute<RowDataPacket[]>("SELECT draft_revision FROM arena_studio WHERE server_id=? FOR UPDATE", [p.serverId]);
      if (!rows[0] || Number(rows[0].draft_revision) !== input.baseRevision) return null;
      await c.execute("UPDATE arena_studio SET draft_json=?,draft_revision=draft_revision+1 WHERE server_id=?", [JSON.stringify(input.content), p.serverId]);
      return input.baseRevision + 1;
    });
    if (result === null) return reply.code(409).send({ error: "DRAFT_CONFLICT", message: "Le brouillon a changé. Actualise avant de reprendre." });
    return { draftRevision: result };
  });
  app.post("/api/admin/arenas/:serverId/publish", options, async (req, reply) => {
    const actor = await authorize(req, reply, true); if (!actor) return;
    const p = parse(params, req.params, reply); if (!p) return;
    const input = parse(publishBody, req.body, reply); if (!input) return;
    const result = await transaction(async c => {
      const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM arena_studio WHERE server_id=? FOR UPDATE", [p.serverId]);
      const row = rows[0];
      if (!row || Number(row.draft_revision) !== input.baseRevision || !row.draft_json) return { error: "DRAFT_CONFLICT", status: 409, message: "Le brouillon a changé. Actualise avant de publier." };
      const observed = decode(row.observed_json), catalog = arenaCatalog.safeParse(observed?.catalog);
      if (!catalog.success) return { error: "ARENA_ENGINE_REQUIRED", status: 409, message: "Le mod serveur doit transmettre son catalogue d'arènes avant la publication. Le brouillon est conservé." };
      const parsed = arenaContent.safeParse(decode(row.draft_json));
      if (!parsed.success) return { error: "ARENA_INCOMPLETE", status: 400, message: issueText(parsed.error) };
      const preserved = [observed?.arenaConfig, decode(row.published_json)].flatMap(value => {
        const p = arenaContent.safeParse(value); return p.success ? [p.data] : [];
      });
      const issues = validateArenaCatalog(parsed.data, catalog.data, preserved);
      if (issues.length) return { error: "ARENA_INCOMPLETE", status: 400, message: issues.join("\n") };
      const content = JSON.stringify(parsed.data);
      // Safe retry/double click: identical publications reuse their revision and audit record.
      if (row.published_json && JSON.stringify(arenaContent.parse(decode(row.published_json))) === content) return { publishedRevision: Number(row.published_revision) };
      const next = Number(row.published_revision) + 1;
      if (next > MAX_REVISION) return { error: "REVISION_LIMIT", status: 409, message: "Limite de révisions atteinte." };
      await c.execute("INSERT INTO arena_publications(server_id,revision,content_json,actor_discord_id,reason) VALUES(?,?,?,?,?)", [p.serverId, next, content, actor.discord_id, input.reason]);
      await c.execute("UPDATE arena_studio SET published_json=?,published_revision=? WHERE server_id=?", [content, next, p.serverId]);
      return { publishedRevision: next };
    });
    if ("error" in result) return reply.code(result.status!).send({ error: result.error, message: result.message });
    return result;
  });
  app.get("/api/admin/arenas/:serverId/history/:revision", options, async (req, reply) => {
    if (!await authorize(req, reply)) return;
    const p = parse(params.extend({ revision: z.coerce.number().int().min(1).max(MAX_REVISION) }), req.params, reply); if (!p) return;
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT content_json FROM arena_publications WHERE server_id=? AND revision=?", [p.serverId, p.revision]);
    if (!rows[0]) return reply.code(404).send({ error: "REVISION_NOT_FOUND" });
    return { content: decode(rows[0].content_json) };
  });
  app.post("/api/internal/arenas/sync", options, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!auth.server(req)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const input = parse(arenaSync, req.body, reply); if (!input) return;
    try {
      return await transaction(async c => {
        await c.execute("INSERT INTO arena_studio(server_id) VALUES(?) ON DUPLICATE KEY UPDATE server_id=VALUES(server_id)", [input.serverId]);
        const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM arena_studio WHERE server_id=? FOR UPDATE", [input.serverId]);
        const row = rows[0]!;
        if (input.appliedRevision > Number(row.published_revision)) throw new SyncConflict("La révision annoncée n'a pas été publiée par cette API. Vérifie le serverId et la sauvegarde de l'API.");
        const previous = decode(row.observed_json);
        // Full arena configuration replaces only observed config. Optional large registries survive lightweight heartbeats.
        const observed = { ...previous, ...input.observed };
        let draft = row.draft_json, draftRevision = Number(row.draft_revision);
        if (!draft) {
          draft = row.published_json ?? JSON.stringify(input.observed.arenaConfig);
          draftRevision += 1;
        }
        await c.execute("UPDATE arena_studio SET observed_json=?,draft_json=?,draft_revision=?,applied_revision=?,sync_error=?,last_seen_at=UTC_TIMESTAMP(3) WHERE server_id=?", [JSON.stringify(observed), typeof draft === "string" ? draft : JSON.stringify(draft), draftRevision, input.appliedRevision, input.error, input.serverId]);
        return { revision: Number(row.published_revision), content: decode(row.published_json) };
      });
    } catch (error) {
      if (error instanceof SyncConflict) return reply.code(409).send({ error: "UNKNOWN_APPLIED_REVISION", message: error.message });
      throw error;
    }
  });
}
