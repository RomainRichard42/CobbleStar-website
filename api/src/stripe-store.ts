import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { pool, transaction } from "./db.js";
import type { StarPack } from "./star-packs.js";

export type PaymentMode = "test" | "live";
export type CheckoutOrder = {
  id: string; userId: string; packId: string; minecraftUuid: string;
  reference: string; amountCents: number; stars: number; currency: string;
  mode: PaymentMode; status: string; url: string | null; expiresAt: number;
};
export type PaymentSnapshot = {
  id: string; orderId: string; packId: string; mode: PaymentMode;
  currency: string | null; total: number | null; subtotal: number | null;
  paymentIntent: string | null; paid: boolean; complete: boolean; expired: boolean;
  lineCount: number; lineQuantity: number | null; lineTotal: number | null;
  lineCurrency: string | null; clientReference: string | null;
};
export class PaymentError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); }
}
export interface PaymentStore {
  reserve(userId: string, sessionHash: string, requestId: string, pack: StarPack, mode: PaymentMode): Promise<CheckoutOrder>;
  attach(order: CheckoutOrder, session: { id: string; url: string }): Promise<void>;
  read(orderId: string, userId: string): Promise<CheckoutOrder | null>;
  settle(session: PaymentSnapshot, eventId: string, eventType: string): Promise<{ status: string; duplicate: boolean }>;
}

const columns = `o.id,o.user_id AS userId,o.provider_reference AS reference,o.amount_cents AS amountCents,
  o.stars_amount AS stars,o.status,c.pack_id AS packId,c.minecraft_uuid AS minecraftUuid,
  c.currency,c.payment_mode AS mode,c.checkout_url AS url,
  TIMESTAMPDIFF(MICROSECOND,'1970-01-01 00:00:00',c.expires_at)/1000 AS expiresAt`;
type OrderRow = CheckoutOrder & RowDataPacket;
const normalize = (order: OrderRow): CheckoutOrder => ({ ...order,
  amountCents: Number(order.amountCents), stars: Number(order.stars), expiresAt: Number(order.expiresAt) });

