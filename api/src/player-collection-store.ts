import type { RowDataPacket } from 'mysql2/promise';
import { pool } from './db.js';
import type { CollectionStore } from './player-collection.js';

export const collectionStore: CollectionStore = {
  async preferences(userId) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT species,favorite,wanted,target,shiny,note FROM player_collection_goals WHERE user_id=?', [userId]);
    return rows.map(r => ({ species: r.species, favorite: Boolean(r.favorite), wanted: Boolean(r.wanted), target: r.target, shiny: Boolean(r.shiny), note: r.note }));
  },
  async snapshot(uuid) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT snapshot_json,observed_at FROM game_players WHERE uuid=? LIMIT 1', [uuid]);
    return rows[0] ? { snapshot_json: rows[0].snapshot_json, observed_at: Number(rows[0].observed_at) } : null;
  },
  async save(userId, p) {
    await pool.execute(`INSERT INTO player_collection_goals(user_id,species,favorite,wanted,target,shiny,note) VALUES(?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE favorite=VALUES(favorite),wanted=VALUES(wanted),target=VALUES(target),shiny=VALUES(shiny),note=VALUES(note)`,
    [userId, p.species, p.favorite, p.wanted, p.target, p.shiny, p.note]);
  },
};
