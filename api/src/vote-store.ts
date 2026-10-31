import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { pool, transaction } from './db.js';
import { findVoteSite } from './votes.js';
import { VoteError } from './vote-providers.js';
import type { VoteAttempt, VoteStore } from './vote-verification.js';
type AttemptRow = RowDataPacket & VoteAttempt;
export const voteStore: VoteStore = {
  async active(userId,site) {
    const [rows] = await pool.execute<AttemptRow[]>(`SELECT * FROM vote_attempts WHERE user_id=? AND vote_site=? AND expires_at>UTC_TIMESTAMP(3) AND claim_id IS NULL ORDER BY created_at DESC LIMIT 1`,[userId,site]);
    return rows[0] ?? null;
  },
  async get(userId,id) {
    const [rows] = await pool.execute<AttemptRow[]>(`SELECT * FROM vote_attempts WHERE id=? AND user_id=?`,[id,userId]); return rows[0] ?? null;
  },
  async create(actor,site,otp,ipHash,expires) {
    return transaction(async c => {
      const [users] = await c.execute<(RowDataPacket & { minecraft_uuid:string; minecraft_username:string; minecraft_linked_at:unknown })[]>(`SELECT minecraft_uuid,minecraft_username,minecraft_linked_at FROM users WHERE id=? FOR UPDATE`,[actor.id]);
      if (!users[0]?.minecraft_linked_at || users[0].minecraft_uuid !== actor.minecraft_uuid || users[0].minecraft_username !== actor.minecraft_username) throw new VoteError('VOTE_ACCOUNT_CHANGED');
      const [latest] = await c.execute<(RowDataPacket & { voted_at:Date })[]>(`SELECT voted_at FROM vote_claims WHERE user_id=? AND vote_site=? ORDER BY voted_at DESC LIMIT 1`,[actor.id,site]);
      if (latest[0] && Date.now()-latest[0].voted_at.getTime()<findVoteSite(site)!.intervalMinutes*60000) throw new VoteError('VOTE_COOLDOWN_ACTIVE');
      // Reuse the winning attempt if two tabs start simultaneously.
      const [active] = await c.execute<AttemptRow[]>(`SELECT * FROM vote_attempts WHERE user_id=? AND vote_site=? AND expires_at>UTC_TIMESTAMP(3) AND claim_id IS NULL ORDER BY created_at DESC LIMIT 1`,[actor.id,site]);
      if (active[0] && active[0].minecraft_uuid === actor.minecraft_uuid && active[0].username === actor.minecraft_username && active[0].ip_hash === ipHash) return active[0];
      const row:VoteAttempt = { id:randomUUID(),user_id:actor.id,vote_site:site,minecraft_uuid:actor.minecraft_uuid!,username:actor.minecraft_username!,otp,ip_hash:ipHash,created_at:new Date(),expires_at:expires,claim_id:null };
      await c.execute(`INSERT INTO vote_attempts(id,user_id,vote_site,minecraft_uuid,username,otp,ip_hash,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)`,[row.id,row.user_id,site,row.minecraft_uuid,row.username,otp,ipHash,row.created_at,expires]);
      // Remove only expired challenges, never claims or vote history.
      await c.execute(`DELETE FROM vote_attempts WHERE expires_at<UTC_TIMESTAMP()-INTERVAL 7 DAY LIMIT 100`);
      await c.execute(`DELETE l FROM vote_identity_locks l LEFT JOIN vote_attempts a ON a.ip_hash=l.identity_hash WHERE a.id IS NULL`);
      return row;
    });
  },
  async claim(actor,attempt,reference) {
    return transaction(async c => {
      const [users] = await c.execute<(RowDataPacket & { minecraft_uuid:string; minecraft_username:string; minecraft_linked_at:unknown })[]>(`SELECT minecraft_uuid,minecraft_username,minecraft_linked_at FROM users WHERE id=? FOR UPDATE`,[actor.id]);
      if (!users[0]?.minecraft_linked_at || users[0].minecraft_uuid !== attempt.minecraft_uuid || users[0].minecraft_username !== attempt.username) throw new VoteError('VOTE_ACCOUNT_CHANGED');
      const [attempts] = await c.execute<AttemptRow[]>(`SELECT * FROM vote_attempts WHERE id=? AND user_id=? FOR UPDATE`,[attempt.id,actor.id]); const row=attempts[0];
      if (!row || row.expires_at.getTime() <= Date.now()) throw new VoteError('VOTE_ATTEMPT_EXPIRED');
      if (row.claim_id) return row.claim_id;
      const minutes=findVoteSite(row.vote_site)!.intervalMinutes;
      const [latest] = await c.execute<(RowDataPacket & { voted_at:Date })[]>(`SELECT voted_at FROM vote_claims WHERE user_id=? AND vote_site=? ORDER BY voted_at DESC LIMIT 1`,[actor.id,row.vote_site]);
      if (latest[0] && Date.now()-latest[0].voted_at.getTime()<minutes*60000) throw new VoteError('VOTE_COOLDOWN_ACTIVE');
      if (row.ip_hash) {
        await c.execute(`INSERT IGNORE INTO vote_identity_locks(identity_hash) VALUES(?)`,[row.ip_hash]);
        // Locking read sees the previous commit even with MySQL REPEATABLE READ.
        const [locks] = await c.execute<(RowDataPacket & {last_claimed_at:Date|null})[]>(`SELECT last_claimed_at FROM vote_identity_locks WHERE identity_hash=? FOR UPDATE`,[row.ip_hash]);
        if (locks[0]?.last_claimed_at && Date.now()-locks[0].last_claimed_at.getTime()<minutes*60000) throw new VoteError('VOTE_PROVIDER_COOLDOWN');
        await c.execute(`UPDATE vote_identity_locks SET last_claimed_at=UTC_TIMESTAMP() WHERE identity_hash=?`,[row.ip_hash]);
      }
      const id=randomUUID();
      try { await c.execute(`INSERT INTO vote_claims(id,user_id,vote_site,external_reference,reward_keys,reward_status,voted_at) VALUES(?,?,?,?,1,'pending',UTC_TIMESTAMP())`,[id,actor.id,row.vote_site,reference]); }
      catch(e) { if ((e as {code?:string}).code === 'ER_DUP_ENTRY') throw new VoteError('VOTE_ALREADY_RECORDED'); throw e; }
      await c.execute(`UPDATE vote_attempts SET claim_id=?,otp=NULL WHERE id=?`,[id,row.id]); return id;
    });
  }
};
