import { z } from "zod";

export const monthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const resourceSchema = z.string().max(160).regex(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/).refine(v => v !== "minecraft:air");
export const dailyReward = z.object({
  label: z.string().trim().max(60),
  items: z.array(z.object({ item: resourceSchema, count: z.number().int().min(1).max(64) }).strict()).max(8),
  cobbleCoins: z.number().int().min(0).max(1_000_000),
  experiencePoints: z.number().int().min(0).max(100_000),
  stars: z.number().int().min(0).max(100_000),
}).strict();
export const dailyCalendar = z.object({ days: z.array(dailyReward).min(28).max(31) }).strict();
export type DailyReward = z.infer<typeof dailyReward>;
export type DailyCalendar = z.infer<typeof dailyCalendar>;
export function daysInMonth(month: string) {
  monthSchema.parse(month);
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, number!, 0)).getUTCDate();
}
export function parisDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (name: string) => parts.find(p => p.type === name)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function emptyCalendar(month: string): DailyCalendar {
  return { days: Array.from({ length: daysInMonth(month) }, () => ({ label: "", items: [], cobbleCoins: 0, experiencePoints: 0, stars: 0 })) };
}
export function hasReward(r: DailyReward) { return r.items.length > 0 || r.cobbleCoins > 0 || r.experiencePoints > 0 || r.stars > 0; }
export function validateCalendar(month: string, content: DailyCalendar, publish = false) {
  if (content.days.length !== daysInMonth(month)) throw new DailyError("INVALID_DAY_COUNT", "Le nombre de jours ne correspond pas au mois.");
  if (publish && content.days.some(r => !hasReward(r))) throw new DailyError("EMPTY_REWARD", "Configure une récompense pour chaque jour avant d’activer le mois.");
}
export class DailyError extends Error {
  constructor(public code: string, message: string, public status = 409) { super(message); }
}
