import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
Object.assign(process.env, {
  NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test",
  DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test",
  COOKIE_SECRET: "test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY: "test-only-server-secret-never-used-in-production",
});
const { stripeStore } = await import("../dist/stripe-store.js");
const { pool } = await import("../dist/db.js");
const { starPacks } = await import("../dist/star-packs.js");
test.after(() => pool.end());
const uuid = "a".repeat(32);

// Runs the actual SQL store and transaction helper against a transactional DB double.
// No production connection, migration, Stripe API or genuine money is used.
async function withDatabase(work) {
  const saved = { execute: pool.execute, getConnection: pool.getConnection };
  let data = { orders: {}, checkouts: {}, events: {}, transactions: {}, announcements: {}, balance: 100, sessionValid: true, ownerUuid: uuid, merged: null };
  const state = { failAfterWallet: false, failAnnouncement: false, queries: [], get data() { return data; } };
  let tail = Promise.resolve();
  const getOrder = id => data.orders[id] && ({ ...data.orders[id], ...data.checkouts[id] });
  async function execute(sql, args = []) {
    const q = sql.replace(/\s+/g, " ").trim(); state.queries.push(q);
    if (q.startsWith("SELECT u.id,u.minecraft_uuid")) return [data.sessionValid ? [{ id: args[0], minecraft_uuid: data.ownerUuid, minecraft_linked_at: new Date() }] : []];
    if (q.startsWith("SELECT user_id FROM orders")) return [[data.orders[args[0]] && { user_id: data.orders[args[0]].userId }].filter(Boolean)];
    if (q.startsWith("SELECT id,minecraft_uuid,merged_into")) return [[{ id: args[0], minecraft_uuid: data.ownerUuid, merged_into: data.merged, minecraft_username: "Dresseur" }]];
    if (q.startsWith("SELECT o.id,")) {
      let order = q.includes("c.request_id=?") ? Object.values(data.checkouts).find(c => c.requestId === args[0]) : data.checkouts[args[0]];
      order = order && getOrder(order.id);
      if (q.includes("o.user_id=?") && order?.userId !== args[1]) order = null;
      return [[order].filter(Boolean)];
    }
    if (q.startsWith("INSERT INTO orders")) {
      data.orders[args[0]] = { id: args[0], userId: args[1], reference: args[2], amountCents: args[3], stars: args[4], status: "pending" };
      return [{ affectedRows: 1 }];
    }
    if (q.startsWith("INSERT INTO stripe_checkouts")) {
      data.checkouts[args[0]] = { id: args[0], requestId: args[1], packId: args[2], minecraftUuid: args[3], mode: args[4],
        currency: "eur", expiresAt: Date.parse(args[5].replace(" ", "T") + "Z"), url: null };
      return [{ affectedRows: 1 }];
    }
    if (q.startsWith("SELECT provider_reference")) return [[{ provider_reference: data.orders[args[0]].reference }]];
    if (q.startsWith("UPDATE orders SET provider_reference")) { data.orders[args[1]].reference = args[0]; return [{ affectedRows: 1 }]; }
    if (q.startsWith("UPDATE stripe_checkouts SET checkout_url")) { data.checkouts[args[1]].url = args[0]; return [{ affectedRows: 1 }]; }
    if (q.startsWith("SELECT event_id")) return [[data.events[args[0]]].filter(Boolean)];
    if (q.startsWith("INSERT IGNORE INTO wallets")) return [{ affectedRows: 0 }];
    if (q.startsWith("SELECT CAST(balance")) return [[{ balance: String(data.balance) }]];
    if (q.startsWith("INSERT INTO star_transactions")) {
      assert.equal(data.transactions[args[3]], undefined, "ledger references must be unique");
      data.transactions[args[3]] = { userId: args[1], delta: args[2] }; return [{ affectedRows: 1 }];
    }
    if (q.startsWith("UPDATE wallets SET balance=balance+")) { data.balance += args[0]; return [{ affectedRows: 1 }]; }
    if (q.startsWith("INSERT INTO purchase_announcements")) {
      if (state.failAnnouncement) throw Error("simulated announcement queue failure");
      assert.equal(data.announcements[args[0]], undefined);
      data.announcements[args[0]] = { id: args[0], uuid: args[1], username: args[2], stars: args[3] };
      return [{ affectedRows: 1 }];
    }
    if (q.startsWith("UPDATE orders SET status")) {
      if (state.failAfterWallet) throw Error("simulated DB failure after wallet write");
      Object.assign(data.orders[args[2]], { status: args[0], reference: args[1] }); return [{ affectedRows: 1 }];
    }
    if (q.startsWith("UPDATE stripe_checkouts SET payment_intent_id")) { data.checkouts[args[1]].paymentIntent = args[0]; return [{ affectedRows: 1 }]; }
    if (q.startsWith("INSERT INTO stripe_webhook_events")) {
      assert.equal(data.events[args[0]], undefined); data.events[args[0]] = { id: args[0] }; return [{ affectedRows: 1 }];
    }
    throw Error("Unhandled payment SQL: " + q);
  }
  pool.execute = execute;
  pool.getConnection = async () => {
    let snapshot, unlock;
    return { execute,
      async beginTransaction() { const before = tail; tail = new Promise(resolve => { unlock = resolve; }); await before; snapshot = structuredClone(data); },
      async commit() {}, async rollback() { data = snapshot; }, release() { unlock(); },
    };
  };
  const makeOrder = (mode = "live", requestId = randomUUID()) => stripeStore.reserve("player", "current-session-hash", requestId, starPacks[0], mode);
  const payment = order => ({ id: `cs_${order.mode}_sample`, orderId: order.id, packId: order.packId, mode: order.mode,
    currency: "eur", total: 499, subtotal: 499, paymentIntent: "pi_sample", paid: true, complete: true, expired: false,
    lineCount: 1, lineQuantity: 1, lineTotal: 499, lineCurrency: "eur", clientReference: order.id });
  try { await work({ state, makeOrder, payment }); }
  finally { pool.execute = saved.execute; pool.getConnection = saved.getConnection; }
}

