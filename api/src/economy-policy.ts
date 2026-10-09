import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const amount = z.number().int().min(0).max(1_000_000_000);
export const economyPolicySchema = z.object({
  version: z.literal(1),
  revision: z.string().regex(/^[a-z0-9_-]{1,80}$/),
  values: z.record(z.string().regex(/^[a-zA-Z0-9_.]{1,100}$/), amount),
  items: z.record(z.string().regex(/^[a-z0-9_]+:[a-z0-9_./-]+$/), z.tuple([amount, amount])),
}).strict().superRefine((policy, ctx) => {
  let previous = 0;
  for (const grade of ["eclaireur", "aventurier", "prodige", "veteran", "gardien", "elite"]) {
    const price = policy.values[`grades.${grade}`] ?? 0;
    if (price <= previous) ctx.addIssue({ code: "custom", message: "Les prix des grades doivent augmenter", path: ["values", `grades.${grade}`] });
    previous = price;
  }
  if (policy.values["grades.elite"] !== policy.values["grades.mercenaire"])
    ctx.addIssue({ code: "custom", message: "Les deux choix finaux doivent avoir le même prix" });
  for (const [id, [buy, sell]] of Object.entries(policy.items)) {
    if (buy < 1 || sell > Math.floor(buy / 3)) ctx.addIssue({ code: "custom", message: "Rachat trop élevé", path: ["items", id] });
  }
});
export function getEconomyPolicy() {
  return economyPolicySchema.parse(JSON.parse(readFileSync(join(process.cwd(), "economy.policy.json"), "utf8")));
}
