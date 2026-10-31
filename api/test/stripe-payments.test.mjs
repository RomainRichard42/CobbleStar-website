import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import Stripe from "stripe";

Object.assign(process.env, {
  NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test",
  DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test",
  COOKIE_SECRET: "test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY: "test-only-server-secret-never-used-in-production",
});
const { registerStripePayments, stripeConfigurationValid, checkoutAddressValid } = await import("../dist/stripe-payments.js");
const { PaymentError } = await import("../dist/stripe-store.js");
const { pool } = await import("../dist/db.js");
test.after(() => pool.end());
const webhookSecret = "whsec_test_only_signature_secret_not_a_real_key";
const dummyKey = mode => ["sk", mode, "x".repeat(24)].join("_");
const signatureSdk = new Stripe(dummyKey("test"));
const settings = { enabled: true, mode: "live", secretKey: dummyKey("live"),
  webhookSecret, siteOrigin: "https://example.test", testerIds: ["staff"], legacyTestPurchases: false };
const player = { id: "player", discord_id: "player", minecraft_uuid: "a".repeat(32), minecraft_linked_at: new Date() };

async function fixture(overrides = {}) {
  const state = { user: player, orders: new Map(), requests: new Map(), created: [], retrieved: [], settled: [], transientFailure: false, settleFailure: false, badUrl: false };
  const store = {
    async reserve(userId, sessionHash, requestId, pack, mode) {
      const previous = state.requests.get(requestId);
      if (previous) {
        if (previous.packId !== pack.id || previous.userId !== userId) throw new PaymentError("CHECKOUT_REQUEST_CONFLICT");
        return previous;
      }
      const order = { id: randomUUID(), userId, packId: pack.id, minecraftUuid: state.user.minecraft_uuid,
        reference: "pending", amountCents: pack.amountCents, stars: pack.stars, currency: "eur", mode,
        status: "pending", url: null, expiresAt: Math.floor(Date.now() / 1000) * 1000 + 3600_000 };
      assert.equal(sessionHash, "session-hash");
      state.orders.set(order.id, order); state.requests.set(requestId, order); return order;
    },
    async attach(order, session) { Object.assign(order, { reference: session.id, url: session.url }); },
    async read(id, userId) { const order = state.orders.get(id); return order?.userId === userId ? order : null; },
    async settle(session, eventId, eventType) {
      if (state.settleFailure) throw Error("database temporarily unavailable");
      state.settled.push({ session, eventId, eventType }); return { status: "pending", duplicate: false };
    },
  };
  const effective = { ...settings, ...overrides };
  const session = { id: `cs_${effective.mode}_sample`, object: "checkout.session", livemode: effective.mode === "live",
    metadata: {}, client_reference_id: null, mode: "payment", amount_total: 499, amount_subtotal: 499,
    currency: "eur", payment_intent: "pi_sample", payment_status: "paid", status: "complete",
    line_items: { data: [{ quantity: 1, amount_total: 499, currency: "eur" }], has_more: false } };
  const stripe = { webhooks: signatureSdk.webhooks, checkout: { sessions: {
    async create(body, options) {
      state.created.push({ body: structuredClone(body), options });
      Object.assign(session, { metadata: body.metadata, client_reference_id: body.client_reference_id });
      if (state.transientFailure) { state.transientFailure = false; throw Error("network timeout after Stripe accepted request"); }
      return { ...session, url: state.badUrl ? "https://evil.test/checkout" : `https://checkout.stripe.com/c/pay/${session.id}` };
    },
    async retrieve(id, options) { state.retrieved.push({ id, options }); return structuredClone(session); },
  } } };
  const app = Fastify({ logger: false });
  registerStripePayments(app, effective, { store, stripe, session: async () => state.user,
    sessionHash: () => state.user ? "session-hash" : null });
  app.post("/ordinary-json", request => ({ body: request.body }));
  await app.ready();
  const checkout = (payload = { packId: "stars_500", requestId: randomUUID() }, headers = {}) => app.inject({
    method: "POST", url: "/api/shop/checkout", headers: { origin: "https://example.test", ...headers }, payload });
  const deliver = async ({ type = "checkout.session.completed", timestamp, corrupt = false, livemode = session.livemode } = {}) => {
    const payload = JSON.stringify({ id: "evt_sample", object: "event", type, livemode, data: { object: session } });
    const signature = signatureSdk.webhooks.generateTestHeaderString({ payload, secret: webhookSecret,
      ...(timestamp ? { timestamp } : {}) });
    return app.inject({ method: "POST", url: "/api/payments/stripe/webhook",
      headers: { "content-type": "application/json", "stripe-signature": signature }, payload: payload + (corrupt ? " " : "") });
  };
  return { app, state, session, checkout, deliver };
}

