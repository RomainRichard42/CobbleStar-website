import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool, transaction } from "./db.js";
import { config } from "./config.js";
import { actionInput, gameSnapshot, gameUuid, prepareAction } from "./game-admin-schema.js";

type Actor = { id: string; discord_id: string | null };
type Auth = { session: (request: FastifyRequest) => Promise<Actor | null>; server: (request: FastifyRequest) => boolean };
const ids = (value: string) => value.split(",").map((id) => id.trim()).filter(Boolean);
export const canWriteGame = (actor: Actor) => !!actor.discord_id && ids(config.GAME_ADMIN_DISCORD_IDS).includes(actor.discord_id);
export const canReadGame = (actor: Actor) => canWriteGame(actor) || (!!actor.discord_id && ids(config.GAME_ADMIN_READ_DISCORD_IDS).includes(actor.discord_id));
const playerParams = z.object({ uuid: gameUuid });
const serverId = z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/);
const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(100_000).default(1), q: z.string().trim().max(64).default("") });
const syncBody = z.object({
  uuid: gameUuid, username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/), serverId,
  snapshotId: z.string().uuid(), observedAt: z.number().int().positive(), online: z.boolean(), snapshot: gameSnapshot,
  events: z.array(z.object({ id: z.string().uuid(), kind: z.enum(["join", "disconnect", "death", "dimension", "inventory_change", "pokemon_change", "statistics_change"]), at: z.number().int().positive(), detail: z.record(z.string(), z.unknown()) })).max(100),
});
const enqueueBody = z.object({ requestId: z.string().uuid(), snapshotId: z.string().uuid(), expected: z.union([z.number().finite(), z.string().length(64)]).optional(), reason: z.string().trim().min(5).max(300), action: actionInput }).strict();
const decode = (value: unknown) => typeof value === "string" ? JSON.parse(value) : value;
const adminOptions = { config: { rateLimit: { max: 90, timeWindow: "1 minute" } } };
const internalOptions = { bodyLimit: 8 * 1024 * 1024, config: { rateLimit: { max: 6000, timeWindow: "1 minute" } } };

