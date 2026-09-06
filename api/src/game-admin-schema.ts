import { z } from "zod";
import { pokemonChange, pokemonEditor } from "./pokemon-admin-schema.js";

export const gameUuid = z.string().regex(/^[a-f0-9]{32}$/);
const resource = z.string().regex(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/).max(160);
export const gameItem = z.object({ slot: z.number().int().min(0).max(53), id: resource, name: z.string().max(500), count: z.number().int().min(1).max(999), maxCount: z.number().int().min(1).max(999), fingerprint: z.string().length(64), components: z.string().max(100_000) });
export const gamePokemon = z.object({ uuid: z.string().uuid(), species: z.string().max(160), name: z.string().max(160), level: z.number().int().min(1).max(1000), shiny: z.boolean(), storage: z.enum(["party", "pc"]), data: z.record(z.string(), z.unknown()), editor: pokemonEditor.optional() });
export const gameSnapshot = z.object({
  schemaVersion: z.literal(1), sessionStartedAt: z.number().int().nonnegative(),
  health: z.number().finite(), maxHealth: z.number().finite(), food: z.number().int(), xpLevel: z.number().int(), xpProgress: z.number().finite(),
  dimension: resource, x: z.number().finite(), y: z.number().finite(), z: z.number().finite(), gameMode: z.string().max(32),
  inventory: z.array(gameItem).max(41), enderChest: z.array(gameItem).max(27),
  pokemon: z.array(gamePokemon).max(6000), pokemonError: z.string().max(200).optional(), pokemonTruncated: z.boolean(),
  statistics: z.record(z.string().max(240), z.number().int()),
  academy: z.record(z.string(), z.unknown()), cosmeticIds: z.array(z.string().max(64)).max(1000),
  quests: z.record(z.string(), z.unknown()),
  capabilities: z.array(z.string().max(48)).max(32),
});
export type GameSnapshot = z.infer<typeof gameSnapshot>;
export const actionInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("xp_level"), value: z.number().int().min(0).max(1000) }).strict(),
  z.object({ kind: z.literal("health"), value: z.number().min(1).max(2048) }).strict(),
  z.object({ kind: z.literal("food"), value: z.number().int().min(0).max(20) }).strict(),
  z.object({ kind: z.literal("inventory_count"), storage: z.enum(["inventory", "enderChest"]), slot: z.number().int().min(0).max(40), value: z.number().int().min(0).max(99) }).strict(),
  z.object({ kind: z.literal("pokemon_level"), pokemonUuid: z.string().uuid(), value: z.number().int().min(1).max(100) }).strict(),
  z.object({ kind: z.literal("pokemon_edit"), pokemonUuid: z.string().uuid(), change: pokemonChange }).strict(),
  z.object({ kind: z.literal("cosmetic_unlock"), cosmeticId: z.string().regex(/^[a-z0-9_-]{1,64}$/) }).strict(),
  z.object({ kind: z.literal("cosmetics_disable") }).strict(),
]);

// Expected values are always derived from a trusted server snapshot, never the browser.
export function prepareAction(snapshot: GameSnapshot, action: z.infer<typeof actionInput>) {
  if (!snapshot.capabilities.includes(action.kind)) throw new Error("UNSUPPORTED_ACTION");
  if (action.kind === "inventory_count") {
    const item = snapshot[action.storage].find((entry) => entry.slot === action.slot);
    if (!item || action.value > item.maxCount) throw new Error("INVALID_ITEM_COUNT");
    return { ...action, expected: item.fingerprint };
  }
  if (action.kind === "pokemon_level") {
    const pokemon = snapshot.pokemon.find((entry) => entry.uuid === action.pokemonUuid);
    if (!pokemon) throw new Error("POKEMON_NOT_FOUND");
    return { ...action, expected: pokemon.level };
  }
  if (action.kind === "pokemon_edit") {
    const pokemon = snapshot.pokemon.find(entry => entry.uuid === action.pokemonUuid);
    if (!pokemon?.editor) throw new Error("POKEMON_EDITOR_UNAVAILABLE");
    if (action.change.field === "currentHealth" && action.change.value > pokemon.editor.maxHealth) throw new Error("HEALTH_TOO_HIGH");
    return { ...action, expected: pokemon.editor.fingerprint };
  }
  if (action.kind === "cosmetic_unlock") {
    if (!snapshot.cosmeticIds.includes(action.cosmeticId)) throw new Error("UNKNOWN_COSMETIC");
    return { ...action };
  }
  if (action.kind === "cosmetics_disable") return { ...action };
  if (action.kind === "health" && action.value > snapshot.maxHealth) throw new Error("HEALTH_TOO_HIGH");
  return { ...action, expected: action.kind === "xp_level" ? snapshot.xpLevel : snapshot[action.kind] };
}