test("payment configuration fails closed and only allows hosted Stripe URLs", () => {
  assert.equal(stripeConfigurationValid(settings), true);
  for (const change of [{ secretKey: "" }, { webhookSecret: "" }, { mode: "test" }])
    assert.equal(stripeConfigurationValid({ ...settings, ...change }), false);
  assert.equal(checkoutAddressValid("https://checkout.stripe.com/c/pay/cs_test_example"), true);
  for (const url of ["javascript:alert(1)", "http://checkout.stripe.com/", "https://checkout.stripe.com.evil.test/", "https://user@checkout.stripe.com/"])
    assert.equal(checkoutAddressValid(url), false);
});
test("authentication, Minecraft linkage, origin, pack whitelist and server-owned prices", async t => {
  const f = await fixture(); t.after(() => f.app.close());
  assert.equal((await f.checkout(undefined, { origin: "https://evil.test" })).statusCode, 403);
  f.state.user = null; assert.equal((await f.checkout()).statusCode, 401);
  f.state.user = { ...player, minecraft_uuid: null }; assert.equal((await f.checkout()).statusCode, 409);
  f.state.user = player;
  assert.equal((await f.checkout({ packId: "stars_free", requestId: randomUUID() })).statusCode, 400);
  assert.equal((await f.checkout({ packId: "stars_500", requestId: randomUUID(), amountCents: 1, stars: 999999 })).statusCode, 400);
  assert.equal(f.state.created.length, 0);
  const request = { packId: "stars_500", requestId: randomUUID() };
  const first = await f.checkout(request); assert.equal(first.statusCode, 201);
  assert.equal((await f.checkout(request)).json().url, first.json().url);
  assert.equal(f.state.created.length, 1);
  const { body, options } = f.state.created[0];
  assert.equal(body.line_items[0].price_data.unit_amount, 499); assert.equal(body.line_items[0].quantity, 1);
  assert.equal(body.line_items[0].price_data.currency, "eur"); assert.equal(body.mode, "payment");
  assert.deepEqual(body.allowed_payment_method_types, ["card"]);
  assert.equal(options.idempotencyKey, "stars:" + first.json().orderId);
  assert.equal(body.success_url, `https://example.test/boutique/?commande=${first.json().orderId}#stars`);
  assert.equal(JSON.stringify(body).includes(player.minecraft_uuid), false);
  assert.deepEqual((await f.app.inject({ method: "POST", url: "/ordinary-json", payload: { works: true } })).json(), { body: { works: true } });
});
test("a network retry uses exactly the same Stripe request and idempotency key", async t => {
  const f = await fixture(); t.after(() => f.app.close()); f.state.transientFailure = true;
  const request = { packId: "stars_1100", requestId: randomUUID() };
  assert.equal((await f.checkout(request)).statusCode, 503);
  assert.equal((await f.checkout(request)).statusCode, 201);
  assert.deepEqual(f.state.created[0], f.state.created[1]);
});
test("paused checkout cannot start a payment; test checkout is staff-only", async t => {
  const paused = await fixture({ enabled: false }); t.after(() => paused.app.close());
  assert.equal((await paused.checkout()).statusCode, 503); assert.equal(paused.state.created.length, 0);
  const f = await fixture({ mode: "test", secretKey: dummyKey("test") }); t.after(() => f.app.close());
  assert.equal((await f.app.inject("/api/shop/status")).json().checkoutEnabled, false);
  assert.equal((await f.checkout()).statusCode, 503);
  f.state.user = { ...player, discord_id: "staff" };
  assert.equal((await f.app.inject("/api/shop/status")).json().checkoutMode, "test");
  assert.equal((await f.checkout()).statusCode, 201);
});
test("return pages only read the current player's order and never fulfill it", async t => {
  const f = await fixture(); t.after(() => f.app.close()); const result = (await f.checkout()).json();
  assert.equal((await f.app.inject(`/api/shop/orders/${result.orderId}`)).json().status, "pending");
  f.state.user = { ...player, id: "another-player" };
  assert.equal((await f.app.inject(`/api/shop/orders/${result.orderId}`)).statusCode, 404);
  f.state.user = null; assert.equal((await f.app.inject(`/api/shop/orders/${result.orderId}`)).statusCode, 401);
  assert.equal(f.state.settled.length, 0);
});
test("real SDK signature validation rejects modified, stale and wrong-mode webhooks", async t => {
  const f = await fixture(); t.after(() => f.app.close()); await f.checkout();
  assert.equal((await f.deliver({ corrupt: true })).statusCode, 400);
  assert.equal((await f.deliver({ timestamp: Math.floor(Date.now() / 1000) - 1000 })).statusCode, 400);
  assert.equal((await f.deliver({ livemode: false })).statusCode, 400);
  assert.equal(f.state.retrieved.length, 0); assert.equal(f.state.settled.length, 0);
  assert.equal((await f.deliver()).statusCode, 200);
  assert.deepEqual(f.state.retrieved[0].options, { expand: ["line_items"] });
  assert.equal(f.state.settled[0].session.paid, true); assert.equal(f.state.settled[0].session.lineQuantity, 1);
});
test("unpaid and delayed events are reconciled; transient failures remain retryable", async t => {
  const f = await fixture(); t.after(() => f.app.close()); await f.checkout();
  f.session.payment_status = "unpaid";
  assert.equal((await f.deliver()).statusCode, 200); assert.equal(f.state.settled[0].session.paid, false);
  f.state.settleFailure = true; f.session.payment_status = "paid";
  assert.equal((await f.deliver({ type: "checkout.session.async_payment_succeeded" })).statusCode, 503);
  f.state.settleFailure = false;
  assert.equal((await f.deliver({ type: "checkout.session.async_payment_succeeded" })).statusCode, 200);
  const count = f.state.retrieved.length;
  assert.equal((await f.deliver({ type: "payment_intent.created" })).json().ignored, true);
  assert.equal(f.state.retrieved.length, count);
});
test("pausing sales still accepts confirmation of payments already started", async t => {
  const f = await fixture({ enabled: false }); t.after(() => f.app.close());
  f.session.metadata = { product: "cobblestar_stars", order_id: randomUUID(), pack_id: "stars_500" };
  f.session.client_reference_id = f.session.metadata.order_id;
  assert.equal((await f.deliver()).statusCode, 200); assert.equal(f.state.settled.length, 1);
});
