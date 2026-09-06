import test from "node:test";
import assert from "node:assert/strict";
import { actionInput, prepareAction } from "../dist/game-admin-schema.js";

// No secrets or live database: these values exist only for isolated authorization tests.
Object.assign(process.env, {
  NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test",
  DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test",
  COOKIE_SECRET: "test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY: "test-only-server-secret-never-used-in-production",
  GAME_ADMIN_DISCORD_IDS: "111111111111111111", GAME_ADMIN_READ_DISCORD_IDS: "222222222222222222",
});
const { default: Fastify } = await import("fastify");
const { registerGameAdmin, canReadGame, canWriteGame } = await import("../dist/game-admin.js");
const { pool } = await import("../dist/db.js");
const actor = (id) => ({ id: "00000000-0000-4000-8000-000000000001", discord_id: id });
const fixture = {
  capabilities: ["xp_level", "health", "food", "inventory_count", "pokemon_level", "cosmetic_unlock", "cosmetics_disable"],
  xpLevel: 12, health: 18, maxHealth: 20, food: 15,
  inventory: [{ slot: 0, count: 7, maxCount: 64, fingerprint: "a".repeat(64) }], enderChest: [],
  pokemon: [{ uuid: "00000000-0000-4000-8000-000000000002", level: 42 }], cosmeticIds: ["asteria_aura"],
};

test("dedicated roles fail closed, including accounts without Discord", () => {
  assert.equal(canReadGame(actor(null)), false);
  assert.equal(canWriteGame(actor("333333333333333333")), false);
  assert.equal(canReadGame(actor("222222222222222222")), true);
  assert.equal(canWriteGame(actor("222222222222222222")), false);
  assert.equal(canWriteGame(actor("111111111111111111")), true);
});
test("no free console command, forged expected values or unbounded mutation", () => {
  for (const input of [{ kind: "command", value: "op intruder" }, { kind: "xp_level", value: -1 }, { kind: "xp_level", value: 1001 }, { kind: "pokemon_level", pokemonUuid: fixture.pokemon[0].uuid, value: 101 }, { kind: "health", value: 0 }, { kind: "food", value: 21 }, { kind: "food", value: 2, expected: 99 }]) assert.equal(actionInput.safeParse(input).success, false);
});
test("expected scalar values come from server snapshot", () => {
  assert.deepEqual(prepareAction(fixture, { kind: "xp_level", value: 20 }), { kind: "xp_level", value: 20, expected: 12 });
  assert.throws(() => prepareAction(fixture, { kind: "health", value: 21 }), /HEALTH_TOO_HIGH/);
});
test("inventory uses exact fingerprint, honors max stack and rejects absent slots", () => {
  assert.equal(prepareAction(fixture, { kind: "inventory_count", storage: "inventory", slot: 0, value: 0 }).expected, "a".repeat(64));
  assert.throws(() => prepareAction(fixture, { kind: "inventory_count", storage: "inventory", slot: 0, value: 65 }), /INVALID_ITEM_COUNT/);
  assert.throws(() => prepareAction(fixture, { kind: "inventory_count", storage: "enderChest", slot: 0, value: 1 }), /INVALID_ITEM_COUNT/);
});
test("Pokemon target and cosmetic are resolved against observed collection", () => {
  assert.equal(prepareAction(fixture, { kind: "pokemon_level", pokemonUuid: fixture.pokemon[0].uuid, value: 50 }).expected, 42);
  assert.throws(() => prepareAction(fixture, { kind: "pokemon_level", pokemonUuid: "00000000-0000-4000-8000-000000000099", value: 50 }), /POKEMON_NOT_FOUND/);
  assert.throws(() => prepareAction(fixture, { kind: "cosmetic_unlock", cosmeticId: "nonexistent" }), /UNKNOWN_COSMETIC/);
  assert.throws(() => prepareAction({ ...fixture, capabilities: [] }, { kind: "food", value: 10 }), /UNSUPPORTED_ACTION/);
});

test("HTTP endpoints enforce authentication and CSRF before touching the database", async () => {
  const app = Fastify();
  registerGameAdmin(app, {
    session: async (request) => request.headers["x-test-actor"] ? actor(request.headers["x-test-actor"]) : null,
    server: (request) => request.headers.authorization === "Bearer isolated-test",
  });
  const original = pool.execute;
  pool.execute = async () => { throw new Error("Unexpected database access in a denied request"); };
  try {
    const uuid = "a".repeat(32);
    for (const url of ["/api/admin/game/players", `/api/admin/game/players/${uuid}`]) {
      assert.equal((await app.inject({ url })).statusCode, 401);
      assert.equal((await app.inject({ url, headers: { "x-test-actor": "333333333333333333" } })).statusCode, 403);
    }
    assert.equal((await app.inject({ method: "POST", url: `/api/admin/game/players/${uuid}/actions`, headers: { "x-test-actor": "222222222222222222", origin: "https://example.test" }, payload: {} })).statusCode, 403);
    for (const origin of [undefined, "https://attacker.test"]) {
      const headers = { "x-test-actor": "111111111111111111" }; if (origin) headers.origin = origin;
      assert.equal((await app.inject({ method: "POST", url: `/api/admin/game/players/${uuid}/actions`, headers, payload: {} })).statusCode, 403);
    }
    for (const route of ["sync", "claim", "result"]) assert.equal((await app.inject({ method: "POST", url: `/api/internal/admin/${route}`, payload: {} })).statusCode, 401);
    assert.equal((await app.inject({ url: "/api/internal/admin/status" })).statusCode, 401);
  } finally { pool.execute = original; await app.close(); }
});

