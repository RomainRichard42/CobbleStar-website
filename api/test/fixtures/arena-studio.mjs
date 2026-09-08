import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { arenaSites } from "../../dist/arena-studio-schema.js";

export const rewards = () => ({ items: [{ item: "minecraft:diamond", count: 2 }], experiencePoints: 50, cobbleCoins: 100 });
export const pokemon = () => ({ species: "eevee", level: 35, shiny: false, nature: "cobblemon:adamant", ability: "runaway", moves: ["tackle"], heldItem: "", gender: "random", ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 252, def: 4, spa: 0, spd: 0, spe: 252 }, aspects: [] });
export const trainer = () => ({ id: "first_trainer", name: "Dresseuse", enabled: true, required: true, slot: 0, npcClass: "cobblemon:standard", skill: 50, team: [pokemon()], rewards: rewards() });
export const content = () => ({ schemaVersion: 1, stages: arenaSites.map(([id, theme, x, z], i) => ({ id, theme, x, z, index: i + 1, league: i >= 8, name: `Arène ${i + 1}`, champion: `Champion ${i + 1}`, level: 35, badgeItem: `cobblestar_planets:arena_badge_${theme}`, npcClass: "cobblemon:standard", skill: 70, team: [pokemon()], rewards: rewards(), trainers: i === 0 ? [trainer()] : [] })) });
export const catalog = () => ({ protocol: 1, species: [{ id: "cobblemon:eevee", label: "Évoli", forms: [{ id: "normal", label: "Normale", aspects: [] }, { id: "starter", label: "Test forme", aspects: ["starter"] }] }], items: [...new Set(arenaSites.map(s => s[1]))].map(theme => ({ id: `cobblestar_planets:arena_badge_${theme}`, label: theme })).concat([{ id: "minecraft:diamond", label: "Diamant" }]), moves: [{ id: "tackle", label: "Charge" }], abilities: [{ id: "runaway", label: "Fuite" }], natures: [{ id: "cobblemon:adamant", label: "Rigide" }], npcClasses: [{ id: "cobblemon:standard", label: "Dresseur" }] });

