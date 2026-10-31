import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";

Object.assign(process.env, {
  NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test",
  DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test",
  COOKIE_SECRET: "test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY: "test-only-server-secret-never-used-in-production",
});
const { registerPurchaseAnnouncements } = await import("../dist/purchase-announcements.js");
const { pool } = await import("../dist/db.js");
test.after(() => pool.end());

test("only the authenticated game server can claim and acknowledge typed purchase notices", async t => {
  const announcement = { id: randomUUID(), minecraftUuid: "a".repeat(32), minecraftUsername: "Dresseur", stars: 1100, leaseToken: "a".repeat(32) };
  const calls = [], app = Fastify(); t.after(() => app.close());
  registerPurchaseAnnouncements(app, { server: req => req.headers.authorization === "Bearer test-only-game-key", store: {
    async claim(serverId) { calls.push(serverId); return announcement; },
    async complete(serverId, id, token) { return serverId === "main" && id === announcement.id && token === announcement.leaseToken; },
  } });
  const request = (path, payload, auth = true) => app.inject({ method: "POST", url: "/api/internal/stars/announcements/" + path,
    headers: auth ? { authorization: "Bearer test-only-game-key" } : {}, payload });
  assert.equal((await request("claim", { serverId: "main" }, false)).statusCode, 401);
  for (const payload of [{}, { serverId: "../main" }, { serverId: "main", text: "fake purchase" }])
    assert.equal((await request("claim", payload)).statusCode, 400);
  assert.equal(calls.length, 0);
  const result = await request("claim", { serverId: "main" });
  assert.equal(result.statusCode, 200); assert.equal(result.headers["cache-control"], "no-store");
  assert.deepEqual(result.json(), { announcement });
  const path = announcement.id + "/complete", body = { serverId: "main", leaseToken: announcement.leaseToken };
  assert.equal((await request(path, body, false)).statusCode, 401);
  assert.equal((await request("invalid/complete", body)).statusCode, 400);
  assert.equal((await request(path, { ...body, leaseToken: "short" })).statusCode, 400);
  assert.equal((await request(path, { ...body, leaseToken: "b".repeat(32) })).statusCode, 409);
  assert.equal((await request(path, { ...body, serverId: "another-server" })).statusCode, 409);
  assert.equal((await request(path, body)).statusCode, 200);
  assert.equal((await request(path, body)).statusCode, 200);
});

test("an empty purchase queue returns 204 without inventing an announcement", async t => {
  const app = Fastify(); t.after(() => app.close());
  registerPurchaseAnnouncements(app, { server: () => true, store: { async claim() { return null; }, async complete() { return false; } } });
  const result = await app.inject({ method: "POST", url: "/api/internal/stars/announcements/claim", payload: { serverId: "main" } });
  assert.equal(result.statusCode, 204); assert.equal(result.body, "");
});
