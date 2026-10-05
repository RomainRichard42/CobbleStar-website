import { z } from "zod";

export const snowflake = z.string().regex(/^\d{15,24}$/);
export const eventKinds = ["moderation", "members", "tickets", "gts", "chat", "private", "minigame"] as const;
export type EventKind = typeof eventKinds[number];
export const stages = ["reception", "en_cours", "bug", "a_fermer"] as const;
export const settingsSchema = z.object({
  staffRole: snowflake.optional(), adminRole: snowflake.optional(),
  channels: z.partialRecord(z.enum(eventKinds), snowflake).default({}),
  categories: z.partialRecord(z.enum(stages), snowflake).default({}),
  watched: z.array(snowflake).max(100).default([]),
  retentionDays: z.number().int().min(1).max(90).default(30),
  privateEnabled: z.boolean().default(false),
});
export type Settings = z.infer<typeof settingsSchema>;
export const bridgeSchema = z.object({
  serverId: z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/),
  events: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9:_-]{1,100}$/),
    kind: z.enum(["gts", "chat", "private", "minigame"]),
    text: z.string().min(1).max(6000),
    occurredAt: z.number().int().positive(),
  }).strict()).max(25),
}).strict();

export function plain(value: unknown, limit = 1800): string {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, limit);
}
export function summary(ticket: {subject: string; description: string; claimed_by?: string | null; close_reason?: string | null}) {
  return `Sujet : ${plain(ticket.subject, 120)}\nDemande : ${plain(ticket.description, 800)}\nStaff : ${ticket.claimed_by ?? "non attribué"}\nConclusion : ${plain(ticket.close_reason || "Fermeture confirmée sans conclusion renseignée", 800)}`;
}
export function inviteAttribution(before: Map<string, number>, after: {code: string; uses: number; inviter: string | null}[]) {
  const changes = after.filter(i => before.has(i.code) && i.uses > before.get(i.code)!);
  if (changes.length !== 1 || changes[0]!.uses - before.get(changes[0]!.code)! !== 1) return null;
  return changes[0]!;
}
export function mayConfirm(owner: string, actor: string, expires: Date | null, now = Date.now()) {
  return owner === actor && !!expires && expires.getTime() > now;
}
