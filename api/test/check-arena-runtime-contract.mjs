import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { arenaContent, arenaCatalog, arenaSync, validateArenaCatalog } from "../dist/arena-studio-schema.js";

// A real mod probe is explicit input; no production .env, database or network access.
if (!process.argv[2]) throw new Error("Usage: node api/test/check-arena-runtime-contract.mjs <arena-runtime-probe.json> [--require-native-success]");
const path = resolve(process.argv[2]);
const raw = await readFile(path, "utf8"), probe = JSON.parse(raw.replace(/^\uFEFF/, ""));
if (process.argv.includes("--require-native-success")) assert.equal(probe.passed, true, `Native probe must pass first: ${probe.error ?? "missing success marker"}`);
function validated(schema, value, label) {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`${label}:\n${result.error.issues.slice(0, 30).map(i => `${i.path.join(".")}: ${i.message}`).join("\n")}`);
  return result.data;
}
const content = validated(arenaContent, probe.content, "Native arenaContent"), catalog = validated(arenaCatalog, probe.catalog, "Native arenaCatalog");
const issues = validateArenaCatalog(content, catalog, [content]);
assert.deepEqual(issues, [], "The actual mod defaults must be publishable against its actual registries");
const runtime = probe.runtime ?? { pendingRewards: 0, reviewRewards: 0, activeBattles: 0, worldReady: false };
const complete = validated(arenaSync, { serverId: "arena_runtime_probe", appliedRevision: 0, error: "", observed: { arenaConfig: content, catalog, runtime } }, "First sync");
const bytes = Buffer.byteLength(JSON.stringify(complete), "utf8");
assert.ok(bytes <= 2 * 1024 * 1024, `Actual sync body ${bytes} bytes exceeds 2 MiB`);
validated(arenaSync, { serverId: "arena_runtime_probe", appliedRevision: 1, error: "", observed: { arenaConfig: content, runtime } }, "Lightweight acknowledgement");
assert.equal(arenaSync.safeParse({ ...complete, appliedRevision: 2147483648 }).success, false, "API revisions must fit the Java bridge signed int");
console.log(JSON.stringify({ result: "PASS", source: path, stages: content.stages.length,
  configuredPokemon: content.stages.reduce((n, s) => n + s.team.length + s.trainers.reduce((m, t) => m + t.team.length, 0) + (s.trial ? 1 : 0), 0),
  adventureTrials: content.stages.filter(s => s.trial).length,
  nativeGuardianEntitiesSpawned: probe.guardianEntitiesSpawned ?? null,
  species: catalog.species.length, forms: catalog.species.reduce((n, s) => n + (s.forms?.length ?? 0), 0),
  items: catalog.items.length, moves: catalog.moves.length, abilities: catalog.abilities.length, natures: catalog.natures.length, npcClasses: catalog.npcClasses.length,
  fullSyncBytes: bytes, nativeProbePassed: probe.passed ?? null, nativePokemonCreated: probe.pokemonCreated ?? null }, null, 2));