test("reserve preserves the original price and rejects request reuse, revoked sessions and changed owners", () => withDatabase(async ({ state, makeOrder }) => {
  const id = randomUUID(), order = await makeOrder("live", id);
  assert.equal((await makeOrder("live", id)).id, order.id);
  assert.equal(Object.keys(state.data.orders).length, 1);
  await assert.rejects(stripeStore.reserve("another-player", "session", id, starPacks[0], "live"), { code: "CHECKOUT_REQUEST_CONFLICT" });
  await assert.rejects(stripeStore.reserve("player", "session", id, starPacks[1], "live"), { code: "CHECKOUT_REQUEST_CONFLICT" });
  state.data.sessionValid = false;
  await assert.rejects(makeOrder(), { code: "AUTH_REQUIRED" });
  assert.equal(state.data.balance, 100);
}));
test("a paid live order, concurrent duplicates and different event types grant exactly one credit", () => withDatabase(async ({ state, makeOrder, payment }) => {
  const order = await makeOrder(), session = payment(order);
  const results = await Promise.all([
    stripeStore.settle(session, "evt_completed", "checkout.session.completed"),
    stripeStore.settle(session, "evt_completed", "checkout.session.completed"),
    stripeStore.settle(session, "evt_async", "checkout.session.async_payment_succeeded"),
  ]);
  assert.equal(results.filter(r => !r.duplicate).length, 1);
  assert.equal(state.data.balance, 600); assert.equal(Object.keys(state.data.transactions).length, 1);
  assert.equal(state.data.orders[order.id].status, "paid"); assert.equal(Object.keys(state.data.events).length, 2);
  assert.deepEqual(Object.values(state.data.announcements), [{ id: order.id, uuid, username: "Dresseur", stars: 500 }]);
  // A delayed expired event must not undo a paid order or its balance.
  await stripeStore.settle({ ...session, paid: false, expired: true }, "evt_expired", "checkout.session.expired");
  assert.equal(state.data.orders[order.id].status, "paid"); assert.equal(state.data.balance, 600);
}));
test("test payments are recorded but never issue Stars or create a money ledger entry", () => withDatabase(async ({ state, makeOrder, payment }) => {
  const order = await makeOrder("test");
  assert.equal((await stripeStore.settle(payment(order), "evt_test", "checkout.session.completed")).status, "test_paid");
  assert.equal(state.data.balance, 100); assert.equal(Object.keys(state.data.transactions).length, 0);
  assert.equal(Object.keys(state.data.announcements).length, 0);
  assert.equal(state.queries.some(q => q.startsWith("UPDATE wallets")), false);
}));
test("wrong amount, currency, quantity, pack, mode and ownership cannot credit a wallet", () => withDatabase(async ({ state, makeOrder, payment }) => {
  const order = await makeOrder(), session = payment(order);
  for (const mutation of [{ total: 1 }, { subtotal: 1 }, { currency: "usd" }, { lineQuantity: 2 },
    { lineCount: 2 }, { lineTotal: 1 }, { packId: "stars_6500" }, { mode: "test" }, { clientReference: randomUUID() },
    { id: "cs_live_different" }]) {
    if (mutation.id) await stripeStore.attach(order, { id: session.id, url: "https://checkout.stripe.com/c/pay/sample" });
    await assert.rejects(stripeStore.settle({ ...session, ...mutation }, "evt_bad", "checkout.session.completed"), { code: "PAYMENT_REVIEW_REQUIRED" });
  }
  state.data.ownerUuid = "b".repeat(32);
  await assert.rejects(stripeStore.settle(session, "evt_owner", "checkout.session.completed"), { code: "PAYMENT_OWNER_REVIEW_REQUIRED" });
  assert.equal(state.data.balance, 100); assert.equal(Object.keys(state.data.events).length, 0);
}));
test("unpaid/expired sessions stay uncredited; only an authoritative paid event can fulfill later", () => withDatabase(async ({ state, makeOrder, payment }) => {
  const order = await makeOrder(), session = payment(order);
  await stripeStore.settle({ ...session, paid: false, complete: false }, "evt_unpaid", "checkout.session.completed");
  assert.equal(state.data.orders[order.id].status, "pending"); assert.equal(state.data.balance, 100);
  await stripeStore.settle({ ...session, paid: false, complete: false, expired: true }, "evt_expired", "checkout.session.expired");
  assert.equal(state.data.orders[order.id].status, "expired"); assert.equal(state.data.balance, 100);
  assert.equal(Object.keys(state.data.announcements).length, 0);
  await stripeStore.settle(session, "evt_paid_later", "checkout.session.async_payment_succeeded");
  assert.equal(state.data.orders[order.id].status, "paid"); assert.equal(state.data.balance, 600);
}));
test("wallet, ledger, order and webhook receipt roll back together, and retry can then succeed", () => withDatabase(async ({ state, makeOrder, payment }) => {
  const order = await makeOrder(), session = payment(order);
  state.failAfterWallet = true;
  await assert.rejects(stripeStore.settle(session, "evt_retry", "checkout.session.completed"));
  assert.equal(state.data.balance, 100); assert.equal(state.data.orders[order.id].status, "pending");
  assert.equal(Object.keys(state.data.transactions).length, 0); assert.equal(Object.keys(state.data.events).length, 0);
  assert.equal(Object.keys(state.data.announcements).length, 0);
  state.failAfterWallet = false;
  await stripeStore.settle(session, "evt_retry", "checkout.session.completed");
  assert.equal(state.data.balance, 600); assert.equal(Object.keys(state.data.transactions).length, 1);
}));
test("an announcement queue failure rolls back the credit and retries once with the same order", () => withDatabase(async ({ state, makeOrder, payment }) => {
  const order = await makeOrder(), session = payment(order);
  state.failAnnouncement = true;
  await assert.rejects(stripeStore.settle(session, "evt_queue", "checkout.session.completed"));
  assert.equal(state.data.balance, 100);
  assert.equal(Object.keys(state.data.announcements).length, 0);
  assert.equal(Object.keys(state.data.transactions).length, 0);
  state.failAnnouncement = false;
  await stripeStore.settle(session, "evt_queue", "checkout.session.completed");
  await stripeStore.settle(session, "evt_queue", "checkout.session.completed");
  assert.equal(state.data.balance, 600);
  assert.equal(Object.keys(state.data.announcements).length, 1);
}));
