import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { EventEmitter } from "node:events";
import { previewArenaPaste, PASTE_MAX_BYTES } from "../dist/arena-pokepaste.js";
import { downloadPokepaste, pokepasteUrl, publicPasteAddress } from "../dist/pokepaste-download.js";
import { arenaPokemon } from "../dist/arena-studio-schema.js";
import { catalog as fixtureCatalog } from "./fixtures/arena-studio.mjs";

const registry = () => {
  const c = fixtureCatalog();
  c.species.push({ id: "cobblemon:raichu", label: "Raichu", forms: [{ id: "normal", label: "Normale", aspects: [] }, { id: "Alola", label: "Alola", aspects: ["alolan"] }] });
  c.items.push({ id: "cobblemon:choice_scarf", label: "Mouchoir Choix" });
  c.moves.push(...["thunderbolt", "voltswitch", "surf", "psychic"].map(id => ({ id, label: id })));
  c.abilities.push({ id: "surgesurfer", label: "Surf Caudal" });
  c.natures.push({ id: "cobblemon:timid", label: "Timide" }); return c;
};
const paste = `Raichu-Alola (F) @ Choice Scarf
Ability: Surge Surfer
Level: 68
Shiny: Yes
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
IVs: 0 Atk / 30 Def
- Thunderbolt
- Volt Switch
- Surf
- Psychic

Eevee
Ability: Run Away
Adamant Nature
- Tackle`;

