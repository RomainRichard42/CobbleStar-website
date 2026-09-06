import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export class LinkError extends Error {
  constructor(public readonly code: string, public readonly status = 409) { super(code); }
}

export type LinkAccount = RowDataPacket & {
  id: string; minecraft_uuid: string | null; merged_into: string | null;
  discord_id: string | null; discord_username: string | null;
  discord_global_name: string | null; discord_avatar: string | null;
  discord_email: string | null; discord_guild_joined_at: Date | null;
};
type Code = RowDataPacket & {
  id: string; user_id: string; issuer_discord_id: string | null;
  session_token_hash: string | null; allow_relink: number;
};

// UUID is the public player identity; the existing SQL primary key stays stable
// to preserve purchases, votes, audit trails and external payment references.
export function accountIdentity(user: { id: string; minecraft_uuid: string | null }) {
  return { kind: user.minecraft_uuid ? "minecraft" : "provisional", id: user.minecraft_uuid ?? user.id };
}

export function planLink(source: LinkAccount, target: LinkAccount | undefined, allowRelink: boolean, enabled: boolean) {
  if (!source.discord_id || source.merged_into) throw new LinkError("AUTH_REQUIRED", 401);
  const switchingPlayer = Boolean(source.minecraft_uuid && source.id !== target?.id);
  const replacingDiscord = Boolean(target?.discord_id && target.discord_id !== source.discord_id);
  const recovering = Boolean(target && target.id !== source.id);
  if (switchingPlayer || recovering) {
    if (!enabled) throw new LinkError("RELINK_DISABLED");
    if (!allowRelink) throw new LinkError("RELINK_CONFIRMATION_REQUIRED");
  }
  return { switchingPlayer, replacingDiscord, mergeProvisional: !source.minecraft_uuid && recovering };
}

