import { pool } from "./db.js";
import { applyMigrations } from "./migrations.js";

const count = await applyMigrations();
await pool.end();
console.log(`Applied ${count} database statements.`);