test("Showdown import resolves English canonical names, regional forms and every supported field", () => {
  const before = registry(), snapshot = structuredClone(before), p = previewArenaPaste(paste.replaceAll("\n", "\r\n"), before);
  assert.deepEqual(before, snapshot); assert.deepEqual(p.errors, []); assert.deepEqual(p.warnings, []); assert.equal(p.team.length, 2);
  assert.deepEqual(p.team[0], { species: "cobblemon:raichu", aspects: ["alolan"], level: 68, shiny: true, gender: "female", heldItem: "cobblemon:choice_scarf", ability: "surgesurfer", nature: "cobblemon:timid", moves: ["thunderbolt", "voltswitch", "surf", "psychic"], ivs: { hp: 31, atk: 0, def: 30, spa: 31, spd: 31, spe: 31 }, evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 } });
  assert.equal(p.team[1].level, 100); assert.deepEqual(p.team[1].ivs, { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
  assert.equal(Object.values(p.team[1].evs).reduce((a, b) => a + b), 0);
  for (const member of p.team) arenaPokemon.parse(member);
});
test("translated labels and IDs also resolve, no catalog entry or form is invented", () => {
  const c = registry(); let p = previewArenaPaste("Évoli (M) @ minecraft:diamond\nTrait: Fuite\nRigide Nature\n- Charge", c);
  assert.deepEqual(p.errors, []); assert.equal(p.team[0].gender, "male"); assert.equal(p.team[0].heldItem, "minecraft:diamond");
  p = previewArenaPaste("Raichu-Mega\n- Tackle", c); assert.ok(p.errors.some(i => i.message.includes("Aucun remplacement"))); assert.equal(p.team.length, 0);
  c.species = c.species.filter(s => s.id !== "cobblemon:raichu"); p = previewArenaPaste(paste, c); assert.ok(p.errors.length); assert.equal(p.team.length, 1, "Unknown member never becomes another species");
  c.items.push({ id: "other:diamond", label: "Diamant" });
  p = previewArenaPaste("Eevee @ Diamant", c); assert.ok(p.errors.some(i => i.message.includes("ambigu")));
});
test("unsupported known settings and nicknames remain visible warnings, never properties or commands", () => {
  const p = previewArenaPaste(`Aurora (Raichu-Alola) (F) @ Choice Scarf\nAbility: Surge Surfer\nTimid Nature\nTera Type: Electric\nHappiness: 0\nDynamax Level: 8\nGigantamax: Yes\nPokeball: Cherish Ball\nHidden Power: Ice\n- Thunderbolt`, registry());
  assert.deepEqual(p.errors, []); assert.equal(p.warnings.length, 7);
  assert.ok(p.warnings.some(w => w.message.includes("Aurora"))); assert.ok(p.warnings.some(w => w.message.includes("Tera Type = Electric")));
  assert.equal(p.team[0].legacyProperties, undefined); assert.equal(p.team[0].nickname, undefined); assert.equal(p.team[0].teraType, undefined);
});
test("Unown normal, letters, ! and ? preserve significant form punctuation", () => {
  const c = registry();
  c.species.push({ id: "cobblemon:unown", label: "Zarbi", forms: [{ id: "normal", label: "Normale", aspects: [] }, { id: "B", label: "B", aspects: ["character-b"] }, { id: "!", label: "!", aspects: ["character-!"] }, { id: "?", label: "?", aspects: ["character-?"] }] });
  for (const [name, aspects] of [["Unown", []], ["UNOWN", []], ["cobblemon:unown", []], ["Zarbi", []], ["Unown-B", ["character-b"]], ["Unown-!", ["character-!"]], ["Unown-?", ["character-?"]], ["  zarbi-?  ", ["character-?"]], ["unown ?", ["character-?"]]]) {
    const p = previewArenaPaste(name, c); assert.deepEqual(p.errors, [], name); assert.equal(p.team.length, 1, name); assert.equal(p.team[0].species, "cobblemon:unown"); assert.deepEqual(p.team[0].aspects, aspects, name);
  }
  for (const name of ["Unown-!!", "Unown-?!", "Unown-Z", "Eevee-?"]) assert.ok(previewArenaPaste(name, c).errors.length, name);
  c.species[2].forms = c.species[2].forms.filter(f => f.id !== "?");
  const unavailable = previewArenaPaste("Unown-?", c); assert.ok(unavailable.errors.length); assert.equal(unavailable.team.length, 0, "A missing punctuation form must never become normal");
  // An exact registered name wins over a punctuation-stripped alias for another entry.
  c.species.push({ id: "custom:un_own", label: "Alias ambigu", forms: [] });
  const exact = previewArenaPaste("Unown", c); assert.deepEqual(exact.errors, []); assert.equal(exact.team[0].species, "cobblemon:unown");
});
test("missing fields warn explicitly, Showdown default stats never inherit editor zeros", () => {
  const p = previewArenaPaste("Eevee @ No Item", registry()); assert.deepEqual(p.errors, []); assert.equal(p.warnings.length, 3); assert.equal(p.team[0].heldItem, "");
  assert.equal(p.team[0].ivs.atk, 31); assert.equal(p.team[0].level, 100);
});
test("malformed/unknown data, excess teams, repeated fields and invalid stats block import", () => {
  for (const text of [
    "", "Eevee\nEVs: 252 HP / 252 Atk / 252 Spe", "Eevee\nEVs: 253 HP", "Eevee\nIVs: 32 HP", "Eevee\nEVs: -1 HP",
    "Eevee\nEVs: 100 HP / 20 HP", "Eevee\nEVs: 1 Money", "Eevee\nLevel: 101", "Eevee\nLevel: 40px", "Eevee\nLevel: 0",
    "Eevee\nShiny: Maybe", "Eevee\nAbility: Run Away\nTrait: Run Away", "Eevee\nLevel: 30\nLevel: 40",
    "Eevee\nAdamant Nature\nAdamant Nature", "Eevee\nIVs: 0 Atk\nIVs: 31 Atk", "Eevee\nEVs: ", "Eevee\nLevel: 30\ncommands: op @a",
    "Eevee\n- Tackle\n- Tackle", "Eevee\n- Tackle\n- Surf\n- Psychic\n- Thunderbolt\n- Volt Switch",
    "Eevee\n- Unknown Move", "Eevee @ Unknown Item", "Eevee\nUnknown Field: anything", "Eevee\nfoo bar", "Eevee\nHappiness: NaN",
    "Eevee\nGigantamax: maybe", "Eevee\nDynamax Level: 11", "Eevee\nHappiness: 256", "Eevee\u0000", "Eevee§a",
    Array(7).fill("Eevee").join("\n\n"), "=== [gen9] backup ===\nEevee", "Eevee @ Choice Scarf @ minecraft:diamond", "x".repeat(PASTE_MAX_BYTES + 1),
  ]) assert.ok(previewArenaPaste(text, registry()).errors.length, text.slice(0, 100));
});
test("PokePaste only permits exact HTTPS host/ID/raw path", () => {
  for (const suffix of ["", "/", "/raw"]) assert.equal(pokepasteUrl(`https://pokepast.es/0123456789abcdef${suffix}`).href, "https://pokepast.es/0123456789abcdef/raw");
  for (const url of ["http://pokepast.es/0123456789abcdef", "https://pokepast.es:443/0123456789abcdef", "https://pokepast.es@127.0.0.1/0123456789abcdef", "https://pokepast.es.evil.test/0123456789abcdef", "https://127.0.0.1/0123456789abcdef", "https://[::1]/0123456789abcdef", "https://pokepast.es/0123456789abcdef?url=http://127.0.0.1", "https://pokepast.es/0123456789abcdef#fragment", "https://pokepast.es/%2f0123456789abcdef", "https://pokepast.es/../../0123456789abcdef", "https://pokepast.es/short", "file:///tmp/team"]) assert.throws(() => pokepasteUrl(url));
});
test("private, loopback, link local, special ranges and IPv6 DNS answers cannot reach HTTP", async () => {
  for (const ip of ["127.0.0.1", "0.0.0.0", "10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "198.18.0.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "224.0.0.1", "255.255.255.255", "::1", "::ffff:127.0.0.1", "8.8.999.1"]) {
    assert.equal(publicPasteAddress(ip), false, ip);
    await assert.rejects(downloadPokepaste("https://pokepast.es/0123456789abcdef", { lookup: async () => [{ address: ip }], request: () => { throw Error("must not connect"); } }), /non autorisée/);
  }
  assert.equal(publicPasteAddress("8.8.8.8"), true);
});
function transport({ status = 200, headers = {}, chunks = [Buffer.from(paste)], stall = false } = {}) {
  let calls = 0;
  return { get calls() { return calls; }, lookup: async () => [{ address: "8.8.8.8", family: 4 }], request(url, options, callback) {
    calls++; assert.equal(url.href, "https://pokepast.es/0123456789abcdef/raw"); assert.equal(options.agent, false); assert.equal(options.headers.Authorization, undefined); assert.equal(options.headers.Cookie, undefined);
    options.lookup("pokepast.es", {}, (err, address, family) => { assert.equal(err, null); assert.equal(address, "8.8.8.8"); assert.equal(family, 4); });
    const req = new EventEmitter(); req.end = () => queueMicrotask(() => {
      const res = new PassThrough(); res.statusCode = status; res.headers = headers; callback(res);
      if (!stall) { for (const chunk of chunks) { if (!res.destroyed) res.write(chunk); } res.end(); }
    }); options.signal.addEventListener("abort", () => req.emit("error", Error("aborted")), { once: true }); return req;
  } };
}
test("download pins checked DNS, reads bounded UTF8 with no session forwarding", async () => {
  const deps = transport(); assert.equal(await downloadPokepaste("https://pokepast.es/0123456789abcdef", deps), paste); assert.equal(deps.calls, 1);
});
test("download rejects redirects, oversized streaming bodies, compressed content and timeouts", async () => {
  for (const config of [ { status: 302, headers: { location: "http://127.0.0.1/private" } }, { status: 404 }, { headers: { "content-length": String(PASTE_MAX_BYTES + 1) } }, { chunks: [Buffer.alloc(PASTE_MAX_BYTES), Buffer.alloc(1)] }, { headers: { "content-encoding": "gzip" } }, { chunks: [Buffer.from([0xff])] } ]) {
    const deps = transport(config); await assert.rejects(downloadPokepaste("https://pokepast.es/0123456789abcdef", deps)); assert.equal(deps.calls, 1);
  }
  await assert.rejects(downloadPokepaste("https://pokepast.es/0123456789abcdef", transport({ stall: true }), 10), /8 secondes/);
  await assert.rejects(downloadPokepaste("https://pokepast.es/0123456789abcdef", { lookup: () => new Promise(() => {}), request() { throw Error("must not connect"); } }, 10), /8 secondes/);
});

Object.assign(process.env, { NODE_ENV: "test", PUBLIC_API_URL: "https://example.test", SITE_ORIGIN: "https://example.test", DB_HOST: "127.0.0.1", DB_NAME: "unused_test", DB_USER: "unused_test", DB_PASSWORD: "unused_test", COOKIE_SECRET: "isolated-test-cookie-secret-never-production", MINECRAFT_SERVER_KEY: "isolated-test-server-secret-never-production", GAME_ADMIN_DISCORD_IDS: "111111111111111111", GAME_ADMIN_READ_DISCORD_IDS: "222222222222222222" });
const { default: Fastify } = await import("fastify");
const { registerArenaStudio } = await import("../dist/arena-studio.js");
const { pool } = await import("../dist/db.js");
test("admin preview requires write role and same origin, reads real catalog and never writes DB", async () => {
  const a = Fastify(), old = pool.execute, headers = { origin: "https://example.test", "x-role": "111111111111111111" }; let reads = 0, fetches = 0, observed = { catalog: registry() };
  pool.execute = async (sql, args) => { assert.match(sql, /^SELECT observed_json/); assert.deepEqual(args, ["main"]); reads++; return [[{ observed_json: JSON.stringify(observed) }]]; };
  registerArenaStudio(a, { session: async req => req.headers["x-role"] ? { id: "fixture", discord_id: req.headers["x-role"] } : null, server: () => false }, async source => { pokepasteUrl(source); fetches++; return paste; });
  const send = (requestHeaders = headers, source = paste) => a.inject({ method: "POST", url: "/api/admin/arenas/main/import-team", headers: requestHeaders, payload: { source } });
  try {
    assert.equal((await send({})).statusCode, 401);
    assert.equal((await send({ ...headers, "x-role": "222222222222222222" })).statusCode, 403);
    assert.equal((await send({ ...headers, origin: "https://evil.test" })).statusCode, 403);
    assert.equal((await send({ "x-role": "111111111111111111" })).statusCode, 403); assert.equal(reads, 0); assert.equal(fetches, 0);
    let r = await send(); assert.equal(r.statusCode, 200); assert.deepEqual(r.json().team, previewArenaPaste(paste, registry()).team); assert.equal(r.json().source, "text"); assert.equal(fetches, 0);
    r = await send(headers, "https://pokepast.es/0123456789abcdef"); assert.equal(r.statusCode, 200); assert.equal(r.json().source, "pokepaste"); assert.equal(fetches, 1);
    r = await send(headers, "http://127.0.0.1/private"); assert.equal(r.statusCode, 422); assert.equal(fetches, 1);
    r = await send(headers, "Eevee\nLevel: 999"); assert.equal(r.statusCode, 200); assert.ok(r.json().errors.length); assert.equal(r.json().team.length, 0);
    const previousReads = reads; r = await send(headers, "x".repeat(PASTE_MAX_BYTES + 1)); assert.equal(r.statusCode, 400); assert.equal(reads, previousReads);
    observed = {}; r = await send(); assert.equal(r.statusCode, 409); assert.equal(r.json().error, "ARENA_CATALOG_REQUIRED");
  } finally { pool.execute = old; await a.close(); }
});