test("queue lifecycle with a DB double: stale field, idempotency, single delivery, authenticated receipt", async () => {
  // This exercises route logic, not MySQL syntax/locking. A live migration test is still required.
  const uuid = "a".repeat(32), requestId = "00000000-0000-4000-8000-000000000003";
  const snapshot = { ...fixture, schemaVersion: 1, sessionStartedAt: Date.now(), xpProgress: 0, dimension: "minecraft:overworld", x: 0, y: 80, z: 0, gameMode: "survival", inventory: [], enderChest: [], pokemon: [], pokemonTruncated: false, statistics: {}, academy: {}, quests: {} };
  const player = { uuid, server_id: "main", online: true, age_seconds: 1, observed_at: Date.now(), snapshot_id: "00000000-0000-4000-8000-000000000099", snapshot_json: JSON.stringify(snapshot) };
  const actions = new Map();
  const execute = async (sql, values = []) => {
    if (sql.startsWith("UPDATE game_admin_actions SET status=IF")) return [{}];
    if (sql.startsWith("SELECT *,TIMESTAMPDIFF")) return [[player]];
    if (sql.startsWith("SELECT id,uuid,actor_id,status")) return [[...actions.values()].filter((a) => a.id === values[0])];
    if (sql.startsWith("SELECT id FROM game_admin_actions")) return [[...actions.values()].filter((a) => a.uuid === values[0] && ["queued", "dispatched"].includes(a.status))];
    if (sql.startsWith("INSERT INTO game_admin_actions")) { actions.set(values[0], { id: values[0], uuid: values[1], server_id: values[2], actor_id: values[3], payload_json: values[6], status: "queued", expires: Date.now() + 120000 }); return [{}]; }
    if (sql.startsWith("SELECT id,payload_json")) return [[...actions.values()].filter((a) => a.uuid === values[0] && a.server_id === values[1] && a.status === "queued")];
    if (sql.startsWith("UPDATE game_admin_actions SET status='dispatched'")) { actions.get(values[0]).status = "dispatched"; return [{}]; }
    if (sql.startsWith("SELECT status FROM game_admin_actions")) return [[...actions.values()].filter((a) => a.id === values[0] && a.uuid === values[1] && a.server_id === values[2])];
    if (sql.startsWith("UPDATE game_admin_actions SET status=?")) { const a = actions.get(values[2]); if (["dispatched", "unknown"].includes(a.status)) a.status = values[0]; return [{}]; }
    throw new Error(`Unexpected SQL in test double: ${sql}`);
  };
  const oldExecute = pool.execute, oldConnection = pool.getConnection;
  pool.execute = execute;
  pool.getConnection = async () => ({ execute, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {} });
  const app = Fastify();
  registerGameAdmin(app, { session: async () => actor("111111111111111111"), server: (request) => request.headers.authorization === "Bearer isolated-test" });
  const enqueue = (overrides = {}) => app.inject({ method: "POST", url: `/api/admin/game/players/${uuid}/actions`, headers: { origin: "https://example.test" }, payload: { requestId, snapshotId: "00000000-0000-4000-8000-000000000001", expected: 12, reason: "Test route without real game", action: { kind: "xp_level", value: 20 }, ...overrides } });
  const internal = (route, payload) => app.inject({ method: "POST", url: `/api/internal/admin/${route}`, headers: { authorization: "Bearer isolated-test" }, payload });
  try {
    player.online = false; assert.equal((await enqueue()).json().error, "PLAYER_OFFLINE_OR_STALE"); player.online = true;
    assert.equal((await enqueue({ expected: 3 })).json().error, "SNAPSHOT_CHANGED");
    assert.equal((await enqueue()).statusCode, 202); // An unrelated new snapshot does not invalidate an unchanged XP level.
    assert.equal((await enqueue()).statusCode, 202); assert.equal(actions.size, 1);
    assert.equal((await enqueue({ requestId: "00000000-0000-4000-8000-000000000004" })).json().error, "ACTION_ALREADY_PENDING");
    assert.equal((await internal("claim", { uuid, serverId: "another" })).json().action, null);
    assert.equal((await internal("claim", { uuid, serverId: "main" })).json().action.id, requestId);
    assert.equal((await internal("claim", { uuid, serverId: "main" })).json().action, null);
    const receipt = { id: requestId, uuid, serverId: "main", status: "applied", result: { message: "Test receipt only", before: 12, after: 20 } };
    assert.equal((await internal("result", { ...receipt, uuid: "b".repeat(32) })).statusCode, 404);
    assert.equal((await internal("result", receipt)).statusCode, 200);
    assert.equal((await internal("result", receipt)).statusCode, 200);
    assert.equal(actions.get(requestId).status, "applied");
  } finally { pool.execute = oldExecute; pool.getConnection = oldConnection; await app.close(); await pool.end(); }
});
