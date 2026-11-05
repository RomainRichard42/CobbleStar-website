import { randomUUID } from "node:crypto";
import type { RowDataPacket, PoolConnection } from "mysql2/promise";
import { pool, transaction } from "./db.js";
import { DailyError, type DailyCalendar, type DailyReward, emptyCalendar, parisDate, validateCalendar, daysInMonth } from "./daily-schema.js";
const decode = <T>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;
const normalize = (r: RowDataPacket) => ({ id: r.id as string, uuid: r.uuid as string, month: r.month as string, day: Number(r.day), date: r.claim_date as string, serverId: r.server_id as string, reward: decode<DailyReward>(r.reward_json), status: r.status as string, message: r.message as string | null });
async function lockPlayer(c: PoolConnection, uuid: string) {
  await c.execute("INSERT INTO daily_players(uuid) VALUES(?) ON DUPLICATE KEY UPDATE uuid=VALUES(uuid)", [uuid]);
  await c.execute("SELECT uuid FROM daily_players WHERE uuid=? FOR UPDATE", [uuid]);
}
async function owner(c: PoolConnection, uuid: string) {
  const [rows] = await c.execute<RowDataPacket[]>("SELECT id FROM users WHERE minecraft_uuid=? AND merged_into IS NULL FOR UPDATE", [uuid]);
  if (!rows[0]) throw new DailyError("LINK_REQUIRED", "Lie ton compte Minecraft au site avec /link pour recevoir des Stars.");
  return rows[0].id as string;
}
export const dailyStore = {
  async catalogs() {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT server_id,items_json FROM daily_catalogs ORDER BY server_id");
    const items = new Map<string, { id: string; label: string }>();
    for (const r of rows) for (const item of decode<Array<{ id: string; label: string }>>(r.items_json)) items.set(item.id, item);
    return [...items.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
  },
  async syncCatalog(serverId: string, items: Array<{ id: string; label: string }>) {
    await pool.execute("INSERT INTO daily_catalogs(server_id,items_json) VALUES(?,?) ON DUPLICATE KEY UPDATE items_json=VALUES(items_json),updated_at=UTC_TIMESTAMP()", [serverId, JSON.stringify(items)]);
  },
  async admin(month: string) {
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT * FROM daily_calendars WHERE month=?", [month]); const row = rows[0];
    const [claims] = await pool.execute<RowDataPacket[]>("SELECT id,uuid,day,claim_date,status,message,server_id FROM daily_claims WHERE month=? ORDER BY created_at DESC LIMIT 100", [month]);
    const [stats] = await pool.execute<RowDataPacket[]>("SELECT status,COUNT(*) AS total FROM daily_claims WHERE month=? GROUP BY status", [month]);
    return { month, revision: Number(row?.revision ?? 0), publishedRevision: row?.published_revision ?? null,
      content: row ? decode<DailyCalendar>(row.draft_json) : emptyCalendar(month),
      published: row?.published_json ? decode<DailyCalendar>(row.published_json) : null,
      items: await this.catalogs(), claims, stats, timezone: "Europe/Paris" };
  },
  async save(month: string, content: DailyCalendar, revision: number) {
    validateCalendar(month, content);
    return transaction(async c => {
      await c.execute("INSERT INTO daily_calendars(month,draft_json) VALUES(?,?) ON DUPLICATE KEY UPDATE month=VALUES(month)", [month, JSON.stringify(emptyCalendar(month))]);
      const [rows] = await c.execute<RowDataPacket[]>("SELECT revision FROM daily_calendars WHERE month=? FOR UPDATE", [month]);
      if (Number(rows[0]!.revision) !== revision) throw new DailyError("REVISION_CONFLICT", "Un autre administrateur a modifié ce mois. Recharge le calendrier.");
      await c.execute("UPDATE daily_calendars SET draft_json=?,revision=revision+1,updated_at=UTC_TIMESTAMP() WHERE month=?", [JSON.stringify(content), month]);
      return revision + 1;
    });
  },
  async publish(month: string, revision: number, actor: string, now = new Date()) {
    if (month < parisDate(now).slice(0, 7)) throw new DailyError("PAST_MONTH", "Un mois terminé ne peut plus être activé.");
    const ids = new Set((await this.catalogs()).map(i => i.id));
    return transaction(async c => {
      const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM daily_calendars WHERE month=? FOR UPDATE", [month]); const row = rows[0];
      if (!row || Number(row.revision) !== revision) throw new DailyError("REVISION_CONFLICT", "Enregistre le calendrier avant de l’activer.");
      const content = decode<DailyCalendar>(row.draft_json); validateCalendar(month, content, true);
      for (const r of content.days) for (const i of r.items) if (!ids.has(i.item)) throw new DailyError("UNKNOWN_ITEM", "Objet absent du catalogue serveur : " + i.item);
      const [claims] = await c.execute<RowDataPacket[]>("SELECT id FROM daily_claims WHERE month=? LIMIT 1", [month]);
      if (claims.length && JSON.stringify(content) !== JSON.stringify(decode(row.published_json)))
        throw new DailyError("MONTH_STARTED", "Ce mois a déjà des récupérations. Ses récompenses sont verrouillées pour rester identiques pour tous.");
      await c.execute("UPDATE daily_calendars SET published_json=draft_json,published_revision=revision,published_at=UTC_TIMESTAMP() WHERE month=?", [month]);
      await c.execute("INSERT INTO daily_publications(id,month,revision,actor_id,content_json) VALUES(?,?,?,?,?)", [randomUUID(), month, revision, actor, JSON.stringify(content)]);
    });
  },
  async view(uuid: string, now = new Date()) {
    const today = parisDate(now), month = today.slice(0, 7);
    const [calendars] = await pool.execute<RowDataPacket[]>("SELECT published_json FROM daily_calendars WHERE month=?", [month]);
    const content = calendars[0]?.published_json ? decode<DailyCalendar>(calendars[0].published_json) : null;
    const [rows] = await pool.execute<RowDataPacket[]>("SELECT * FROM daily_claims WHERE uuid=? AND (month=? OR status<>'delivered' OR delivered_date=?) ORDER BY created_at", [uuid, month, today]);
    const claims = rows.filter(r => r.month === month).map(normalize), pending = rows.find(r => r.status !== "delivered");
    return { month, today, timezone: "Europe/Paris", totalDays: daysInMonth(month), active: !!content, days: content?.days ?? [],
      claims, pending: pending ? normalize(pending) : null, nextDay: claims.length + 1,
      canClaim: !!content && !pending && !rows.some(r => r.claim_date === today || r.delivered_date === today) && claims.length < content.days.length };
  },
  async reserve(uuid: string, serverId: string, displayedMonth: string, now = new Date()) {
    const today = parisDate(now), month = today.slice(0, 7);
    return transaction(async c => {
      await lockPlayer(c, uuid);
      const [outstanding] = await c.execute<RowDataPacket[]>("SELECT * FROM daily_claims WHERE uuid=? AND status<>'delivered' ORDER BY created_at LIMIT 1 FOR UPDATE", [uuid]);
      if (outstanding[0]) {
        if (outstanding[0].server_id !== serverId) throw new DailyError("OTHER_SERVER", "Récupère la récompense en attente sur le serveur où tu l’as demandée.");
        return normalize(outstanding[0]);
      }
      if (displayedMonth !== month) throw new DailyError("MONTH_CHANGED", "Un nouveau mois commence. Rouvre /daily.");
      const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM daily_calendars WHERE month=? FOR UPDATE", [month]);
      if (!rows[0]?.published_json) throw new DailyError("NOT_ACTIVE", "Les récompenses de ce mois ne sont pas encore disponibles.");
      const [previous] = await c.execute<RowDataPacket[]>("SELECT * FROM daily_claims WHERE uuid=? AND (claim_date=? OR delivered_date=?) ORDER BY created_at LIMIT 1", [uuid, today, today]);
      if (previous[0]) return normalize(previous[0]);
      const [progress] = await c.execute<RowDataPacket[]>("SELECT COUNT(*) total FROM daily_claims WHERE uuid=? AND month=?", [uuid, month]);
      const day = Number(progress[0]!.total) + 1, reward = decode<DailyCalendar>(rows[0].published_json).days[day - 1];
      if (!reward) throw new DailyError("COMPLETE", "Tu as récupéré toutes les récompenses du mois !");
      if (reward.stars) await owner(c, uuid);
      const id = randomUUID();
      await c.execute("INSERT INTO daily_claims(id,uuid,month,day,claim_date,server_id,reward_json) VALUES(?,?,?,?,?,?,?)", [id, uuid, month, day, today, serverId, JSON.stringify(reward)]);
      return { id, uuid, month, day, date: today, serverId, reward, status: "reserved", message: null };
    });
  },
  async dispatch(uuid: string, serverId: string, id: string) {
    return transaction(async c => {
      await lockPlayer(c, uuid);
      const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM daily_claims WHERE id=? AND uuid=? AND server_id=? FOR UPDATE", [id, uuid, serverId]);
      if (!rows[0] || rows[0].status !== "reserved") throw new DailyError("ALREADY_DISPATCHED", "Cette livraison a déjà commencé. Aucune seconde distribution automatique.");
      await c.execute("UPDATE daily_claims SET status='dispatched',dispatched_at=UTC_TIMESTAMP() WHERE id=?", [id]);
      return { permit: true };
    });
  },
  async result(uuid: string, serverId: string, id: string, status: "delivered" | "review", message: string, now = new Date()) {
    return transaction(async c => {
      await lockPlayer(c, uuid);
      const [rows] = await c.execute<RowDataPacket[]>("SELECT * FROM daily_claims WHERE id=? AND uuid=? AND server_id=? FOR UPDATE", [id, uuid, serverId]);
      if (!rows[0]) throw new DailyError("NOT_FOUND", "Récompense introuvable.", 404);
      if (rows[0].status === "delivered") return;
      if (!["dispatched", "review"].includes(rows[0].status)) throw new DailyError("INVALID_STATE", "La livraison n’a pas commencé.");
      const reward = decode<DailyReward>(rows[0].reward_json);
      if (status === "delivered" && reward.stars > 0) {
        const userId = await owner(c, uuid);
        await c.execute("INSERT IGNORE INTO wallets(user_id,balance) VALUES(?,0)", [userId]);
        const [wallets] = await c.execute<RowDataPacket[]>("SELECT CAST(balance AS CHAR) balance FROM wallets WHERE user_id=? FOR UPDATE", [userId]);
        if (BigInt(wallets[0]!.balance) + BigInt(reward.stars) > BigInt(Number.MAX_SAFE_INTEGER)) throw new DailyError("WALLET_LIMIT", "Le portefeuille a atteint sa limite.");
        await c.execute("INSERT INTO star_transactions(id,user_id,delta,kind,reference_id,metadata_json) VALUES(?,?,?,'daily',?,?)",
          [randomUUID(), userId, reward.stars, "daily:" + id, JSON.stringify({ month: rows[0].month, day: rows[0].day })]);
        await c.execute("UPDATE wallets SET balance=balance+? WHERE user_id=?", [reward.stars, userId]);
      }
      await c.execute("UPDATE daily_claims SET status=?,message=?,completed_at=IF(?='delivered',UTC_TIMESTAMP(),NULL),delivered_date=? WHERE id=?", [status, message, status, status === "delivered" ? parisDate(now) : null, id]);
    });
  },
};
