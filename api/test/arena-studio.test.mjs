import test from "node:test";
import assert from "node:assert/strict";
import { arenaContent, arenaCatalog, arenaPuzzles, epreuveSites, validateArenaCatalog } from "../dist/arena-studio-schema.js";
import { content, catalog, pokemon, rewards, trainer, exerciseArenaStudio } from "./fixtures/arena-studio.mjs";
import { chunkEnvelope } from "./fixtures/arena-chunks.mjs";
Object.assign(process.env, { NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test", DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test", COOKIE_SECRET: "isolated-test-cookie-secret-never-production", MINECRAFT_SERVER_KEY: "isolated-test-server-secret-never-production", GAME_ADMIN_DISCORD_IDS: "111111111111111111", GAME_ADMIN_READ_DISCORD_IDS: "222222222222222222" });
const { default: Fastify } = await import("fastify");
const { registerArenaStudio } = await import("../dist/arena-studio.js");
const { pool } = await import("../dist/db.js");
const writeHeaders = { "x-test-role": "111111111111111111", origin: "https://example.test" };
const readHeaders = { "x-test-role": "222222222222222222" };
function app() { const a = Fastify(); registerArenaStudio(a, { session: async req => req.headers["x-test-role"] ? { id: "fixture", discord_id: req.headers["x-test-role"] } : null, server: req => req.headers.authorization === "Bearer fixture-server" }); return a; }
function adventureContent() {
  const d = content();
  for (const stage of d.stages.filter(s => !s.league)) {
    stage.trainers = [trainer()];
    stage.trial = { enabled: true, puzzleId: arenaPuzzles[stage.id], intro: "Explore le parcours, puis affronte son gardien.", hint: "Observe les indices dans le décor.", alpha: { name: "Gardien du parcours", pokemon: pokemon(), rewards: rewards() } };
  }
  return d;
}
function epreuveContent() {
  const old = adventureContent();
  return { schemaVersion: 2, legacyLeagueStages: old.stages.filter(s => ["elite_electric", "elite_ground"].includes(s.id)), stages: epreuveSites.map(([id, theme, x, z], i) => {
    const source = old.stages.find(s => s.id === id);
    return source ? { ...structuredClone(source), index: i + 1, x, z } : { ...structuredClone(old.stages[12]), id, index: i + 1, name: id, theme, x, z, champion: "", team: [], level: 100 };
  }) };
}
test("schema 2 keeps semantic League members and archives without fabricating Fairy/Steel teams", () => {
  const d = epreuveContent();
  assert.deepEqual(arenaContent.parse(d), d);
  assert.deepEqual(d.stages.slice(8).map(s => s.id), ["elite_ghost", "elite_dragon", "elite_fairy", "elite_steel", "champion"]);
  assert.deepEqual(d.legacyLeagueStages.map(s => s.id), ["elite_electric", "elite_ground"]);
  assert.deepEqual(d.stages[8].team, adventureContent().stages[10].team);
  assert.deepEqual(d.stages[10].team, []); assert.equal(d.stages[10].champion, "");
  assert.deepEqual(validateArenaCatalog(d, catalog()), []);
  const wrong = structuredClone(d); wrong.stages[8].id = "elite_electric"; assert.equal(arenaContent.safeParse(wrong).success, false);
  wrong.stages[8].id = "elite_ghost"; wrong.legacyLeagueStages.push(wrong.legacyLeagueStages[0]); assert.equal(arenaContent.safeParse(wrong).success, false);
});
test("Archived optional teams are preserved without creating a second active team", () => {
  const d = epreuveContent(), stage = d.stages[0];
  assert.equal("hardTeam" in arenaContent.parse(d).stages[0], false);
  stage.hardTeam = []; assert.equal(arenaContent.safeParse(d).success, true);
  stage.team[0].memberId = "easy-member"; stage.signaturePokemonId = "easy-member";
  stage.hardTeam = [{ ...pokemon(), memberId: "hard-member", level: 55 }]; stage.hardSignaturePokemonId = "hard-member";
  stage.trainers[0].hardTeam = [{ ...pokemon(), level: 51 }];
  assert.deepEqual(arenaContent.parse(d), d); assert.deepEqual(validateArenaCatalog(d, catalog()), []);
  stage.hardSignaturePokemonId = "easy-member"; assert.equal(arenaContent.safeParse(d).success, false);
  stage.hardSignaturePokemonId = "hard-member"; stage.hardTeam[0].species = "missing"; assert.ok(validateArenaCatalog(d, catalog()).some(e => e.includes("missing")));
  stage.hardTeam[0].species = "eevee"; stage.hardTeam.push(structuredClone(stage.hardTeam[0])); assert.equal(arenaContent.safeParse(d).success, false);
});

