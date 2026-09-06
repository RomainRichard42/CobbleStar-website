import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
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
});