// Called ONLY inside one database transaction, after the server key and the
// server-supplied Minecraft identity have been validated by the route.
export async function confirmPlayerLink(connection: PoolConnection, input: {
  codeHash: string; uuid: string; username: string; relinkEnabled: boolean;
}) {
  const [codes] = await connection.execute<Code[]>(
    `SELECT * FROM link_codes WHERE code_hash=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() FOR UPDATE`, [input.codeHash]);
  const code = codes[0];
  if (!code?.issuer_discord_id || !code.session_token_hash) throw new LinkError("INVALID_OR_EXPIRED_CODE", 404);

  // Lock BOTH identities before examining ownership or moving any money.
  const [accounts] = await connection.execute<LinkAccount[]>(
    `SELECT * FROM users WHERE id=? OR minecraft_uuid=? ORDER BY id FOR UPDATE`, [code.user_id, input.uuid]);
  const source = accounts.find((row) => row.id === code.user_id);
  let target = accounts.find((row) => row.minecraft_uuid === input.uuid);
  if (!source || source.discord_id !== code.issuer_discord_id) throw new LinkError("INVALID_OR_EXPIRED_CODE", 404);
  const [sessions] = await connection.execute<RowDataPacket[]>(
    `SELECT token_hash FROM sessions WHERE token_hash=? AND user_id=? AND discord_id=? AND expires_at>UTC_TIMESTAMP() FOR UPDATE`,
    [code.session_token_hash, source.id, source.discord_id]);
  if (!sessions[0]) throw new LinkError("INVALID_OR_EXPIRED_CODE", 404);
  const plan = planLink(source, target, Boolean(code.allow_relink), input.relinkEnabled);

  const previousDiscordId = target?.discord_id ?? null;
  const previousMinecraftUuid = source.minecraft_uuid;
  if (!target) {
    if (!source.minecraft_uuid) target = source;
    else {
      const id = randomUUID();
      await connection.execute(`INSERT INTO users(id,minecraft_uuid,minecraft_username,minecraft_linked_at) VALUES(?,?,?,UTC_TIMESTAMP())`, [id, input.uuid, input.username]);
      target = { ...source, id, minecraft_uuid: input.uuid, discord_id: null };
    }
  }
  const targetId = target.id;
  await connection.execute(`INSERT IGNORE INTO wallets(user_id,balance) VALUES(?,0),(?,0)`, [source.id, targetId]);
  const [wallets] = await connection.execute<(RowDataPacket & { user_id: string; balance: string })[]>(
    `SELECT user_id,CAST(balance AS CHAR) AS balance FROM wallets WHERE user_id IN (?,?) ORDER BY user_id FOR UPDATE`, [source.id, targetId]);
  const sourceBalance = BigInt(wallets.find((row) => row.user_id === source.id)?.balance ?? "0");
  const targetBalance = BigInt(wallets.find((row) => row.user_id === targetId)?.balance ?? "0");
  const moved: Record<string, number> = {};
  if (plan.mergeProvisional) {
    // Preserve integer precision; refuse rather than overflowing a BIGINT.
    if (sourceBalance + targetBalance > 18446744073709551615n) throw new LinkError("WALLET_OVERFLOW");
    await connection.execute(`UPDATE wallets SET balance=balance+? WHERE user_id=?`, [sourceBalance.toString(), targetId]);
    await connection.execute(`UPDATE wallets SET balance=0 WHERE user_id=?`, [source.id]);
    // Only player-owned records move. Staff authorship and admin permissions do NOT.
    // Delivery states/leases and provider references remain unchanged: no replay.
    for (const table of ["star_transactions", "orders", "vote_claims", "shop_purchases", "reward_deliveries"] as const) {
      const [result] = await connection.execute<ResultSetHeader>(`UPDATE ${table} SET user_id=? WHERE user_id=?`, [targetId, source.id]);
      moved[table] = result.affectedRows;
    }
    await connection.execute(`UPDATE users SET merged_into=? WHERE id=?`, [targetId, source.id]);
  }

  if (source.id !== targetId) {
    // Release the unique Discord identity, keeping each Minecraft UUID in place.
    await connection.execute(`UPDATE users SET discord_id=NULL,discord_username=NULL,discord_global_name=NULL,discord_avatar=NULL,discord_email=NULL,discord_linked_at=NULL,discord_guild_joined_at=NULL WHERE id=?`, [source.id]);
  }
  await connection.execute(
    `UPDATE users SET minecraft_uuid=?,minecraft_username=?,minecraft_linked_at=COALESCE(minecraft_linked_at,UTC_TIMESTAMP()),discord_id=?,discord_username=?,discord_global_name=?,discord_avatar=?,discord_email=?,discord_linked_at=UTC_TIMESTAMP(),discord_guild_joined_at=?,password_hash=NULL WHERE id=?`,
    [input.uuid, input.username, source.discord_id, source.discord_username, source.discord_global_name, source.discord_avatar, source.discord_email, source.discord_guild_joined_at, targetId]);

  // Keep ONLY the browser that generated the command; evict displaced Discord
  // sessions and all other sessions, even when recovering the same player.
  await connection.execute(`DELETE FROM sessions WHERE user_id IN (?,?) AND token_hash<>?`, [source.id, targetId, code.session_token_hash]);
  await connection.execute(`UPDATE sessions SET user_id=? WHERE token_hash=?`, [targetId, code.session_token_hash]);
  await connection.execute(`UPDATE link_codes SET used_at=UTC_TIMESTAMP() WHERE user_id IN (?,?) AND used_at IS NULL`, [source.id, targetId]);
  await connection.execute(`UPDATE link_codes SET completed_at=UTC_TIMESTAMP(),result_uuid=? WHERE id=?`, [input.uuid, code.id]);
  await connection.execute(
    `INSERT INTO account_link_events(id,code_id,source_user_id,target_user_id,minecraft_uuid,discord_id,previous_discord_id,previous_minecraft_uuid,merged_stars,merged_records_json) VALUES(?,?,?,?,?,?,?,?,?,?)`,
    [randomUUID(), code.id, source.id, targetId, input.uuid, source.discord_id, previousDiscordId, previousMinecraftUuid, plan.mergeProvisional ? sourceBalance.toString() : "0", JSON.stringify(moved)]);
  return { linked: true, minecraft: { uuid: input.uuid, username: input.username } };
}
