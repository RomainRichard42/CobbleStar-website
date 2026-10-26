import type { Client } from "discord.js";

// The dashboard shares the running Gateway connection; it never logs in a second bot.
let active: Client | null = null;
export const discordClient = () => active?.isReady() ? active : null;
export function exposeDiscordClient(client: Client) { active = client; }
export function releaseDiscordClient(client: Client) { if (active === client) active = null; }
