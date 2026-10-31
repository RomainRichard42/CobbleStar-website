import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

Object.assign(process.env, {
  NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test",
  DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test",
  COOKIE_SECRET: "test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY: "test-only-server-secret-never-used-in-production",
});
const { stripeStore } = await import("../dist/stripe-store.js");
const { announcementStore } = await import("../dist/purchase-announcements.js");
const { pool } = await import("../dist/db.js");
const { starPacks } = await import("../dist/star-packs.js");
test.after(() => pool.end());

test("MySQL Stripe: real migration, concurrent delivery, idempotency, test isolation and rollback", {
  skip: !process.env.LINK_TEST_MYSQL_PORT,
}, async t => {
  // Fresh disposable CI database on loopback, with fixed CI-only credentials. Never uses DB_* or .env.
  const database = "cs_stripe_test_" + randomBytes(6).toString("hex");
  const options = { host: "127.0.0.1", port: Number(process.env.LINK_TEST_MYSQL_PORT), user: "root", password: "cobblestar-test-root-only" };
  const admin = await mysql.createConnection(options);
  const original = { execute: pool.execute, getConnection: pool.getConnection };
  let db, created = false;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); created = true;
    db = mysql.createPool({ ...options, database, connectionLimit: 8 });
    const directory = new URL("../migrations/", import.meta.url);
    const apply = async name => {
      const sql = await readFile(new URL(name, directory), "utf8");
      for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map(s => s.trim()).filter(Boolean)) await db.query(statement);
    };
    for (const name of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) await apply(name);
    await apply("023_stripe_payments.sql");
    await apply("024_purchase_announcements.sql");
    pool.execute = db.execute.bind(db); pool.getConnection = db.getConnection.bind(db);
    const id = randomUUID(), uuid = randomBytes(16).toString("hex"), hash = randomBytes(32).toString("hex");
    await db.execute(`INSERT INTO users(id,discord_id,minecraft_uuid,minecraft_username,minecraft_linked_at) VALUES(?,'123456789012345678',?,'Dresseur',UTC_TIMESTAMP())`, [id, uuid]);
    await db.execute(`INSERT INTO wallets(user_id,balance) VALUES(?,100)`, [id]);
    await db.execute(`INSERT INTO sessions(token_hash,user_id,discord_id,expires_at) VALUES(?,?,'123456789012345678',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 DAY))`, [hash, id]);
    const reserve = (mode = "live", request = randomUUID()) => stripeStore.reserve(id, hash, request, starPacks[0], mode);
    const snapshot = order => ({ id: `cs_${order.mode}_${randomBytes(8).toString("hex")}`, orderId: order.id, packId: order.packId,
      mode: order.mode, currency: "eur", total: 499, subtotal: 499, paymentIntent: "pi_" + randomBytes(8).toString("hex"),
      paid: true, complete: true, expired: false, lineCount: 1, lineQuantity: 1, lineTotal: 499, lineCurrency: "eur", clientReference: order.id });
    await t.test("same request reserves one order under concurrent calls", async () => {
      const request = randomUUID(); const result = await Promise.all([reserve("live", request), reserve("live", request)]);
      assert.equal(result[0].id, result[1].id);
    });
    await t.test("parallel and reordered Stripe deliveries issue one live credit", async () => {
      const order = await reserve(), session = snapshot(order);
      await Promise.all([
        stripeStore.settle(session, "evt_live", "checkout.session.completed"),
        stripeStore.settle(session, "evt_live", "checkout.session.completed"),
        stripeStore.settle(session, "evt_async", "checkout.session.async_payment_succeeded"),
      ]);
      const [[wallet]] = await db.execute("SELECT balance FROM wallets WHERE user_id=?", [id]); assert.equal(Number(wallet.balance), 600);
      const [[ledger]] = await db.execute("SELECT COUNT(*) n FROM star_transactions WHERE user_id=?", [id]); assert.equal(Number(ledger.n), 1);
      assert.equal((await stripeStore.read(order.id, id)).status, "paid");
      assert.equal(await stripeStore.read(order.id, randomUUID()), null);
      const [[notice]] = await db.query("SELECT COUNT(*) n,MAX(stars_amount) stars,MAX(minecraft_username) username FROM purchase_announcements");
      assert.equal(Number(notice.n), 1); assert.equal(Number(notice.stars), 500); assert.equal(notice.username, "Dresseur");
    });
    await t.test("test payments leave the real balance and revenue untouched", async () => {
      const order = await reserve("test"); await stripeStore.settle(snapshot(order), "evt_test", "checkout.session.completed");
      const [[wallet]] = await db.execute("SELECT balance FROM wallets WHERE user_id=?", [id]); assert.equal(Number(wallet.balance), 600);
      const [[paid]] = await db.query("SELECT COUNT(*) n FROM orders WHERE status='paid'"); assert.equal(Number(paid.n), 1);
      assert.equal((await stripeStore.read(order.id, id)).status, "test_paid");
      const [[notice]] = await db.query("SELECT COUNT(*) n FROM purchase_announcements"); assert.equal(Number(notice.n), 1);
    });
    await t.test("announcement leases isolate servers, tolerate lost responses and cannot replay a delivery", async () => {
      assert.equal(await announcementStore.claim("another-server"), null);
      const claimed = await Promise.all([announcementStore.claim("main"), announcementStore.claim("main")]);
      assert.equal(claimed.filter(Boolean).length, 1);
      const first = claimed.find(Boolean);
      assert.equal(first.minecraftUuid, uuid); assert.equal(first.minecraftUsername, "Dresseur"); assert.equal(first.stars, 500);
      assert.equal(await announcementStore.complete("other", first.id, first.leaseToken), false);
      assert.equal(await announcementStore.complete("main", first.id, "wrong-token"), false);
      await db.execute("UPDATE purchase_announcements SET lease_expires_at=UTC_TIMESTAMP()-INTERVAL 1 MINUTE WHERE order_id=?", [first.id]);
      const retry = await announcementStore.claim("main"); assert.equal(retry.id, first.id); assert.notEqual(retry.leaseToken, first.leaseToken);
      assert.equal(await announcementStore.complete("main", first.id, first.leaseToken), false);
      assert.equal(await announcementStore.complete("main", retry.id, retry.leaseToken), true);
      assert.equal(await announcementStore.complete("main", retry.id, retry.leaseToken), true);
      assert.equal(await announcementStore.claim("main"), null);
      // Even an erroneous queue row cannot publicize an unpaid checkout.
      const pending = await reserve();
      await db.execute("INSERT INTO purchase_announcements(order_id,minecraft_uuid,stars_amount) VALUES(?,?,500)", [pending.id, uuid]);
      assert.equal(await announcementStore.claim("main"), null);
    });
    await t.test("a failure after the wallet update rolls everything back and can be retried", async () => {
      const order = await reserve(), session = snapshot(order);
      pool.getConnection = async () => {
        const connection = await db.getConnection();
        return { beginTransaction: connection.beginTransaction.bind(connection), commit: connection.commit.bind(connection),
          rollback: connection.rollback.bind(connection), release: connection.release.bind(connection),
          execute: async (sql, values) => {
            if (sql.startsWith("UPDATE orders SET status")) throw Error("forced rollback after credit");
            return connection.execute(sql, values);
          } };
      };
      await assert.rejects(stripeStore.settle(session, "evt_retry", "checkout.session.completed"), /forced rollback/);
      pool.getConnection = db.getConnection.bind(db);
      const [[wallet]] = await db.execute("SELECT balance FROM wallets WHERE user_id=?", [id]); assert.equal(Number(wallet.balance), 600);
      const [[events]] = await db.execute("SELECT COUNT(*) n FROM stripe_webhook_events WHERE event_id='evt_retry'"); assert.equal(Number(events.n), 0);
      const [[notice]] = await db.execute("SELECT COUNT(*) n FROM purchase_announcements WHERE order_id=?", [order.id]); assert.equal(Number(notice.n), 0);
      assert.equal((await stripeStore.read(order.id, id)).status, "pending");
      await stripeStore.settle(session, "evt_retry", "checkout.session.completed");
      const [[credited]] = await db.execute("SELECT balance FROM wallets WHERE user_id=?", [id]); assert.equal(Number(credited.balance), 1100);
    });
  } finally {
    pool.execute = original.execute; pool.getConnection = original.getConnection;
    if (db) await db.end();
    if (created && /^cs_stripe_test_[a-f0-9]{12}$/.test(database)) await admin.query(`DROP DATABASE \`${database}\``);
    await admin.end();
  }
});
