import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

Object.assign(process.env, {
  NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test",
  DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test",
  COOKIE_SECRET: "test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY: "test-only-server-secret-never-used-in-production",
  GAME_ADMIN_DISCORD_IDS: "111111111111111111", GAME_ADMIN_READ_DISCORD_IDS: "", WIKI_ADMIN_EMAILS: "staff-only@example.test",
});
const { app } = await import("../dist/server.js");
const { pool } = await import("../dist/db.js");
const hash = value => createHash("sha256").update(value).digest("hex");

test("admin stats HTTP contract and matching daily GROUP BY expressions (DB double)", async () => {
  const original = pool.execute;
  const dailyQueries = [];
  pool.execute = async (sql, args) => {
    if (sql.startsWith("SELECT u.* FROM sessions")) {
      const isAdmin = args[0] === hash("admin-fixture");
      return [[{ id: "fixture", discord_id: isAdmin ? "111111111111111111" : "222222222222222222", discord_email: null }]];
    }
    if (sql.startsWith("SELECT DATE_FORMAT")) {
      dailyQueries.push(sql);
      const expression = sql.match(/^SELECT (DATE_FORMAT\([^)]*\)) day/)[1];
      assert.ok(sql.includes(`GROUP BY ${expression} ORDER BY day`), "SELECT and GROUP BY must use the same date expression");
    }
    return [[]];
  };
  try {
    assert.equal((await app.inject({ url: "/api/admin/stats" })).statusCode, 401);
    assert.equal((await app.inject({ url: "/api/admin/stats", headers: { cookie: "cobblestar_session=normal-fixture" } })).statusCode, 403);
    const response = await app.inject({ url: "/api/admin/stats", headers: { cookie: "cobblestar_session=admin-fixture" } });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(dailyQueries.length, 4);
    assert.equal(response.json().daily.length, 30);
    assert.deepEqual(response.json().players, []);
  } finally { pool.execute = original; await app.close(); await pool.end(); }
});
