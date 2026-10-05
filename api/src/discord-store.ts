import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "./db.js";
import { config } from "./config.js";
import { settingsSchema, type EventKind, type Settings } from "./discord-policy.js";

export function json<T>(value: T | string): T { return typeof value === "string" ? JSON.parse(value) as T : value; }
export async function settings(): Promise<Settings> {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT settings FROM discord_settings WHERE guild_id=?", [config.DISCORD_GUILD_ID]);
  return settingsSchema.parse(rows[0] ? json(rows[0].settings) : {});
}
export async function saveSettings(value: Settings) {
  await pool.execute("INSERT INTO discord_settings (guild_id,settings) VALUES (?,?) ON DUPLICATE KEY UPDATE settings=VALUES(settings)",
    [config.DISCORD_GUILD_ID, JSON.stringify(settingsSchema.parse(value))]);
}
export async function enqueue(kind: EventKind, text: string, id: string = randomUUID()) {
  await pool.execute("INSERT IGNORE INTO discord_event_outbox (id,kind,body) VALUES (?,?,?)", [id, kind, JSON.stringify({text})]);
}
export interface Ticket extends RowDataPacket {
  id: string; owner_id: string; channel_id: string; subject: string; description: string;
  status: string; claimed_by: string | null; members: string[] | string;
  close_token: string | null; close_expires: Date | null; close_reason: string | null;
  archive_message: string | null; created_at: Date;
}
export async function ticketFor(channelId: string) {
  const [rows] = await pool.query<Ticket[]>("SELECT * FROM discord_tickets WHERE guild_id=? AND channel_id=?", [config.DISCORD_GUILD_ID, channelId]);
  return rows[0];
}
