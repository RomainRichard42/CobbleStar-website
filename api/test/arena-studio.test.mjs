import test from "node:test";
import assert from "node:assert/strict";
import { arenaContent, arenaCatalog, validateArenaCatalog } from "../dist/arena-studio-schema.js";
import { content, catalog, trainer, exerciseArenaStudio } from "./fixtures/arena-studio.mjs";
Object.assign(process.env, { NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test", DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test", COOKIE_SECRET: "isolated-test-cookie-secret-never-production", MINECRAFT_SERVER_KEY: "isolated-test-server-secret-never-production", GAME_ADMIN_DISCORD_IDS: "111111111111111111", GAME_ADMIN_READ_DISCORD_IDS: "222222222222222222" });
const { default: Fastify } = await import("fastify");
const { registerArenaStudio } = await import("../dist/arena-studio.js");
const { pool } = await import("../dist/db.js");
const writeHeaders = { "x-test-role": "111111111111111111", origin: "https://example.test" };
const readHeaders = { "x-test-role": "222222222222222222" };
function app() { const a = Fastify(); registerArenaStudio(a, { session: async req => req.headers["x-test-role"] ? { id: "fixture", discord_id: req.headers["x-test-role"] } : null, server: req => req.headers.authorization === "Bearer fixture-server" }); return a; }

