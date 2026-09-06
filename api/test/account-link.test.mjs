import test from "node:test";
import assert from "node:assert/strict";
import { accountIdentity, planLink, confirmPlayerLink } from "../dist/account-link.js";

const uuid = "a".repeat(32);
const otherUuid = "b".repeat(32);
const source = (extra = {}) => ({ id: "source", minecraft_uuid: null, merged_into: null, discord_id: "727592760982372381", discord_username: "Owner", discord_email: "new@example.test", discord_global_name: null, discord_avatar: null, discord_guild_joined_at: null, ...extra });
const target = (extra = {}) => source({ id: "target", minecraft_uuid: uuid, discord_id: null, ...extra });

test("UUID is the canonical public identity, not the email or Discord name", () => {
  assert.deepEqual(accountIdentity(source()), { kind: "provisional", id: "source" });
  assert.deepEqual(accountIdentity(target()), { kind: "minecraft", id: uuid });
});
test("first link and same-UUID refresh do not require recovery mode", () => {
  assert.equal(planLink(source(), undefined, false, false).mergeProvisional, false);
  const player = source({ minecraft_uuid: uuid });
  assert.equal(planLink(player, player, false, false).switchingPlayer, false);
});
test("existing UUID recovery requires BOTH operator enablement and explicit consent", () => {
  assert.throws(() => planLink(source(), target(), true, false), /RELINK_DISABLED/);
  assert.throws(() => planLink(source(), target(), false, true), /RELINK_CONFIRMATION_REQUIRED/);
  assert.equal(planLink(source(), target(), true, true).mergeProvisional, true);
});
test("switching distinct Minecraft players never merges their data", () => {
  const player = source({ minecraft_uuid: otherUuid });
  assert.equal(planLink(player, target(), true, true).mergeProvisional, false);
  assert.equal(planLink(player, undefined, true, true).switchingPlayer, true);
  assert.throws(() => planLink(player, undefined, false, true), /RELINK_CONFIRMATION_REQUIRED/);
});
test("displaced Discord is recognized; anonymous and archived donors are rejected", () => {
  assert.equal(planLink(source(), target({ discord_id: "222222222222222222" }), true, true).replacingDiscord, true);
  assert.throws(() => planLink(source({ discord_id: null }), target(), true, true), /AUTH_REQUIRED/);
  assert.throws(() => planLink(source({ merged_into: "target" }), target(), true, true), /AUTH_REQUIRED/);
});

