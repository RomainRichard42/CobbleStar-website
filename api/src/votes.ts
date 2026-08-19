import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const voteSiteSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,64}$/),
  name: z.string().min(1).max(80),
  url: z.string().max(500).default(""),
  intervalMinutes: z.number().int().min(15).max(43_200),
  enabled: z.boolean().default(false),
  accent: z.enum(["pink", "cyan", "yellow", "violet"]).default("cyan"),
  icon: z.string().min(1).max(4).default("✦"),
});

const catalogSchema = z.object({ sites: z.array(voteSiteSchema).max(12) });
export type VoteSite = z.infer<typeof voteSiteSchema>;

const fallbackSites: VoteSite[] = [
  { id: "portail_1", name: "Premier portail", url: "", intervalMinutes: 90, enabled: false, accent: "pink", icon: "✦" },
  { id: "portail_2", name: "Deuxième portail", url: "", intervalMinutes: 120, enabled: false, accent: "cyan", icon: "◉" },
  { id: "portail_3", name: "Troisième portail", url: "", intervalMinutes: 180, enabled: false, accent: "yellow", icon: "⌁" },
];

export function getVoteSites(): VoteSite[] {
  try {
    const parsed = catalogSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "vote-sites.json"), "utf8")));
    return parsed.sites;
  } catch {
    return fallbackSites;
  }
}

export function findVoteSite(id: string) {
  return getVoteSites().find((site) => site.id === id);
}

export function playerVoteUrl(site: VoteSite, username: string | null) {
  if (!site.enabled || !site.url) return null;
  return site.url.replaceAll("{username}", encodeURIComponent(username ?? ""));
}
