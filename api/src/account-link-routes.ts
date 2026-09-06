import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { config } from "./config.js";
import { pool, transaction } from "./db.js";
import { digest, linkCode, normalizeLinkCode } from "./security.js";
import { confirmPlayerLink, LinkError } from "./account-link.js";

const confirmBody = z.object({
  code: z.string().transform(normalizeLinkCode).pipe(z.string().regex(/^CS-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/)),
  uuid: z.string().regex(/^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{8}-(?:[a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12})$/).transform(value => value.replaceAll("-", "").toLowerCase()),
  username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/),
});
type Actor = { id: string; discord_id: string | null; minecraft_uuid: string | null; minecraft_username: string | null; minecraft_linked_at: Date | null };

export function registerAccountLink(app: FastifyInstance, auth: {
  session: (request: FastifyRequest) => Promise<Actor | null>;
  sessionHash: (request: FastifyRequest) => string | null;
  server: (request: FastifyRequest) => boolean;
}) {
  app.post("/api/link/code", { config: { rateLimit: { max: 6, timeWindow: "10 minutes" } } }, async (request, reply) => {
    const actor = await auth.session(request);
    const sessionHash = auth.sessionHash(request);
    if (!actor?.discord_id || !sessionHash) return reply.code(401).send({ error: "AUTH_REQUIRED" });
    if (request.headers.origin !== new URL(config.SITE_ORIGIN).origin) return reply.code(403).send({ error: "INVALID_ORIGIN" });
    const parsed = z.object({ allowRelink: z.boolean().default(false) }).strict().safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    if (parsed.data.allowRelink && !config.MINECRAFT_RELINK_ENABLED) return reply.code(409).send({ error: "RELINK_DISABLED" });
    const code = linkCode();
    const requestId = randomUUID();
    try {
      await transaction(async connection => {
        const [valid] = await connection.execute<RowDataPacket[]>(
          `SELECT u.id FROM users u JOIN sessions s ON s.user_id=u.id WHERE u.id=? AND u.discord_id=? AND s.token_hash=? AND s.discord_id=u.discord_id AND s.expires_at>UTC_TIMESTAMP() AND u.merged_into IS NULL FOR UPDATE`,
          [actor.id, actor.discord_id, sessionHash]);
        if (!valid[0]) throw new LinkError("AUTH_REQUIRED", 401);
        await connection.execute(`UPDATE link_codes SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL`, [actor.id]);
        await connection.execute(`INSERT INTO link_codes(id,user_id,code_hash,expires_at,issuer_discord_id,session_token_hash,allow_relink) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE),?,?,?)`,
          [requestId, actor.id, digest(code), actor.discord_id, sessionHash, parsed.data.allowRelink]);
      });
      return { requestId, code, command: `/link ${code}`, expiresInSeconds: 600 };
    } catch (error) {
      if (error instanceof LinkError) return reply.code(error.status).send({ error: error.code });
      if (["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes((error as { code?: string }).code ?? "")) return reply.code(503).send({ error: "LINK_BUSY_RETRY" });
      throw error;
    }
  });

  app.get("/api/link/status", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const actor = await auth.session(request);
    if (!actor?.discord_id) return reply.code(401).send({ error: "AUTH_REQUIRED" });
    const parsed = z.object({ requestId: z.string().uuid().optional() }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    let pending = null;
    if (parsed.data.requestId) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT completed_at,result_uuid,used_at,(expires_at<=UTC_TIMESTAMP()) AS expired FROM link_codes WHERE id=? AND session_token_hash=? AND issuer_discord_id=?`,
        [parsed.data.requestId, auth.sessionHash(request), actor.discord_id]);
      if (!rows[0]) return reply.code(404).send({ error: "LINK_REQUEST_NOT_FOUND" });
      const row = rows[0];
      pending = { state: row.completed_at ? "completed" : row.used_at ? "cancelled" : row.expired ? "expired" : "pending", uuid: row.result_uuid };
    }
    return { linked: Boolean(actor.minecraft_linked_at), relinkEnabled: config.MINECRAFT_RELINK_ENABLED,
      minecraft: actor.minecraft_uuid ? { uuid: actor.minecraft_uuid, username: actor.minecraft_username } : null, request: pending };
  });

  app.post("/api/internal/link/confirm", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request, reply) => {
    if (!auth.server(request)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const parsed = confirmBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    try {
      return await transaction(connection => confirmPlayerLink(connection, {
        codeHash: digest(parsed.data.code), uuid: parsed.data.uuid, username: parsed.data.username, relinkEnabled: config.MINECRAFT_RELINK_ENABLED,
      }));
    } catch (error) {
      if (error instanceof LinkError) return reply.code(error.status).send({ error: error.code });
      if (["ER_DUP_ENTRY", "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes((error as { code?: string }).code ?? "")) return reply.code(503).send({ error: "LINK_BUSY_RETRY" });
      throw error;
    }
  });
}
