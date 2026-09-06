import test from "node:test";
import assert from "node:assert/strict";
import { actionInput, prepareAction, gamePokemon } from "../dist/game-admin-schema.js";
const uuid = "00000000-0000-4000-8000-000000000002";
const stats = n => ({ hp: n, attack: n, defence: n, special_attack: n, special_defence: n, speed: n });
const action = (field, value) => ({ kind: "pokemon_edit", pokemonUuid: uuid, change: { field, value } });
test("Pokemon IV and EV bounds, total budget and strict six-stat structure", () => {
  for (const [field, value] of [["ivs", stats(31)], ["evs", { ...stats(0), attack: 252, speed: 252, hp: 6 }], ["hyperIvs", stats(-1)]]) assert.equal(actionInput.safeParse(action(field, value)).success, true);
  for (const [field, value] of [["ivs", stats(32)], ["ivs", stats(1.2)], ["evs", stats(252)], ["evs", { ...stats(0), speed: -1 }], ["ivs", { ...stats(0), command: "op" }], ["ivs", { hp: 1 }], ["hyperIvs", stats(-2)]]) assert.equal(actionInput.safeParse(action(field, value)).success, false);
});
test("Pokemon core parameters accept typed edits and reject protected internals", () => {
  const valid = { species: "cobblemon:dragonite", experience: 1250000, nickname: "Asteria", shiny: true, gender: "FEMALE", friendship: 255, nature: "cobblemon:adamant", mintedNature: "", ability: "innerfocus", currentHealth: 0, heldItem: "", caughtBall: "cobblemon:poke_ball", teraType: "cobblemon:dragon", scale: 1.25, dmaxLevel: 10, gmaxFactor: true, tradeable: false, heal: true, status: "" };
  for (const [field, value] of Object.entries(valid)) assert.equal(actionInput.safeParse(action(field, value)).success, true, field);
  for (const [field, value] of [["uuid", uuid], ["data", {}], ["owner", uuid], ["shiny", "true"], ["level", 101], ["friendship", 256], ["scale", Infinity], ["scale", 0], ["nickname", "bad\nname"], ["heldItem", "minecraft:diamond op x"], ["status", "status;op"], ["heal", false]]) assert.equal(actionInput.safeParse(action(field, value)).success, false, field);
});
test("Moves require 1-4 unique ids, bounded PP and PP Up stages", () => {
  const move = { id: "thunderbolt", pp: 15, ppUps: 0 };
  assert.equal(actionInput.safeParse(action("moves", [move])).success, true);
  for (const value of [[], [move, move], Array(5).fill(move), [{ ...move, pp: -1 }], [{ ...move, ppUps: 4 }], [{ ...move, command: "op" }]]) assert.equal(actionInput.safeParse(action("moves", value)).success, false);
});
test("New edits require a server capability and a matching observed Pokemon", () => {
  const edit = action("shiny", true), fingerprint = "d".repeat(64);
  const snapshot = { capabilities: ["pokemon_edit"], pokemon: [{ uuid, editor: { fingerprint, maxHealth: 200 } }] };
  assert.equal(prepareAction(snapshot, edit).expected, fingerprint);
  assert.throws(() => prepareAction({ ...snapshot, capabilities: [] }, edit), /UNSUPPORTED_ACTION/);
  assert.throws(() => prepareAction({ ...snapshot, pokemon: [] }, edit), /POKEMON_EDITOR_UNAVAILABLE/);
  assert.throws(() => prepareAction({ ...snapshot, pokemon: [{ uuid }] }, edit), /POKEMON_EDITOR_UNAVAILABLE/);
  assert.throws(() => prepareAction(snapshot, action("currentHealth", 201)), /HEALTH_TOO_HIGH/);
});
test("Old bridge snapshots remain readable without claiming editor support", () => {
  const pokemon = { uuid, species: "cobblemon:dragonite", name: "Test", level: 50, shiny: false, storage: "pc", data: {} };
  assert.equal(gamePokemon.safeParse(pokemon).success, true);
  assert.equal(gamePokemon.safeParse({ ...pokemon, editor: { fingerprint: "broken" } }).success, false);
});
