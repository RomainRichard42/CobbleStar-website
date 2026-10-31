import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { pool, transaction } from "./db.js";

type Announcement = { id: string; minecraftUuid: string; minecraftUsername: string | null; stars: number; leaseToken: string };
export type AnnouncementStore = {
  claim(serverId: string): Promise<Announcement | null>;
  complete(serverId: string, id: string, token: string): Promise<boolean>;
};
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const serverId = z.string().regex(/^[A-Za-z0-9_-]{1,48}$/);
const claimBody = z.object({ serverId }).strict();
const completeBody = z.object({ serverId, leaseToken: z.string().regex(/^[A-Za-z0-9_-]{32}$/) }).strict();
const params = z.object({ id: z.string().uuid() }).strict();

export const announcementStore: AnnouncementStore = {
  async claim(serverId) {
    return transaction(async connection => {
      // The queue is written with the credit, never backfilled from old orders.
      // Paid/live guards prevent a test or incomplete order from being publicized.
      const [rows] = await connection.execute<(RowDataPacket & {
        id: string; minecraftUuid: string; minecraftUsername: string | null; stars: number;
      })[]>(`SELECT a.order_id AS id,a.minecraft_uuid AS minecraftUuid,a.minecraft_username AS minecraftUsername,a.stars_amount AS stars
        FROM purchase_announcements a JOIN orders o ON o.id=a.order_id JOIN stripe_checkouts c ON c.order_id=o.id
        WHERE a.server_id=? AND o.status='paid' AND c.payment_mode='live'
          AND a.created_at>=UTC_TIMESTAMP()-INTERVAL 7 DAY
          AND (a.status='pending' OR (a.status='leased' AND a.lease_expires_at<UTC_TIMESTAMP()))
        ORDER BY a.created_at,a.order_id LIMIT 1 FOR UPDATE SKIP LOCKED`, [serverId]);
      if (!rows[0]) return null;
      const leaseToken = randomBytes(24).toString("base64url");
      await connection.execute(`UPDATE purchase_announcements SET status='leased',lease_token_hash=?,
        lease_expires_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 2 MINUTE) WHERE order_id=?`, [hash(leaseToken), rows[0].id]);
      return { ...rows[0], stars: Number(rows[0].stars), leaseToken };
    });
  },
  async complete(serverId, id, token) {
    const tokenHash = hash(token);
    const [result] = await pool.execute<ResultSetHeader>(`UPDATE purchase_announcements SET status='delivered',delivered_at=UTC_TIMESTAMP(),
      lease_expires_at=NULL WHERE order_id=? AND server_id=? AND status='leased' AND lease_token_hash=?`, [id, serverId, tokenHash]);
    if (result.affectedRows === 1) return true;
    // A lost acknowledgement is retried without redisplaying the message.
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT order_id FROM purchase_announcements
      WHERE order_id=? AND server_id=? AND status='delivered' AND lease_token_hash=?`, [id, serverId, tokenHash]);
    return rows.length === 1;
  },
};

export function registerPurchaseAnnouncements(app: FastifyInstance, dependencies: {
  server(request: FastifyRequest): boolean; store?: AnnouncementStore;
}) {
  const store = dependencies.store ?? announcementStore;
  const limits = { config: { rateLimit: { max: 40, timeWindow: "1 minute" } } };
  app.post("/api/internal/stars/announcements/claim", limits, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!dependencies.server(request)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const parsed = claimBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const announcement = await store.claim(parsed.data.serverId);
    return announcement ? { announcement } : reply.code(204).send();
  });
  app.post("/api/internal/stars/announcements/:id/complete", limits, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!dependencies.server(request)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    const input = completeBody.safeParse(request.body), path = params.safeParse(request.params);
    if (!input.success || !path.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    return await store.complete(input.data.serverId, path.data.id, input.data.leaseToken)
      ? { delivered: true } : reply.code(409).send({ error: "LEASE_INVALID" });
  });
}