test("Captain principal is optional for legacy, explicit, stable through reorder and preserved by sync", () => {
  const legacy = adventureContent();
  assert.deepEqual(arenaContent.parse(legacy), legacy);
  assert.equal("signaturePokemonId" in arenaContent.parse(legacy).stages[0], false);
  const d = adventureContent(), captain = d.stages[0];
  captain.team.push(pokemon()); captain.team[1].memberId = "signature-unique-member";
  captain.signaturePokemonId = "signature-unique-member";
  assert.deepEqual(arenaContent.parse(d), d);
  captain.team.reverse();
  assert.deepEqual(arenaContent.parse(d), d, "Reference is independent of team slot");
  assert.equal(captain.team.find(p => p.memberId === captain.signaturePokemonId), captain.team[0]);
  assert.deepEqual(validateArenaCatalog(d, catalog()), []);
  captain.team = [pokemon()];
  assert.equal(arenaContent.safeParse(d).success, false, "Removing/importing the source requires explicit reselection");
  delete captain.signaturePokemonId;
  assert.equal(arenaContent.safeParse(d).success, true, "Incomplete V3 link remains a valid legacy-compatible draft");
});
test("Captain principal rejects orphan, duplicate, unsafe or League references", () => {
  for (const change of [
    s => s.signaturePokemonId = "absent",
    s => { s.team[0].memberId = "same"; s.team.push({ ...pokemon(), memberId: "same" }); s.signaturePokemonId = "same"; },
    s => s.team[0].memberId = "", s => s.team[0].memberId = "x".repeat(65),
    s => s.team[0].memberId = "unsafe\nvalue", s => s.signaturePokemonId = "",
    s => { s.trainers[0].team = [{ ...pokemon(), memberId: "same" }, { ...pokemon(), memberId: "same" }]; },
  ]) { const d = adventureContent(); change(d.stages[0]); assert.equal(arenaContent.safeParse(d).success, false, change.toString()); }
  const d = content(); d.stages[8].team[0].memberId = "valid"; d.stages[8].signaturePokemonId = "valid";
  assert.equal(arenaContent.safeParse(d).success, false);
});