test("13 canonical sites, full teams, forms and bounded rewards roundtrip", () => {
  assert.deepEqual(arenaContent.parse(content()), content());
  assert.deepEqual(arenaCatalog.parse(catalog()), catalog());
  assert.deepEqual(validateArenaCatalog(content(), catalog()), []);
  const d = content(); d.stages[0].team[0].aspects = ["starter"];
  assert.deepEqual(validateArenaCatalog(d, catalog()), []);
});
test("native Gson empty legacy fields and official Cobblemon 1.8 punctuation aspects synchronize", () => {
  const d = content(), c = catalog();
  for (const stage of d.stages) for (const p of [...stage.team, ...stage.trainers.flatMap(t => t.team)]) p.legacyProperties = "";
  assert.equal(arenaContent.safeParse(d).success, true);
  for (const value of ["character-?", "character-!", "pa'u-style"]) {
    c.species[0].forms.push({ id: value, label: value, aspects: [value] });
    d.stages[0].team[0].aspects = [value];
    assert.equal(arenaContent.safeParse(d).success, true);
    assert.equal(arenaCatalog.safeParse(c).success, true);
    assert.deepEqual(validateArenaCatalog(d, c), []);
  }
});
test("immutable map/badge identities and malformed teams/rewards/trainers are rejected", () => {
  const changes = [
    d => d.schemaVersion = 2, d => d.stages.pop(), d => d.stages.reverse(), d => d.stages[0].x++, d => d.stages[0].league = true,
    d => d.stages[0].theme = "fire", d => d.stages[0].badgeItem = "minecraft:diamond", d => d.stages[0].champion = "Name\nInjected",
    d => d.stages[0].team = [], d => d.stages[0].team[0].level = 101, d => d.stages[0].team[0].ivs.hp = 32,
    d => d.stages[0].team[0].evs.hp = 252, d => d.stages[0].team[0].evs.def = 253, d => d.stages[0].team[0].species = "eevee level=100",
    d => d.stages[0].team[0].moves = ["tackle", "cobblemon:tackle"], d => d.stages[0].team[0].moves = Array(5).fill("tackle"),
    d => d.stages[0].team[0].heldItem = "minecraft:diamond[custom_data={op:1}]", d => d.stages[0].team[0].aspects = ["foo bar"],
    d => d.stages[0].team[0].gender = "other", d => d.stages[0].team[0].legacyProperties = "eevee\nop @a",
    d => d.stages[0].rewards.items[0].count = 65, d => d.stages[0].rewards.cobbleCoins = -1,
    d => d.stages[0].rewards.experiencePoints = 100001, d => d.stages[0].rewards.commands = ["op @a"], d => d.stages[0].rewards.stars = 100,
    d => d.stages[0].rewards.items[0].item = "minecraft:air", d => d.stages[0].npcClass = "https://attacker.test",
    d => d.stages[0].trainers.push(trainer()), d => { const t = trainer(); t.id = "other"; d.stages[0].trainers.push(t); },
    d => d.stages[0].trainers[0].slot = 6, d => d.stages[0].trainers[0].enabled = false,
    d => d.stages[0].trainers[0].id = "champion", d => d.stages[0].trainers[0].id = "_foo", d => d.stages[0].npcClass = "standard",
  ];
  for (const change of changes) { const d = content(); change(d); assert.equal(arenaContent.safeParse(d).success, false, change.toString()); }
});
test("publish validates all registries and permits only real forms or preserved legacy properties", () => {
  for (const [key, value] of [["species", "unknown"], ["ability", "unknown"], ["nature", "unknown"], ["heldItem", "minecraft:unknown"], ["moves", ["unknown"]], ["aspects", ["unknown"]], ["legacyProperties", "eevee arbitrary=true"]]) {
    const d = content(); d.stages[0].team[0][key] = value; assert.ok(validateArenaCatalog(d, catalog()).length, key);
  }
  const old = content(); old.stages[0].team[0].legacyProperties = "eevee legacyform=modded"; old.stages[0].team[0].aspects = ["old_modded_form"];
  assert.deepEqual(validateArenaCatalog(old, catalog(), [old]), []);
  const mutation = structuredClone(old); mutation.stages[0].team[0].legacyProperties = "eevee new=data";
  assert.ok(validateArenaCatalog(mutation, catalog(), [old]).length);
  for (const mutate of [d => d.stages[0].npcClass = "unknown", d => d.stages[0].trainers[0].npcClass = "unknown", d => d.stages[0].trainers[0].rewards.items[0].item = "minecraft:unknown"]) {
    const d = content(); mutate(d); assert.ok(validateArenaCatalog(d, catalog()).length);
  }
});
test("read/write admin roles, CSRF and server auth are enforced before any DB access", async () => {
  const a = app(), originalExecute = pool.execute, originalQuery = pool.query, originalConnection = pool.getConnection;
  pool.execute = pool.query = pool.getConnection = async () => { throw Error("Unexpected DB access"); };
  try {
    for (const url of ["/api/admin/arenas", "/api/admin/arenas/main", "/api/admin/arenas/main/history/1"]) {
      assert.equal((await a.inject({ url })).statusCode, 401);
      assert.equal((await a.inject({ url, headers: { "x-test-role": "unauthorized" } })).statusCode, 403);
    }
    for (const [method, url] of [["PUT", "/api/admin/arenas/main"], ["POST", "/api/admin/arenas/main/publish"]]) {
      assert.equal((await a.inject({ method, url, headers: { ...readHeaders, origin: "https://example.test" }, payload: {} })).statusCode, 403);
      for (const origin of [undefined, "https://evil.test"]) {
        const headers = { ...writeHeaders }; if (origin) headers.origin = origin; else delete headers.origin;
        assert.equal((await a.inject({ method, url, headers, payload: {} })).statusCode, 403);
      }
    }
    assert.equal((await a.inject({ method: "POST", url: "/api/internal/arenas/sync", payload: {} })).statusCode, 401);
    assert.equal((await a.inject({ method: "POST", url: "/api/internal/arenas/sync", headers: { authorization: "Bearer fixture-server" }, payload: {} })).statusCode, 400);
    assert.equal((await a.inject({ method: "PUT", url: "/api/admin/arenas/main", headers: writeHeaders, payload: { baseRevision: 0, content: {} } })).statusCode, 400);
    assert.equal((await a.inject({ url: "/api/admin/arenas/bad%27id", headers: readHeaders })).statusCode, 400);
    assert.equal((await a.inject({ method: "PUT", url: "/api/admin/arenas/main", headers: writeHeaders, payload: { oversize: "x".repeat(2 * 1024 * 1024) } })).statusCode, 413);
  } finally { pool.execute = originalExecute; pool.query = originalQuery; pool.getConnection = originalConnection; await a.close(); }
});

