import { readFileSync } from "node:fs";
import { z } from "zod";

const pack = z.object({
  id: z.string().regex(/^stars_[0-9]+$/).max(32),
  stars: z.number().int().min(1).max(1_000_000),
  amountCents: z.number().int().min(50).max(100_000),
  bonus: z.string().max(60),
});
export const starPacks = z.array(pack).min(1).max(20).parse(
  JSON.parse(readFileSync(new URL("../stars.catalog.json", import.meta.url), "utf8")),
);
if (new Set(starPacks.map(p => p.id)).size !== starPacks.length) throw new Error("Duplicate Stars pack");
export type StarPack = z.infer<typeof pack>;
