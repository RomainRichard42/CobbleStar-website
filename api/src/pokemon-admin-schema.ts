import { z } from "zod";

const identifier = z.string().regex(/^[a-z0-9_.-]+(?::[a-z0-9_./-]+)?$/).max(160);
const statBlock = (maximum: number) => z.object({ hp: z.number().int().min(0).max(maximum), attack: z.number().int().min(0).max(maximum), defence: z.number().int().min(0).max(maximum), special_attack: z.number().int().min(0).max(maximum), special_defence: z.number().int().min(0).max(maximum), speed: z.number().int().min(0).max(maximum) }).strict();
const ivs = statBlock(31);
const evs = statBlock(252).refine(value => Object.values(value).reduce((sum, n) => sum + n, 0) <= 510, "EV_TOTAL_EXCEEDED");
const move = z.object({ id: identifier, pp: z.number().int().min(0).max(128), ppUps: z.number().int().min(0).max(3) }).strict();
export const pokemonChange = z.discriminatedUnion("field", [
  z.object({ field: z.literal("species"), value: identifier }).strict(),
  z.object({ field: z.literal("experience"), value: z.number().int().min(0).max(2_000_000) }).strict(),
  z.object({ field: z.literal("status"), value: z.union([identifier, z.literal("")]) }).strict(),
  z.object({ field: z.literal("hyperIvs"), value: z.object({ hp: z.number().int().min(-1).max(31), attack: z.number().int().min(-1).max(31), defence: z.number().int().min(-1).max(31), special_attack: z.number().int().min(-1).max(31), special_defence: z.number().int().min(-1).max(31), speed: z.number().int().min(-1).max(31) }).strict() }).strict(),
  z.object({ field: z.literal("level"), value: z.number().int().min(1).max(100) }).strict(),
  z.object({ field: z.literal("nickname"), value: z.string().trim().max(32).regex(/^[^\x00-\x1f\x7f]*$/) }).strict(),
  z.object({ field: z.literal("shiny"), value: z.boolean() }).strict(),
  z.object({ field: z.literal("gender"), value: z.enum(["MALE", "FEMALE", "GENDERLESS"]) }).strict(),
  z.object({ field: z.literal("friendship"), value: z.number().int().min(0).max(255) }).strict(),
  z.object({ field: z.literal("nature"), value: identifier }).strict(),
  z.object({ field: z.literal("mintedNature"), value: z.union([identifier, z.literal("")]) }).strict(),
  z.object({ field: z.literal("ability"), value: identifier }).strict(),
  z.object({ field: z.literal("ivs"), value: ivs }).strict(),
  z.object({ field: z.literal("evs"), value: evs }).strict(),
  z.object({ field: z.literal("moves"), value: z.array(move).min(1).max(4).refine(moves => new Set(moves.map(m => m.id)).size === moves.length, "DUPLICATE_MOVES") }).strict(),
  z.object({ field: z.literal("currentHealth"), value: z.number().int().min(0).max(10000) }).strict(),
  z.object({ field: z.literal("heldItem"), value: z.union([identifier, z.literal("")]) }).strict(),
  z.object({ field: z.literal("caughtBall"), value: identifier }).strict(),
  z.object({ field: z.literal("teraType"), value: identifier }).strict(),
  z.object({ field: z.literal("scale"), value: z.number().min(.1).max(3) }).strict(),
  z.object({ field: z.literal("dmaxLevel"), value: z.number().int().min(0).max(10) }).strict(),
  z.object({ field: z.literal("gmaxFactor"), value: z.boolean() }).strict(),
  z.object({ field: z.literal("tradeable"), value: z.boolean() }).strict(),
  z.object({ field: z.literal("heal"), value: z.literal(true) }).strict(),
]);
export const pokemonEditor = z.object({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  values: z.record(z.string(), z.unknown()),
  stats: z.record(z.string(), z.number().finite()),
  effectiveIvs: ivs, maxHealth: z.number().int().nonnegative(),
  types: z.array(z.string().max(48)).max(2), dexNumber: z.number().int().nonnegative(), form: z.string().max(160),
});