function databaseDouble() {
  let rows = new Map(), publications = [], queue = Promise.resolve();
  async function execute(sql, args = []) {
    if (sql.startsWith("INSERT INTO arena_studio")) { if (!rows.has(args[0])) rows.set(args[0], { server_id: args[0], draft_json: null, draft_revision: 0, published_json: null, published_revision: 0, observed_json: null, applied_revision: 0 }); }
    else if (sql.startsWith("SELECT") && sql.includes("FROM arena_publications")) {
      const list = publications.filter(p => p.serverId === args[0] && (args[1] === undefined || p.revision === args[1]));
      return [list.map(p => ({ revision: p.revision, actor: p.actor, reason: p.reason, content_json: p.content }))];
    } else if (sql.startsWith("SELECT") && sql.includes("WHERE server_id=?")) return [[rows.get(args[0])].filter(Boolean).map(r => ({ ...r }))];
    else if (sql.startsWith("SELECT")) return [[...rows.values()].map(r => ({ serverId: r.server_id, appliedRevision: r.applied_revision, publishedRevision: r.published_revision }))];
    else if (sql.startsWith("UPDATE arena_studio SET observed_json")) Object.assign(rows.get(args[5]), { observed_json: args[0], draft_json: args[1], draft_revision: args[2], applied_revision: args[3], sync_error: args[4], last_seen_at: new Date() });
    else if (sql.startsWith("UPDATE arena_studio SET draft_json")) { const r = rows.get(args[1]); r.draft_json = args[0]; r.draft_revision++; }
    else if (sql.startsWith("INSERT INTO arena_publications")) publications.push({ serverId: args[0], revision: args[1], content: args[2], actor: args[3], reason: args[4] });
    else if (sql.startsWith("UPDATE arena_studio SET published_json")) Object.assign(rows.get(args[2]), { published_json: args[0], published_revision: args[1] });
    else throw Error(`Unhandled fixture query ${sql}`);
    return [{ affectedRows: 1 }];
  }
  return { execute, query: execute, getConnection: async () => {
    const previous = queue; let unlock; queue = new Promise(resolve => { unlock = resolve; }); await previous;
    let snapshot;
    return { execute, beginTransaction: async () => { snapshot = structuredClone({ rows, publications }); }, commit: async () => {}, rollback: async () => { ({ rows, publications } = snapshot); }, release: () => unlock() };
  } };
}
test("server import, draft conflict, publication audit, idempotency and ack with transactional DB double", async () => {
  const a = app(), originals = { execute: pool.execute, query: pool.query, getConnection: pool.getConnection };
  Object.assign(pool, databaseDouble());
  try { await exerciseArenaStudio(a, writeHeaders, { authorization: "Bearer fixture-server" }); }
  finally { Object.assign(pool, originals); await a.close(); }
});
test("unknown servers, missing catalogs and forged first acknowledgements fail closed", async () => {
  const a = app(), originals = { execute: pool.execute, query: pool.query, getConnection: pool.getConnection };
  Object.assign(pool, databaseDouble());
  const sync = (key, appliedRevision = 0) => a.inject({ method: "POST", url: "/api/internal/arenas/sync", headers: { authorization: "Bearer fixture-server" }, payload: { serverId: key, appliedRevision, error: "", observed: { arenaConfig: content() } } });
  try {
    assert.equal((await a.inject({ url: "/api/admin/arenas/missing", headers: readHeaders })).statusCode, 404);
    assert.equal((await a.inject({ method: "PUT", url: "/api/admin/arenas/missing", headers: writeHeaders, payload: { baseRevision: 0, content: content() } })).statusCode, 409);
    assert.equal((await sync("forged", 5)).statusCode, 409);
    assert.equal((await a.inject({ url: "/api/admin/arenas/forged", headers: readHeaders })).statusCode, 404, "Rejected first sync rolls back the inserted row");
    assert.equal((await sync("main")).statusCode, 200);
    const detail = await a.inject({ url: "/api/admin/arenas/main", headers: readHeaders });
    assert.equal(detail.statusCode, 200); assert.equal(detail.json().canWrite, false); assert.equal(detail.headers["cache-control"], "no-store");
    const publish = await a.inject({ method: "POST", url: "/api/admin/arenas/main/publish", headers: writeHeaders, payload: { baseRevision: 1, reason: "Première publication" } });
    assert.equal(publish.statusCode, 409); assert.equal(publish.json().error, "ARENA_ENGINE_REQUIRED");
    assert.equal((await a.inject({ url: "/api/admin/arenas/main/history/1", headers: readHeaders })).statusCode, 404);
  } finally { Object.assign(pool, originals); await a.close(); }
});