test("eight fixed adventures are additive: old publications keep their exact content", () => {
  assert.deepEqual(arenaContent.parse(content()), content());
  const d = adventureContent();
  assert.deepEqual(arenaContent.parse(d), d);
  assert.deepEqual(validateArenaCatalog(d, catalog()), []);
  assert.equal(new Set(d.stages.flatMap(s => s.trial ? [s.trial.puzzleId] : [])).size, 8);
  assert.equal(d.stages.filter(s => s.league).every(s => !s.trial), true);
  assert.ok(validateArenaCatalog(content(), catalog(), [d]).some(issue => issue.includes("parcours reçu")), "An upgraded adventure cannot be removed through an old-shaped publish");
});
test("adventures cannot disable prerequisites, change puzzle, add League Totems or unsafe data", () => {
  const changes = [
    d => d.stages[0].trial.enabled = false,
    d => d.stages[0].trial.puzzleId = "tide_valves",
    d => d.stages[0].trial.intro = "",
    d => d.stages[0].trial.hint = "x".repeat(401),
    d => d.stages[0].trial.alpha.name = "Injected§cName",
    d => d.stages[0].trial.alpha.pokemon.level = 101,
    d => d.stages[0].trial.alpha.pokemon.evs.hp = 252,
    d => d.stages[0].trial.alpha.rewards.items[0].count = 65,
    d => d.stages[0].trial.alpha.rewards.commands = ["op @a"],
    d => d.stages[0].trial.alpha.team = [pokemon()],
    d => d.stages[0].trainers = [],
    d => d.stages[0].trainers[0].required = false,
    d => { d.stages[0].trainers[0].enabled = false; d.stages[0].trainers[0].required = false; },
    d => d.stages[8].trial = structuredClone(d.stages[0].trial),
  ];
  for (const change of changes) { const d = adventureContent(); change(d); assert.equal(arenaContent.safeParse(d).success, false, change.toString()); }
});
test("Totem species, forms, traits and rewards use the real server registry validation", () => {
  for (const change of [
    a => a.pokemon.species = "missing", a => a.pokemon.nature = "missing", a => a.pokemon.ability = "missing",
    a => a.pokemon.moves = ["missing"], a => a.pokemon.heldItem = "minecraft:missing", a => a.pokemon.aspects = ["missing"],
    a => a.rewards.items[0].item = "minecraft:missing", a => a.pokemon.legacyProperties = "eevee freeform=forbidden",
  ]) { const d = adventureContent(); change(d.stages[0].trial.alpha); assert.ok(validateArenaCatalog(d, catalog()).length, change.toString()); }
  const old = adventureContent(); old.stages[0].trial.alpha.pokemon.legacyProperties = "eevee legacy=true"; old.stages[0].trial.alpha.pokemon.aspects = ["historical_form"];
  assert.deepEqual(validateArenaCatalog(old, catalog(), [old]), [], "Historical Totem properties remain preservable but not newly authorable");
});

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
    d => d.stages[0].trainers[0].id = "champion", d => d.stages[0].trainers[0].id = "alpha", d => d.stages[0].trainers[0].id = "_foo", d => d.stages[0].npcClass = "standard",
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
test("chunk endpoint authenticates, keeps partial data invisible and commits a >1 MiB snapshot atomically", async () => {
  const a = app(), originals = { execute: pool.execute, query: pool.query, getConnection: pool.getConnection };
  Object.assign(pool, databaseDouble());
  const path = "/api/internal/arenas/sync/chunk";
  const send = payload => a.inject({ method: "POST", url: path, headers: { authorization: "Bearer fixture-server" }, payload });
  try {
    const registry = catalog();
    registry.items = Array.from({ length: 6500 }, (_, i) => ({ id: "minecraft:fixture_" + i, label: "É".repeat(90) }));
    const envelope = { serverId: "main", appliedRevision: 0, error: "", observed: { arenaConfig: adventureContent(), catalog: registry } };
    assert.ok(Buffer.byteLength(JSON.stringify(envelope)) > 1024 * 1024);
    const parts = chunkEnvelope(envelope);
    assert.equal((await a.inject({ method: "POST", url: path, payload: parts[0] })).statusCode, 401);
    assert.equal((await send({ ...parts[0], data: "x".repeat(190000) })).statusCode, 413);
    for (const part of parts.slice(0, -1)) {
      const r = await send(part); assert.equal(r.statusCode, 200, r.body); assert.equal(r.json().pending, true);
      assert.equal((await a.inject({ url: "/api/admin/arenas/main", headers: readHeaders })).statusCode, 404);
    }
    let r = await send(parts.at(-1)); assert.equal(r.statusCode, 200, r.body); assert.equal(r.json().revision, 0);
    r = await a.inject({ url: "/api/admin/arenas/main", headers: readHeaders });
    assert.deepEqual(r.json().content, envelope.observed.arenaConfig); assert.deepEqual(r.json().catalog, registry);
    const before = r.json();
    for (const invalid of [{ ...envelope, serverId: "other" }, { ...envelope, observed: {} }, { ...envelope, appliedRevision: 5 }]) {
      for (const part of chunkEnvelope(invalid, "main")) r = await send(part);
      assert.ok([400, 409].includes(r.statusCode), r.body);
      assert.deepEqual((await a.inject({ url: "/api/admin/arenas/main", headers: readHeaders })).json(), before);
    }
    // A new upload after a lost final response is safe: it cannot reset an edited draft.
    const edited = structuredClone(envelope.observed.arenaConfig); edited.stages[0].champion = "Champion modifié";
    r = await a.inject({ method: "PUT", url: "/api/admin/arenas/main", headers: writeHeaders, payload: { baseRevision: 1, content: edited } });
    assert.equal(r.statusCode, 200, r.body);
    for (const part of chunkEnvelope(envelope)) r = await send(part);
    assert.equal(r.statusCode, 200, r.body);
    assert.deepEqual((await a.inject({ url: "/api/admin/arenas/main", headers: readHeaders })).json().content, edited);
  } finally { Object.assign(pool, originals); await a.close(); }
});
test("server import, draft conflict, publication audit, idempotency and ack with transactional DB double", async () => {
  const a = app(), originals = { execute: pool.execute, query: pool.query, getConnection: pool.getConnection };
  Object.assign(pool, databaseDouble());
  try { await exerciseArenaStudio(a, writeHeaders, { authorization: "Bearer fixture-server" }); }
  finally { Object.assign(pool, originals); await a.close(); }
});
test("adventure sync does not overwrite an old draft; explicit save and publish carry Totem changes", async () => {
  const a = app(), originals = { execute: pool.execute, query: pool.query, getConnection: pool.getConnection };
  Object.assign(pool, databaseDouble());
  const route = "/api/admin/arenas/adventure", observed = adventureContent(), original = content();
  original.stages[0].champion = "Champion déjà personnalisé";
  const sync = (arenaConfig, appliedRevision = 0) => a.inject({ method: "POST", url: "/api/internal/arenas/sync", headers: { authorization: "Bearer fixture-server" }, payload: { serverId: "adventure", appliedRevision, error: "", observed: { arenaConfig, catalog: catalog() } } });
  try {
    assert.equal((await sync(original)).statusCode, 200);
    assert.equal((await sync(observed)).statusCode, 200);
    let response = await a.inject({ url: route, headers: writeHeaders });
    assert.deepEqual(response.json().content, original, "New mod observations must not silently rewrite a custom draft");
    assert.deepEqual(response.json().observed, observed);
    const edited = structuredClone(observed); edited.stages[0].champion = original.stages[0].champion;
    edited.stages[0].trial.hint = "Lis les symboles près de chaque rencontre.";
    edited.stages[0].trial.alpha.pokemon.level = 42;
    edited.stages[0].trial.alpha.rewards.cobbleCoins = 333;
    response = await a.inject({ method: "PUT", url: route, headers: writeHeaders, payload: { baseRevision: 1, content: edited } });
    assert.equal(response.statusCode, 200, response.body);
    response = await a.inject({ method: "POST", url: `${route}/publish`, headers: writeHeaders, payload: { baseRevision: 2, reason: "Préparation des aventures et Totems" } });
    assert.equal(response.statusCode, 200, response.body);
    response = await sync(observed);
    assert.deepEqual(response.json(), { revision: 1, content: edited });
    response = await a.inject({ url: route, headers: writeHeaders });
    assert.equal(response.json().appliedRevision, 0, "Publication is not an acknowledgement");
    assert.equal((await sync(edited, 1)).statusCode, 200);
    response = await a.inject({ url: route, headers: writeHeaders });
    assert.equal(response.json().appliedRevision, 1); assert.equal(response.json().history.length, 1);
    assert.equal(response.json().content.stages[0].champion, "Champion déjà personnalisé");
    assert.equal(response.json().content.stages[0].trial.alpha.pokemon.level, 42);
  } finally { Object.assign(pool, originals); await a.close(); }
});
test("schema 2 migration survives real sync, explicit draft save, publication and server acknowledgement", async () => {
  const a = app(), originals = { execute: pool.execute, query: pool.query, getConnection: pool.getConnection };
  Object.assign(pool, databaseDouble());
  const route = "/api/admin/arenas/epreuves", previous = adventureContent(), observed = epreuveContent();
  previous.stages[0].champion = "Capitaine personnalisé";
  const sync = (arenaConfig, appliedRevision = 0) => a.inject({ method: "POST", url: "/api/internal/arenas/sync", headers: { authorization: "Bearer fixture-server" }, payload: { serverId: "epreuves", appliedRevision, error: "", observed: { arenaConfig, catalog: catalog() } } });
  try {
    assert.equal((await sync(previous)).statusCode, 200);
    assert.equal((await sync(observed)).statusCode, 200);
    let response = await a.inject({ url: route, headers: writeHeaders });
    assert.deepEqual(response.json().content, previous, "New JAR never overwrites owner's unsaved draft");
    assert.equal(response.json().observed.schemaVersion, 2);
    const edited = structuredClone(observed);
    edited.stages[0].champion = previous.stages[0].champion;
    edited.stages[0].team[0].memberId = "principal-owner-choice";
    edited.stages[0].signaturePokemonId = "principal-owner-choice";
    edited.stages[0].trainers = [trainer(), { ...trainer(), id: "second", slot: 1 }];
    edited.stages[0].rewards.cobbleCoins = 333;
    response = await a.inject({ method: "PUT", url: route, headers: writeHeaders, payload: { baseRevision: 1, content: edited } });
    assert.equal(response.statusCode, 200, response.body);
    response = await a.inject({ method: "POST", url: `${route}/publish`, headers: writeHeaders, payload: { baseRevision: 2, reason: "Publication des nouvelles Épreuves" } });
    assert.equal(response.statusCode, 200, response.body);
    response = await sync(observed);
    assert.deepEqual(response.json(), { revision: 1, content: edited }, "Server receives canonical IDs, one team, principal, trainers, rewards and archive intact");
    assert.equal((await a.inject({ url: route, headers: writeHeaders })).json().appliedRevision, 0);
    assert.equal((await sync(edited, 1)).statusCode, 200);
    response = await a.inject({ url: route, headers: writeHeaders });
    assert.equal(response.json().appliedRevision, 1);
    assert.equal(response.json().history.length, 1);
    assert.equal(response.json().content.stages[0].signaturePokemonId, "principal-owner-choice");
    assert.deepEqual(response.json().content.stages[10].team, [], "Unconfigured Fairy team is not fabricated");
    assert.deepEqual(response.json().content.legacyLeagueStages, observed.legacyLeagueStages);
  } finally { Object.assign(pool, originals); await a.close(); }
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
