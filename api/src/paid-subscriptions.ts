import type { PoolConnection, RowDataPacket } from "mysql2/promise";

export const paidTiers = ["etoile", "cosmique", "galactique"] as const;
export type PaidTier = typeof paidTiers[number];
export function nextSubscriptionMonth(now: number, previousExpiry: number): number {
  const date = new Date(Math.max(now, previousExpiry));
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

type SubscriptionRow = RowDataPacket & { tier: PaidTier; expires_ms: number };
export async function lockedSubscription(connection: PoolConnection, userId: string) {
  const [rows] = await connection.execute<SubscriptionRow[]>(
    `SELECT tier,TIMESTAMPDIFF(MICROSECOND,'1970-01-01 00:00:00',expires_at)/1000 AS expires_ms FROM paid_subscriptions WHERE user_id=? FOR UPDATE`, [userId]);
  return rows[0] ?? null;
}
export function canPurchaseTier(current: { tier: PaidTier; expires_ms: number } | null, tier: PaidTier, now: number) {
  return !current || current.expires_ms <= now || paidTiers.indexOf(tier) >= paidTiers.indexOf(current.tier);
}
/** Called inside the SAME transaction as the wallet debit and purchase history. */
export async function activateSubscription(connection: PoolConnection, userId: string, purchaseId: string,
  tier: PaidTier, previous: SubscriptionRow | null, now: number) {
  const expiresAt = nextSubscriptionMonth(now, Number(previous?.expires_ms ?? 0));
  // SQL receives an explicit UTC DATETIME, independent of the SQL session's timezone.
  const sqlDate = new Date(expiresAt).toISOString().slice(0, 23).replace("T", " ");
  await connection.execute(`INSERT INTO paid_subscriptions(user_id,tier,expires_at) VALUES(?,?,?)
    ON DUPLICATE KEY UPDATE tier=VALUES(tier),expires_at=VALUES(expires_at),updated_at=UTC_TIMESTAMP()`, [userId, tier, sqlDate]);
  if (tier !== "etoile") await connection.execute(
    `INSERT IGNORE INTO paid_subscription_gifts(user_id,tier,purchase_id) VALUES(?,?,?)`, [userId, tier, purchaseId]);
  return { tier, expiresAt };
}