export function registerGameAdmin(app: FastifyInstance, auth: Auth) {
  app.get("/api/internal/admin/status", internalOptions, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!auth.server(request)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS players,MAX(received_at) AS lastReceivedAt,
      COALESCE(SUM(online AND received_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 45 SECOND)
      AND observed_at>UNIX_TIMESTAMP(UTC_TIMESTAMP(3))*1000-45000),0) AS recentlyOnline FROM game_players`);
    return { version: "player-admin-v1", database: "ok", sync: rows[0],
      accessConfigured: ids(config.GAME_ADMIN_DISCORD_IDS).length > 0,
      discordConfigured: !!(config.DISCORD_CLIENT_ID && config.DISCORD_CLIENT_SECRET && config.DISCORD_BOT_TOKEN && config.DISCORD_GUILD_ID) };
  });
  async function authorize(request: FastifyRequest, reply: FastifyReply, write = false) {
    reply.header("Cache-Control", "no-store");
    const actor = await auth.session(request);
    if (!actor) { reply.code(401).send({ error: "AUTH_REQUIRED" }); return null; }
    if (!(write ? canWriteGame(actor) : canReadGame(actor))) { reply.code(403).send({ error: "GAME_ADMIN_REQUIRED" }); return null; }
    if (write && request.headers.origin !== new URL(config.SITE_ORIGIN).origin) { reply.code(403).send({ error: "INVALID_ORIGIN" }); return null; }
    return actor;
  }
  async function expireActions() {
    await pool.execute("UPDATE game_admin_actions SET status=IF(status='queued','expired','unknown') WHERE status IN ('queued','dispatched') AND expires_at<UTC_TIMESTAMP()");
  }

  app.get("/api/admin/game/players", adminOptions, async (request, reply) => {
    const actor = await authorize(request, reply); if (!actor) return;
    const { page, q } = pageQuery.parse(request.query);
    const pattern = `%${q.replace(/[!%_]/g, "!$&")}%`;
    const args = [pattern, pattern, pattern];
    const where = "WHERE p.username LIKE ? ESCAPE '!' OR p.uuid LIKE ? ESCAPE '!' OR u.discord_username LIKE ? ESCAPE '!'";
    // users uses utf8mb4_unicode_ci, while game_players may inherit MySQL 8's
    // utf8mb4_0900_ai_ci. Compare canonical UUIDs explicitly without rewriting
    // existing tables; keep users.minecraft_uuid unwrapped for its unique index.
    const accountJoin = "LEFT JOIN users u ON u.minecraft_uuid=CONVERT(p.uuid USING utf8mb4) COLLATE utf8mb4_unicode_ci";
    const [[total], [players]] = await Promise.all([
      pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM game_players p ${accountJoin} ${where}`, args),
      pool.execute<RowDataPacket[]>(`SELECT p.uuid,p.username,p.server_id AS serverId,p.first_seen_at AS firstSeenAt,p.received_at AS receivedAt,p.observed_at AS observedAt,(p.online AND TIMESTAMPDIFF(SECOND,p.received_at,UTC_TIMESTAMP())<45 AND p.observed_at>UNIX_TIMESTAMP(UTC_TIMESTAMP(3))*1000-45000) AS online,u.discord_username AS discordUsername FROM game_players p ${accountJoin} ${where} ORDER BY online DESC,p.received_at DESC,p.uuid LIMIT 24 OFFSET ${(page - 1) * 24}`, args),
    ]);
    return { players, total: Number(total[0]?.total ?? 0), page, canWrite: canWriteGame(actor) };
  });

  app.get("/api/admin/game/players/:uuid", adminOptions, async (request, reply) => {
    const actor = await authorize(request, reply); if (!actor) return;
    const { uuid } = playerParams.parse(request.params);
    const { page } = pageQuery.parse(request.query);
    await expireActions();
    const [[players], [events], [actions], [accounts], [eventCount]] = await Promise.all([
      pool.execute<RowDataPacket[]>("SELECT *,TIMESTAMPDIFF(SECOND,received_at,UTC_TIMESTAMP()) AS age_seconds FROM game_players WHERE uuid=?", [uuid]),
      pool.execute<RowDataPacket[]>(`SELECT id,kind,detail_json,occurred_at FROM game_events WHERE uuid=? ORDER BY occurred_at DESC,id LIMIT 40 OFFSET ${(page - 1) * 40}`, [uuid]),
      pool.execute<RowDataPacket[]>("SELECT id,actor_discord_id,reason,payload_json,status,result_json,created_at,completed_at FROM game_admin_actions WHERE uuid=? ORDER BY created_at DESC LIMIT 100", [uuid]),
      pool.execute<RowDataPacket[]>("SELECT u.discord_username,u.discord_global_name,u.discord_id,u.created_at,u.minecraft_linked_at,COALESCE(w.balance,0) AS stars,(SELECT COUNT(*) FROM vote_claims v WHERE v.user_id=u.id) AS votes,(SELECT COUNT(*) FROM shop_purchases s WHERE s.user_id=u.id) AS purchases FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE u.minecraft_uuid=?", [uuid]),
      pool.execute<RowDataPacket[]>("SELECT COUNT(*) AS total FROM game_events WHERE uuid=?", [uuid]),
    ]);
    const player = players[0]; if (!player) return reply.code(404).send({ error: "PLAYER_NOT_OBSERVED" });
    return {
      uuid, username: player.username, serverId: player.server_id, snapshotId: player.snapshot_id,
      observedAt: Number(player.observed_at), receivedAt: player.received_at, firstSeenAt: player.first_seen_at,
      online: Boolean(player.online && player.age_seconds < 45 && Number(player.observed_at) > Date.now() - 45000),
      snapshot: decode(player.snapshot_json), account: accounts[0] ?? null, canWrite: canWriteGame(actor),
      events: events.map((event) => ({ id: event.id, kind: event.kind, at: Number(event.occurred_at), detail: decode(event.detail_json) })),
      eventsTotal: Number(eventCount[0]?.total ?? 0), eventsPage: page,
      actions: actions.map((action) => ({ id: action.id, actor: action.actor_discord_id, reason: action.reason, payload: decode(action.payload_json), status: action.status, result: decode(action.result_json), createdAt: action.created_at, completedAt: action.completed_at })),
    };
  });

  app.post("/api/admin/game/players/:uuid/actions", adminOptions, async (request, reply) => {
    const actor = await authorize(request, reply, true); if (!actor) return;
    const { uuid } = playerParams.parse(request.params);
    const input = enqueueBody.parse(request.body);
    await expireActions();
    const outcome = await transaction(async (connection) => {
      const [players] = await connection.execute<RowDataPacket[]>("SELECT *,TIMESTAMPDIFF(SECOND,received_at,UTC_TIMESTAMP()) AS age_seconds FROM game_players WHERE uuid=? FOR UPDATE", [uuid]);
      const player = players[0];
      const [duplicates] = await connection.execute<RowDataPacket[]>("SELECT id,uuid,actor_id,status FROM game_admin_actions WHERE id=?", [input.requestId]);
      if (duplicates[0]) return duplicates[0].uuid === uuid && duplicates[0].actor_id === actor.id ? { id: input.requestId, status: duplicates[0].status } : { error: "REQUEST_ID_CONFLICT" };
      if (!player || !player.online || player.age_seconds >= 45 || Number(player.observed_at) < Date.now() - 45000) return { error: "PLAYER_OFFLINE_OR_STALE" };
      const [pending] = await connection.execute<RowDataPacket[]>("SELECT id FROM game_admin_actions WHERE uuid=? AND status IN ('queued','dispatched') LIMIT 1", [uuid]);
      if (pending.length) return { error: "ACTION_ALREADY_PENDING" };
      let payload;
      try { payload = prepareAction(gameSnapshot.parse(decode(player.snapshot_json)), input.action); }
      catch (error) { return { error: error instanceof Error ? error.message : "INVALID_ACTION" }; }
      // Compare only the selected field/item, not an unrelated movement or heartbeat.
      if ("expected" in payload && payload.expected !== input.expected) return { error: "SNAPSHOT_CHANGED" };
      await connection.execute("INSERT INTO game_admin_actions(id,uuid,server_id,actor_id,actor_discord_id,reason,payload_json,expires_at) VALUES(?,?,?,?,?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 2 MINUTE))", [input.requestId, uuid, player.server_id, actor.id, actor.discord_id, input.reason, JSON.stringify({ ...payload, sourceSnapshotId: input.snapshotId })]);
      return { id: input.requestId, status: "queued" };
    });
    return reply.code("error" in outcome ? 409 : 202).send(outcome);
  });

  app.post("/api/internal/admin/sync", internalOptions, async (request, reply) => {
    if (!auth.server(request)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const body = syncBody.parse(request.body);
    if (Math.abs(Date.now() - body.observedAt) > 300_000) return reply.code(409).send({ error: "CLOCK_SKEW_OR_STALE" });
    await transaction(async (connection) => {
      // Serialize one player's updates. A delayed snapshot must not overwrite a newer one.
      await connection.execute("INSERT IGNORE INTO game_players(uuid,username,server_id,snapshot_id,snapshot_json,online,observed_at) VALUES(?,?,?,?,?,?,?)", [body.uuid, body.username, body.serverId, body.snapshotId, JSON.stringify(body.snapshot), body.online, body.observedAt]);
      const [rows] = await connection.execute<RowDataPacket[]>("SELECT observed_at,server_id,online,TIMESTAMPDIFF(SECOND,received_at,UTC_TIMESTAMP()) AS age_seconds FROM game_players WHERE uuid=? FOR UPDATE", [body.uuid]);
      if (rows[0]?.server_id !== body.serverId && rows[0]?.online && rows[0]?.age_seconds < 45) throw Object.assign(new Error("PLAYER_ON_ANOTHER_SERVER"), { statusCode: 409 });
      if (Number(rows[0]?.observed_at) < body.observedAt) await connection.execute("UPDATE game_players SET username=?,server_id=?,snapshot_id=?,snapshot_json=?,online=?,observed_at=?,received_at=UTC_TIMESTAMP() WHERE uuid=?", [body.username, body.serverId, body.snapshotId, JSON.stringify(body.snapshot), body.online, body.observedAt, body.uuid]);
      for (const event of body.events) {
        if (event.at > Date.now() + 300_000 || event.at < Date.now() - 90 * 86400_000) continue;
        await connection.execute("INSERT IGNORE INTO game_events(id,uuid,kind,detail_json,occurred_at) VALUES(?,?,?,?,?)", [event.id, body.uuid, event.kind, JSON.stringify(event.detail), event.at]);
      }
    });
    return { ok: true };
  });

  app.post("/api/internal/admin/claim", internalOptions, async (request, reply) => {
    if (!auth.server(request)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const body = z.object({ uuid: gameUuid, serverId }).parse(request.body);
    // No redelivery: if acknowledgement is lost, show UNKNOWN rather than replay a mutation.
    return transaction(async (connection) => {
      const [rows] = await connection.execute<RowDataPacket[]>("SELECT id,payload_json,UNIX_TIMESTAMP(expires_at)*1000 AS expires FROM game_admin_actions WHERE uuid=? AND server_id=? AND status='queued' AND expires_at>UTC_TIMESTAMP() ORDER BY created_at LIMIT 1 FOR UPDATE", [body.uuid, body.serverId]);
      const action = rows[0]; if (!action) return { action: null };
      await connection.execute("UPDATE game_admin_actions SET status='dispatched',dispatched_at=UTC_TIMESTAMP() WHERE id=?", [action.id]);
      return { action: { id: action.id, expiresAt: Number(action.expires), payload: decode(action.payload_json) } };
    });
  });

  app.post("/api/internal/admin/result", internalOptions, async (request, reply) => {
    if (!auth.server(request)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const body = z.object({ id: z.string().uuid(), uuid: gameUuid, serverId, status: z.enum(["applied", "rejected", "unknown"]), result: z.object({ message: z.string().max(500), before: z.unknown().optional(), after: z.unknown().optional() }) }).parse(request.body);
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT status FROM game_admin_actions WHERE id=? AND uuid=? AND server_id=?", [body.id, body.uuid, body.serverId]);
    if (!rows.length) return reply.code(404).send({ error: "ACTION_NOT_FOUND" });
    if (!["dispatched", "unknown", body.status].includes(rows[0]?.status)) return reply.code(409).send({ error: "ACTION_STATE_CONFLICT" });
    await pool.execute("UPDATE game_admin_actions SET status=?,result_json=?,completed_at=UTC_TIMESTAMP() WHERE id=? AND status IN ('dispatched','unknown')", [body.status, JSON.stringify(body.result), body.id]);
    return { ok: true };
  });

  // Bounded retention, maintenance errors are visible in the API logs.
  const maintenance = setInterval(() => {
    void (async () => {
      await expireActions();
      await pool.execute("DELETE FROM game_events WHERE received_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 90 DAY) LIMIT 10000");
      await pool.execute("DELETE FROM game_admin_actions WHERE created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 365 DAY) LIMIT 10000");
    })().catch((error) => app.log.error(error, "Game admin maintenance failed"));
  }, 3600_000);
  maintenance.unref();
  app.addHook("onClose", async () => { clearInterval(maintenance); });
}