export const stripeStore: PaymentStore = {
  async reserve(userId, sessionHash, requestId, pack, mode) {
    return transaction(async connection => {
      // Same ownership lock as account relinking: an obsolete Discord session cannot buy for another player.
      const [owners] = await connection.execute<(RowDataPacket & { minecraft_uuid: string; minecraft_linked_at: Date })[]>(
        `SELECT u.id,u.minecraft_uuid,u.minecraft_linked_at FROM users u JOIN sessions s ON s.user_id=u.id
         WHERE u.id=? AND s.token_hash=? AND s.discord_id=u.discord_id AND s.expires_at>UTC_TIMESTAMP()
         AND u.merged_into IS NULL FOR UPDATE`, [userId, sessionHash]);
      const owner = owners[0];
      if (!owner) throw new PaymentError("AUTH_REQUIRED", 401);
      if (!owner.minecraft_uuid || !owner.minecraft_linked_at) throw new PaymentError("MINECRAFT_LINK_REQUIRED");
      const [previous] = await connection.execute<OrderRow[]>(
        `SELECT ${columns} FROM stripe_checkouts c JOIN orders o ON o.id=c.order_id
         WHERE c.request_id=? FOR UPDATE`, [requestId]);
      if (previous[0]) {
        const order = normalize(previous[0]);
        if (order.userId !== userId || order.packId !== pack.id || order.mode !== mode || order.minecraftUuid !== owner.minecraft_uuid)
          throw new PaymentError("CHECKOUT_REQUEST_CONFLICT");
        return order;
      }
      const id = randomUUID();
      const expiresAt = Math.floor(Date.now() / 1000) * 1000 + 60 * 60_000;
      const reference = `pending:${id}`;
      await connection.execute(
        `INSERT INTO orders(id,user_id,provider,provider_reference,amount_cents,stars_amount,status)
         VALUES(?,?,'stripe',?,?,?,'pending')`, [id, userId, reference, pack.amountCents, pack.stars]);
      await connection.execute(
        `INSERT INTO stripe_checkouts(order_id,request_id,pack_id,minecraft_uuid,currency,payment_mode,expires_at)
         VALUES(?,?,?,?,'eur',?,?)`, [id, requestId, pack.id, owner.minecraft_uuid, mode,
          new Date(expiresAt).toISOString().slice(0, 19).replace("T", " ")]);
      return { id, userId, reference, packId: pack.id, minecraftUuid: owner.minecraft_uuid,
        amountCents: pack.amountCents, stars: pack.stars, currency: "eur", mode, status: "pending", url: null, expiresAt };
    });
  },
  async attach(order, session) {
    await transaction(async connection => {
      const [rows] = await connection.execute<(RowDataPacket & { provider_reference: string })[]>(
        `SELECT provider_reference FROM orders WHERE id=? AND provider='stripe' FOR UPDATE`, [order.id]);
      const reference = rows[0]?.provider_reference;
      if (reference !== `pending:${order.id}` && reference !== session.id) throw new PaymentError("CHECKOUT_SESSION_CONFLICT");
      await connection.execute(`UPDATE orders SET provider_reference=? WHERE id=?`, [session.id, order.id]);
      await connection.execute(`UPDATE stripe_checkouts SET checkout_url=? WHERE order_id=?`, [session.url, order.id]);
    });
  },
  async read(orderId, userId) {
    const [rows] = await pool.execute<OrderRow[]>(
      `SELECT ${columns} FROM stripe_checkouts c JOIN orders o ON o.id=c.order_id
       WHERE o.id=? AND o.user_id=? AND o.provider='stripe' LIMIT 1`, [orderId, userId]);
    return rows[0] ? normalize(rows[0]) : null;
  },
  async settle(session, eventId, eventType) {
    const [candidates] = await pool.execute<(RowDataPacket & { user_id: string })[]>(
      `SELECT user_id FROM orders WHERE id=? AND provider='stripe' LIMIT 1`, [session.orderId]);
    const userId = candidates[0]?.user_id;
    if (!userId) throw new PaymentError("PAYMENT_ORDER_UNKNOWN", 404);
    return transaction(async connection => {
      // Lock user before order/wallet, consistently with account relinking and shop purchases.
      const [owners] = await connection.execute<(RowDataPacket & { minecraft_uuid: string; merged_into: string | null; minecraft_username: string | null })[]>(
        `SELECT id,minecraft_uuid,merged_into,minecraft_username FROM users WHERE id=? FOR UPDATE`, [userId]);
      const [rows] = await connection.execute<OrderRow[]>(
        `SELECT ${columns} FROM stripe_checkouts c JOIN orders o ON o.id=c.order_id
         WHERE o.id=? AND o.provider='stripe' FOR UPDATE`, [session.orderId]);
      const order = rows[0] ? normalize(rows[0]) : null;
      if (!order || order.userId !== userId) throw new PaymentError("PAYMENT_OWNER_CHANGED", 503);
      if (!owners[0] || owners[0].merged_into || owners[0].minecraft_uuid !== order.minecraftUuid)
        throw new PaymentError("PAYMENT_OWNER_REVIEW_REQUIRED");
      if ((order.reference !== session.id && order.reference !== `pending:${order.id}`)
        || session.clientReference !== order.id || session.packId !== order.packId || session.mode !== order.mode
        || session.currency !== order.currency || session.total !== order.amountCents || session.subtotal !== order.amountCents
        || session.lineCount !== 1 || session.lineQuantity !== 1 || session.lineTotal !== order.amountCents
        || session.lineCurrency !== order.currency)
        throw new PaymentError("PAYMENT_REVIEW_REQUIRED");

      const [processed] = await connection.execute<RowDataPacket[]>(
        `SELECT event_id FROM stripe_webhook_events WHERE event_id=? LIMIT 1`, [eventId]);
      if (processed[0]) return { status: order.status, duplicate: true };
      const fulfilled = order.status === "paid" || order.status === "test_paid";
      let status = order.status;
      if (!fulfilled && session.paid && session.complete) {
        if (!session.paymentIntent) throw new PaymentError("PAYMENT_INTENT_REQUIRED");
        status = order.mode === "live" ? "paid" : "test_paid";
        if (order.mode === "live") {
          await connection.execute(`INSERT IGNORE INTO wallets(user_id,balance) VALUES(?,0)`, [userId]);
          const [wallets] = await connection.execute<(RowDataPacket & { balance: string })[]>(
            `SELECT CAST(balance AS CHAR) AS balance FROM wallets WHERE user_id=? FOR UPDATE`, [userId]);
          if (BigInt(wallets[0]?.balance ?? "0") + BigInt(order.stars) > BigInt(Number.MAX_SAFE_INTEGER))
            throw new PaymentError("WALLET_LIMIT_REACHED");
          await connection.execute(
            `INSERT INTO star_transactions(id,user_id,delta,kind,reference_id,metadata_json) VALUES(?,?,?,'stripe_purchase',?,?)`,
            [randomUUID(), userId, order.stars, `stripe:${session.id}`,
              JSON.stringify({ orderId: order.id, packId: order.packId, amountCents: order.amountCents, currency: order.currency })]);
          await connection.execute(`UPDATE wallets SET balance=balance+? WHERE user_id=?`, [order.stars, userId]);
          const username = owners[0].minecraft_username;
          await connection.execute(`INSERT INTO purchase_announcements(order_id,minecraft_uuid,minecraft_username,stars_amount)
            VALUES(?,?,?,?)`, [order.id, order.minecraftUuid, username && /^[A-Za-z0-9_]{1,16}$/.test(username) ? username : null, order.stars]);
        }
        await connection.execute(`UPDATE orders SET status=?,provider_reference=?,paid_at=UTC_TIMESTAMP() WHERE id=?`, [status, session.id, order.id]);
        await connection.execute(`UPDATE stripe_checkouts SET payment_intent_id=? WHERE order_id=?`, [session.paymentIntent, order.id]);
      } else if (!fulfilled && !session.paid) {
        if (session.expired) status = "expired";
        else if (eventType === "checkout.session.async_payment_failed") status = "failed";
        await connection.execute(`UPDATE orders SET status=?,provider_reference=? WHERE id=?`, [status, session.id, order.id]);
      }
      await connection.execute(`INSERT INTO stripe_webhook_events(event_id,order_id,event_type) VALUES(?,?,?)`, [eventId, order.id, eventType]);
      return { status, duplicate: fulfilled };
    });
  },
};