// SQL interaction checks, not a substitute for the MySQL integration suite.
function connectionFixture({ accounts = [source(), target()], balances = ["17", "31"], code = {}, session = true, failAt } = {}) {
  const calls = [];
  return { calls, async execute(sql, args) {
    calls.push({ sql, args });
    if (failAt && sql.includes(failAt)) throw new Error("simulated database failure");
    if (sql.startsWith("SELECT * FROM link_codes")) return [[{ id: "code", user_id: "source", issuer_discord_id: source().discord_id, session_token_hash: "session", allow_relink: 1, ...code }]];
    if (sql.startsWith("SELECT * FROM users")) return [accounts];
    if (sql.startsWith("SELECT token_hash FROM sessions")) return [session ? [{ token_hash: "session" }] : []];
    if (sql.startsWith("SELECT user_id,CAST")) return [[{ user_id: "source", balance: balances[0] }, { user_id: "target", balance: balances[1] }]];
    return [{ affectedRows: 1 }];
  }};
}
const input = { codeHash: "hash", uuid, username: "LhShiroe", relinkEnabled: true };
test("recovery sums balances exactly, preserves all business records and evicts other sessions", async () => {
  const db = connectionFixture({ balances: ["9007199254740993", "31"] });
  assert.equal((await confirmPlayerLink(db, input)).minecraft.uuid, uuid);
  for (const table of ["star_transactions", "orders", "vote_claims", "shop_purchases", "reward_deliveries"]) {
    assert.ok(db.calls.some(c => c.sql === `UPDATE ${table} SET user_id=? WHERE user_id=?` && c.args[0] === "target" && c.args[1] === "source"));
  }
  assert.ok(db.calls.some(c => c.sql.startsWith("UPDATE wallets SET balance=balance+") && c.args[0] === "9007199254740993"));
  assert.ok(db.calls.some(c => c.sql.startsWith("DELETE FROM sessions") && c.args[2] === "session"));
  assert.ok(db.calls.some(c => c.sql.startsWith("UPDATE sessions SET user_id") && c.args[0] === "target"));
  assert.ok(db.calls.some(c => c.sql.startsWith("INSERT INTO account_link_events") && c.args[8] === "9007199254740993"));
  assert.ok(!db.calls.some(c => /DELETE FROM users|UPDATE wiki_|UPDATE news_|reward_status=|status='pending'/.test(c.sql)));
});
test("different UUIDs keep their wallets and purchase records in place", async () => {
  const db = connectionFixture({ accounts: [source({ minecraft_uuid: otherUuid }), target()] });
  await confirmPlayerLink(db, input);
  assert.ok(!db.calls.some(c => c.sql.startsWith("UPDATE wallets") || c.sql.startsWith("UPDATE shop_purchases") || c.sql.includes("SET merged_into=")));
});
test("expired sessions, replaced Discord identities and pre-migration codes cannot recover accounts", async () => {
  for (const fixture of [{ session: false }, { code: { issuer_discord_id: null } }, { code: { issuer_discord_id: "222222222222222222" } }]) {
    const db = connectionFixture(fixture);
    await assert.rejects(confirmPlayerLink(db, input), /INVALID_OR_EXPIRED_CODE/);
    assert.ok(!db.calls.some(c => /^(UPDATE|INSERT|DELETE)/.test(c.sql)));
  }
});
test("overflow is rejected before balance writes", async () => {
  const db = connectionFixture({ balances: ["18446744073709551615", "1"] });
  await assert.rejects(confirmPlayerLink(db, input), /WALLET_OVERFLOW/);
  assert.ok(!db.calls.some(c => c.sql.startsWith("UPDATE wallets")));
});

Object.assign(process.env, {
  NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test",
  DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test",
  COOKIE_SECRET: "test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY: "test-only-server-secret-never-used-in-production", MINECRAFT_RELINK_ENABLED: "true",
});
const { default: Fastify } = await import("fastify");
const { registerAccountLink } = await import("../dist/account-link-routes.js");
const { pool } = await import("../dist/db.js");
test("HTTP guards reject anonymous users, CSRF, forged UUIDs and missing server keys before database access", async () => {
  const app = Fastify();
  registerAccountLink(app, {
    session: async r => r.headers["x-test-user"] ? source() : null,
    sessionHash: () => "hash", server: r => r.headers.authorization === "Bearer isolated-test",
  });
  const original = pool.execute;
  const getConnection = pool.getConnection;
  pool.execute = pool.getConnection = async () => { throw new Error("Unexpected database access"); };
  try {
    assert.equal((await app.inject({ method: "POST", url: "/api/link/code" })).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: "/api/link/code", headers: { "x-test-user": "1", origin: "https://evil.test" } })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: "/api/link/code", headers: { "x-test-user": "1", origin: "https://example.test" }, payload: { uuid } })).statusCode, 400);
    assert.equal((await app.inject({ method: "POST", url: "/api/internal/link/confirm", payload: input })).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: "/api/internal/link/confirm", headers: { authorization: "Bearer isolated-test" }, payload: { code: "CS-ABCDE-FGHJK", uuid: "not-an-uuid", username: "LhShiroe" } })).statusCode, 400);
    assert.equal((await app.inject({ url: "/api/link/status" })).statusCode, 401);
  } finally { pool.execute = original; pool.getConnection = getConnection; await app.close(); }
});