/** Same HTTP lifecycle used by DB-double tests and the disposable MySQL CI fixture. */
export async function exerciseArenaStudio(app, adminHeaders, serverHeaders) {
  const key = `arena_${randomUUID().slice(0, 8)}`, route = `/api/admin/arenas/${key}`, initial = content();
  initial.stages[0].team[0].legacyProperties = "eevee level=35";
  const runtime = { pendingRewards: 2, reviewRewards: 1, activeBattles: 0, worldReady: true };
  const sync = (observed, appliedRevision = 0, error = "") => app.inject({ method: "POST", url: "/api/internal/arenas/sync", headers: serverHeaders, payload: { serverId: key, appliedRevision, error, observed } });
  const save = (value, baseRevision) => app.inject({ method: "PUT", url: route, headers: adminHeaders, payload: { baseRevision, content: value } });
  const publish = baseRevision => app.inject({ method: "POST", url: `${route}/publish`, headers: adminHeaders, payload: { baseRevision, reason: "Équilibrage du champion" } });
  let r = await sync({ arenaConfig: initial, catalog: catalog(), runtime });
  assert.equal(r.statusCode, 200, r.body); assert.deepEqual(r.json(), { revision: 0, content: null });
  r = await app.inject({ url: route, headers: adminHeaders });
  assert.equal(r.statusCode, 200, r.body); assert.equal(r.json().draftRevision, 1);
  assert.deepEqual(r.json().content, initial, "First observed config imports the real mod defaults");
  assert.equal(r.json().hasUnpublishedChanges, true, "Imported but unpublished defaults are publishable");
  assert.deepEqual(r.json().observed, initial); assert.deepEqual(r.json().runtime, runtime);
  const editA = structuredClone(initial), editB = structuredClone(initial);
  editA.stages[0].champion = "Maëlle"; editB.stages[0].champion = "Aurèle";
  const saves = await Promise.all([save(editA, 1), save(editB, 1)]);
  assert.deepEqual(saves.map(r => r.statusCode).sort(), [200, 409], saves.map(r => r.body).join("\n"));
  const winner = saves[0].statusCode === 200 ? editA : editB;
  // A heartbeat must never replace an administrator's draft or remove its registry catalog.
  r = await sync({ arenaConfig: initial }); assert.equal(r.statusCode, 200, r.body);
  r = await app.inject({ url: route, headers: adminHeaders });
  assert.deepEqual(r.json().content, winner); assert.deepEqual(r.json().catalog, catalog()); assert.equal(r.json().draftRevision, 2);
  const publications = await Promise.all([publish(2), publish(2)]);
  for (const p of publications) { assert.equal(p.statusCode, 200, p.body); assert.equal(p.json().publishedRevision, 1); }
  r = await sync({ arenaConfig: initial });
  assert.equal(r.statusCode, 200, r.body); assert.deepEqual(r.json(), { revision: 1, content: winner });
  r = await sync({ arenaConfig: initial }, 2); assert.equal(r.statusCode, 409); assert.equal(r.json().error, "UNKNOWN_APPLIED_REVISION");
  r = await sync({ arenaConfig: winner }, 1); assert.equal(r.statusCode, 200, r.body);
  r = await app.inject({ url: route, headers: adminHeaders });
  assert.equal(r.json().appliedRevision, 1); assert.equal(r.json().history.length, 1, "Double publication is idempotent");
  assert.equal(r.json().hasUnpublishedChanges, false, "Published draft is clean although draft revision 2 differs from publication 1");
  assert.equal(r.json().history[0].reason, "Équilibrage du champion");
  r = await app.inject({ url: `${route}/history/1`, headers: adminHeaders }); assert.deepEqual(r.json().content, winner);
  const unknown = structuredClone(winner); unknown.stages[0].team[0].moves = ["imaginarymove"];
  r = await save(unknown, 2); assert.equal(r.statusCode, 200, r.body);
  r = await publish(3); assert.equal(r.statusCode, 400); assert.equal(r.json().error, "ARENA_INCOMPLETE"); assert.match(r.json().message, /imaginarymove/);
  r = await sync({ arenaConfig: winner }, 1); assert.deepEqual(r.json().content, winner, "Invalid drafts never replace live publication");
  // Several saves do not line up with the independent publication sequence.
  const another = structuredClone(winner); another.stages[0].champion = "Autre champion";
  r = await save(another, 3); assert.equal(r.statusCode, 200, r.body);
  another.stages[1].champion = "Autre dresseuse";
  r = await save(another, 4); assert.equal(r.statusCode, 200, r.body);
  r = await app.inject({ url: route, headers: adminHeaders }); assert.equal(r.json().hasUnpublishedChanges, true);
  r = await publish(5); assert.equal(r.statusCode, 200, r.body); assert.equal(r.json().publishedRevision, 2);
  r = await app.inject({ url: route, headers: adminHeaders });
  assert.equal(r.json().draftRevision, 5); assert.equal(r.json().publishedRevision, 2); assert.equal(r.json().hasUnpublishedChanges, false);
  r = await save(another, 5); assert.equal(r.statusCode, 200, r.body);
  r = await app.inject({ url: route, headers: adminHeaders }); assert.equal(r.json().draftRevision, 6); assert.equal(r.json().hasUnpublishedChanges, false, "Saving identical content does not require publication");
  r = await save(winner, 6); assert.equal(r.statusCode, 200, r.body);
  r = await app.inject({ url: route, headers: adminHeaders }); assert.equal(r.json().hasUnpublishedChanges, true, "An actual edit re-enables publication");
  r = await app.inject({ url: "/api/admin/arenas", headers: adminHeaders }); assert.equal(r.statusCode, 200, r.body); assert.ok(r.json().servers.some(s => s.serverId === key));
  return key;
}
