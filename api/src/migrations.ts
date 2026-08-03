import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "./db.js";

export async function applyMigrations() {
  const migrationsDirectory = join(process.cwd(), "migrations");
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  let applied = 0;
  for (const file of files) {
    const [known] = await pool.query(`SELECT name FROM schema_migrations WHERE name=? LIMIT 1`, [file]);
    if (Array.isArray(known) && known.length > 0) continue;
    const sql = await readFile(join(migrationsDirectory, file), "utf8");
    const statements = sql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) await pool.query(statement);
    await pool.query(`INSERT IGNORE INTO schema_migrations(name) VALUES(?)`, [file]);
    applied += 1;
  }
  return applied;
}
