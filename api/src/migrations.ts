import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "./db.js";

export async function applyMigrations() {
  const sql = await readFile(join(process.cwd(), "migrations/001_initial.sql"), "utf8");
  const statements = sql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
  for (const statement of statements) await pool.query(statement);
  return statements.length;
}
