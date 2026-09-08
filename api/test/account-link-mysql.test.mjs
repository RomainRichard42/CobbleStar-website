import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import mysql from "mysql2/promise";
import { confirmPlayerLink } from "../dist/account-link.js";

// Dedicated, disposable database only. Never reads DB_* or a production .env.
test("MySQL: UUID recovery, preserved records, rollback, replay and concurrent confirmation", { skip: !process.env.LINK_TEST_MYSQL_PORT }, async t => {
  const db = mysql.createPool({ host: "127.0.0.1", port: Number(process.env.LINK_TEST_MYSQL_PORT),
    database: "cobblestar_link_test", user: "cobblestar_test", password: "cobblestar-test-only",
    connectionLimit: 6, supportBigNumbers: true, bigNumberStrings: true });
  t.after(() => db.end());
  const migrations = new URL("../migrations/", import.meta.url);
  // Refuse an already initialized database; do not clear or overwrite tables.
  const [existing] = await db.query("SHOW TABLES");
  assert.equal(existing.length, 0, "Use a fresh cobblestar_link_test database");
  for (const name of (await readdir(migrations)).filter(name => name.endsWith(".sql")).sort()) {
    const sql = await readFile(new URL(name, migrations), "utf8");
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(s => s.trim()).filter(Boolean)) await db.query(statement);
  }
  const hex = () => randomBytes(16).toString("hex");
  async function run(input, callback = confirmPlayerLink) {
    const c = await db.getConnection();
    try {
      await c.beginTransaction();
      const result = await callback(c, input);
      await c.commit();
      return result;
    } catch (error) { await c.rollback(); throw error; }
    finally { c.release(); }
  }
  async function seed({ linkedSource = false, targetExists = true } = {}) {
    const sourceId = randomUUID(), targetId = targetExists ? randomUUID() : null;
    const uuid = hex(), sourceUuid = linkedSource ? hex() : null;
    const discord = randomBytes(12).readBigUInt64BE().toString();
    const oldDiscord = randomBytes(12).readBigUInt64BE().toString();
    const hash = hex() + hex(), session = hex() + hex(), codeId = randomUUID();
    await db.execute("INSERT INTO users(id,discord_id,discord_email,minecraft_uuid,minecraft_linked_at) VALUES(?,?,?,?,?)", [sourceId, discord, `${sourceId}@example.test`, sourceUuid, linkedSource ? new Date() : null]);
    await db.execute("INSERT INTO wallets(user_id,balance) VALUES(?,17)", [sourceId]);
    if (targetExists) {
      await db.execute("INSERT INTO users(id,email,discord_id,minecraft_uuid,minecraft_username,minecraft_linked_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP())", [targetId, `${targetId}@legacy.test`, oldDiscord, uuid, "OldName"]);
      await db.execute("INSERT INTO wallets(user_id,balance) VALUES(?,31)", [targetId]);
      await db.execute("INSERT INTO sessions(token_hash,user_id,discord_id,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY))", [hex() + hex(), targetId, oldDiscord]);
    }
    for (const token of [session, hex() + hex()]) await db.execute("INSERT INTO sessions(token_hash,user_id,discord_id,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY))", [token, sourceId, discord]);
    await db.execute("INSERT INTO link_codes(id,user_id,code_hash,issuer_discord_id,session_token_hash,allow_relink,expires_at) VALUES(?,?,?,?,?,TRUE,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))", [codeId, sourceId, hash, discord, session]);
    return { sourceId, targetId, uuid, sourceUuid, discord, session, codeId, input: { codeHash: hash, uuid, username: "LhShiroe", relinkEnabled: true } };
  }
  async function addRecords(userId, balance) {
    const purchase = randomUUID();
    await db.execute("INSERT INTO star_transactions(id,user_id,delta,kind,reference_id) VALUES(?,?,?,'test',?)", [randomUUID(), userId, balance, randomUUID()]);
    await db.execute("INSERT INTO orders(id,user_id,provider,provider_reference,amount_cents,stars_amount,status) VALUES(?,?,'test',?,100,17,'paid')", [randomUUID(), userId, randomUUID()]);
    await db.execute("INSERT INTO vote_claims(id,user_id,vote_site,external_reference,reward_status,voted_at,delivered_at) VALUES(?,?,'test',?,'delivered',UTC_TIMESTAMP(),UTC_TIMESTAMP())", [randomUUID(), userId, randomUUID()]);
    await db.execute("INSERT INTO shop_purchases(id,user_id,product_id,stars_spent) VALUES(?,?,'test-cosmetic',2)", [purchase, userId]);
    await db.execute("INSERT INTO reward_deliveries(id,purchase_id,user_id,product_id,item_id,item_count,status,delivered_at) VALUES(?,?,?,'test-cosmetic','minecraft:stone',1,'delivered',UTC_TIMESTAMP())", [randomUUID(), purchase, userId]);
  }
  await t.test("different emails recover the original UUID and combine provisional records exactly once", async () => {
    const f = await seed();
    await addRecords(f.sourceId, 17); await addRecords(f.targetId, 31);
    await run(f.input);
    const [users] = await db.execute("SELECT id,discord_id,minecraft_uuid,minecraft_username,merged_into FROM users WHERE id IN (?,?) ORDER BY id", [f.sourceId, f.targetId]);
    assert.equal(users.find(u => u.id === f.targetId).discord_id, f.discord);
    assert.equal(users.find(u => u.id === f.targetId).minecraft_username, "LhShiroe");
    assert.equal(users.find(u => u.id === f.sourceId).merged_into, f.targetId);
    const [wallets] = await db.execute("SELECT user_id,CAST(balance AS CHAR) balance FROM wallets WHERE user_id IN (?,?)", [f.sourceId, f.targetId]);
    assert.equal(wallets.find(w => w.user_id === f.targetId).balance, "48");
    assert.equal(wallets.find(w => w.user_id === f.sourceId).balance, "0");
    for (const table of ["star_transactions", "orders", "vote_claims", "shop_purchases", "reward_deliveries"]) {
      const [rows] = await db.execute(`SELECT COUNT(*) n FROM ${table} WHERE user_id=?`, [f.targetId]);
      assert.equal(Number(rows[0].n), 2);
    }
    const [delivered] = await db.execute("SELECT status,delivered_at FROM reward_deliveries WHERE user_id=?", [f.targetId]);
    assert.ok(delivered.every(d => d.status === "delivered" && d.delivered_at));
    const [sessions] = await db.execute("SELECT * FROM sessions WHERE user_id IN (?,?)", [f.sourceId, f.targetId]);
    assert.equal(sessions.length, 1); assert.equal(sessions[0].token_hash, f.session); assert.equal(sessions[0].user_id, f.targetId);
    const [events] = await db.execute("SELECT * FROM account_link_events WHERE code_id=?", [f.codeId]);
    assert.equal(events.length, 1);
    await assert.rejects(run(f.input), /INVALID_OR_EXPIRED_CODE/);
  });
  await t.test("first link keeps the existing provisional account and its balance", async () => {
    const f = await seed({ targetExists: false });
    await run({ ...f.input, relinkEnabled: false });
    const [rows] = await db.execute("SELECT u.id,CAST(w.balance AS CHAR) balance FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.minecraft_uuid=?", [f.uuid]);
    assert.equal(rows[0].id, f.sourceId); assert.equal(rows[0].balance, "17");
  });
  await t.test("switching players preserves both UUIDs and their separate balances", async () => {
    const f = await seed({ linkedSource: true });
    await run(f.input);
    const [rows] = await db.execute("SELECT u.id,u.minecraft_uuid,u.discord_id,CAST(w.balance AS CHAR) balance FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.id IN (?,?)", [f.sourceId, f.targetId]);
    assert.equal(rows.find(r => r.id === f.sourceId).minecraft_uuid, f.sourceUuid);
    assert.equal(rows.find(r => r.id === f.sourceId).balance, "17");
    assert.equal(rows.find(r => r.id === f.targetId).balance, "31");
    assert.equal(rows.find(r => r.id === f.sourceId).discord_id, null);
  });
  await t.test("switching to a new UUID creates a distinct empty player, not a renamed wallet", async () => {
    const f = await seed({ linkedSource: true, targetExists: false });
    await run(f.input);
    const [rows] = await db.execute("SELECT u.id,CAST(w.balance AS CHAR) balance FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.minecraft_uuid=?", [f.uuid]);
    assert.notEqual(rows[0].id, f.sourceId); assert.equal(rows[0].balance, "0");
  });
  await t.test("same UUID refresh updates the display name without merging a wallet", async () => {
    const f = await seed({ linkedSource: true, targetExists: false });
    await run({ ...f.input, uuid: f.sourceUuid, relinkEnabled: false });
    const [rows] = await db.execute("SELECT u.minecraft_username,CAST(w.balance AS CHAR) balance FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.id=?", [f.sourceId]);
    assert.equal(rows[0].minecraft_username, "LhShiroe"); assert.equal(rows[0].balance, "17");
  });
  await t.test("failure after all writes rolls back funds, identity, sessions and consumed code", async () => {
    const f = await seed();
    await assert.rejects(run(f.input, async (c, input) => { await confirmPlayerLink(c, input); throw new Error("forced rollback"); }), /forced rollback/);
    const [sourceRows] = await db.execute("SELECT discord_id,merged_into FROM users WHERE id=?", [f.sourceId]);
    assert.equal(sourceRows[0].discord_id, f.discord); assert.equal(sourceRows[0].merged_into, null);
    const [codes] = await db.execute("SELECT used_at FROM link_codes WHERE id=?", [f.codeId]);
    assert.equal(codes[0].used_at, null);
    await run(f.input); // The original code is still usable after rollback.
  });
  await t.test("two simultaneous confirmations cannot duplicate Stars or recovery events", async () => {
    const f = await seed();
    const results = await Promise.allSettled([run(f.input), run(f.input)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    const [rows] = await db.execute("SELECT CAST(balance AS CHAR) balance FROM wallets WHERE user_id=?", [f.targetId]);
    assert.equal(rows[0].balance, "48");
  });
  await t.test("real admin stats and player routes: strict grouping, mixed collations and server sync", async () => {
    const adminDiscord = "111111111111111111";
    // Explicit isolated configuration; never use production DB_* or secrets.
    Object.assign(process.env, {
      NODE_ENV: "test", HOST: "127.0.0.1", PORT: "25577",
      PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test",
      DB_HOST: "127.0.0.1", DB_PORT: process.env.LINK_TEST_MYSQL_PORT,
      DB_NAME: "cobblestar_link_test", DB_USER: "cobblestar_test", DB_PASSWORD: "cobblestar-test-only", DB_SSL: "false",
      COOKIE_SECRET: "isolated-test-cookie-secret-never-used-in-production",
      MINECRAFT_SERVER_KEY: "isolated-test-server-secret-never-used-in-production",
      GAME_ADMIN_DISCORD_IDS: adminDiscord, GAME_ADMIN_READ_DISCORD_IDS: "", WIKI_ADMIN_EMAILS: "staff-only@example.test",
    });
    const { app } = await import("../dist/server.js");
    const { pool: apiPool } = await import("../dist/db.js");
    const originalExecute = apiPool.execute.bind(apiPool);
    let strictQueryCount = 0;
    // Every query uses an actual MySQL connection with strict grouping explicitly
    // enabled. The route, authorization and response mapping are NOT mocked.
    apiPool.execute = async (...args) => {
      const connection = await apiPool.getConnection();
      try {
        const [mode] = await connection.query("SELECT @@SESSION.sql_mode AS mode");
        const modes = new Set(mode[0].mode.split(",")); modes.add("ONLY_FULL_GROUP_BY");
        await connection.query("SET SESSION sql_mode=?", [[...modes].join(",")]);
        strictQueryCount++;
        return await connection.execute(...args);
      } finally { connection.release(); }
    };
    try {
      const userId = randomUUID(), rawSession = hex() + hex();
      const sessionHash = createHash("sha256").update(rawSession).digest("hex");
      await db.execute("INSERT INTO users(id,discord_id) VALUES(?,?)", [userId, adminDiscord]);
      await db.execute("INSERT INTO sessions(token_hash,user_id,discord_id,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY))", [sessionHash, userId, adminDiscord]);
      assert.equal((await app.inject({ url: "/api/admin/stats" })).statusCode, 401);
      const normal = await seed({ targetExists: false });
      // A hash is not a valid cookie; denial must not expose statistics.
      assert.equal((await app.inject({ url: "/api/admin/stats", headers: { cookie: `cobblestar_session=${normal.session}` } })).statusCode, 401);
      const normalRawSession = hex() + hex();
      await db.execute("INSERT INTO sessions(token_hash,user_id,discord_id,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY))", [createHash("sha256").update(normalRawSession).digest("hex"), normal.sourceId, normal.discord]);
      assert.equal((await app.inject({ url: "/api/admin/stats", headers: { cookie: `cobblestar_session=${normalRawSession}` } })).statusCode, 403);
      const response = await app.inject({ url: "/api/admin/stats", headers: { cookie: `cobblestar_session=${rawSession}` } });
      assert.equal(response.statusCode, 200, response.body);
      const stats = response.json();
      assert.equal(stats.daily.length, 30);
      assert.ok(stats.daily.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.day)));
      for (const series of ["accounts", "links", "votes", "purchases"]) {
        assert.ok(stats.daily.reduce((sum, day) => sum + day[series], 0) > 0, series);
      }
      const [expectedUsers] = await db.query("SELECT COUNT(*) n FROM users WHERE merged_into IS NULL");
      assert.equal(stats.overview.users, Number(expectedUsers[0].n));
      const [expectedWallet] = await db.query("SELECT COALESCE(SUM(w.balance),0) n FROM wallets w JOIN users u ON u.id=w.user_id WHERE u.merged_into IS NULL");
      assert.equal(stats.economy.circulatingStars, Number(expectedWallet[0].n));
      assert.ok(strictQueryCount >= 16, "All dashboard queries must run in strict mode");
      // Reproduce the production schema mismatch explicitly in this disposable
      // database. Do not change production collations or weaken strict mode.
      await db.query("ALTER TABLE game_players MODIFY uuid CHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL");
      const [collations] = await db.query("SELECT TABLE_NAME,COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='cobblestar_link_test' AND ((TABLE_NAME='users' AND COLUMN_NAME='minecraft_uuid') OR (TABLE_NAME='game_players' AND COLUMN_NAME='uuid'))");
      assert.equal(collations.find(c => c.TABLE_NAME === "users").COLLATION_NAME, "utf8mb4_unicode_ci");
      assert.equal(collations.find(c => c.TABLE_NAME === "game_players").COLLATION_NAME, "utf8mb4_0900_ai_ci");
      const adminHeaders = { cookie: `cobblestar_session=${rawSession}` };
      const listBeforeSync = await app.inject({ url: "/api/admin/game/players?page=1", headers: adminHeaders });
      assert.equal(listBeforeSync.statusCode, 200, listBeforeSync.body);
      assert.equal(listBeforeSync.json().total, 0);
      const observed = await seed({ linkedSource: true, targetExists: false });
      await db.execute("UPDATE users SET discord_username='fixture_discord' WHERE id=?", [observed.sourceId]);
      const snapshotId = randomUUID();
      const snapshot = {
        schemaVersion: 1, sessionStartedAt: Date.now(), health: 20, maxHealth: 20, food: 20,
        xpLevel: 5, xpProgress: 0, dimension: "minecraft:overworld", x: 0, y: 64, z: 0, gameMode: "survival",
        inventory: [], enderChest: [], pokemon: [], pokemonTruncated: false, statistics: {},
        academy: {}, quests: {}, cosmeticIds: [], capabilities: ["xp_level"],
      };
      const sync = await app.inject({ method: "POST", url: "/api/internal/admin/sync",
        headers: { authorization: `Bearer ${process.env.MINECRAFT_SERVER_KEY}` },
        payload: { uuid: observed.sourceUuid, username: "TEST_DRESSEUR", serverId: "main", snapshotId, online: true,
          observedAt: Date.now(), snapshot, events: [{ id: randomUUID(), kind: "join", at: Date.now(), detail: {} }] } });
      assert.equal(sync.statusCode, 200, sync.body);
      for (const query of ["", observed.sourceUuid, "TEST_DRESSEUR", "fixture_discord"]) {
        const list = await app.inject({ url: `/api/admin/game/players?page=1&q=${encodeURIComponent(query)}`, headers: adminHeaders });
        assert.equal(list.statusCode, 200, list.body);
        assert.equal(list.json().total, 1); assert.equal(list.json().players[0].uuid, observed.sourceUuid);
        assert.equal(list.json().players[0].discordUsername, "fixture_discord");
      }
      const escaped = await app.inject({ url: "/api/admin/game/players?q=%25", headers: adminHeaders });
      assert.equal(escaped.statusCode, 200, escaped.body); assert.equal(escaped.json().total, 0);
      const nextPage = await app.inject({ url: "/api/admin/game/players?page=2", headers: adminHeaders });
      assert.equal(nextPage.statusCode, 200, nextPage.body); assert.equal(nextPage.json().players.length, 0);
      const detail = await app.inject({ url: `/api/admin/game/players/${observed.sourceUuid}`, headers: adminHeaders });
      assert.equal(detail.statusCode, 200, detail.body);
      assert.equal(detail.json().snapshotId, snapshotId); assert.equal(detail.json().eventsTotal, 1);
      assert.equal(detail.json().snapshot.xpLevel, 5); assert.equal(detail.json().account.discord_id, observed.discord);
      const missing = await app.inject({ url: `/api/admin/game/players/${hex()}`, headers: adminHeaders });
      assert.equal(missing.statusCode, 404); assert.equal(missing.json().error, "PLAYER_NOT_OBSERVED");
      // Arena studio uses the same disposable database and actual authenticated routes.
      // Exercises migration 011, row locks, two editors, publication audit and server acknowledgement.
      const { exerciseArenaStudio } = await import("./fixtures/arena-studio.mjs");
      await exerciseArenaStudio(app, { ...adminHeaders, origin: "https://example.test" }, { authorization: `Bearer ${process.env.MINECRAFT_SERVER_KEY}` });
    } finally {
      apiPool.execute = originalExecute;
      await app.close(); await apiPool.end();
    }
  });
});
