import type { FastifyInstance, FastifyRequest } from "fastify";
import { bridgeSchema } from "./discord-policy.js";
import { enqueue, settings } from "./discord-store.js";
import { config } from "./config.js";
import {registerDiscordGame} from "./discord-game.js";

export function registerDiscordBridge(app: FastifyInstance, authorized: (request: FastifyRequest) => boolean) {
  registerDiscordGame(app,authorized);
  app.post("/internal/discord/events", {bodyLimit: 256 * 1024}, async (request, reply) => {
    if (!authorized(request)) return reply.code(401).send({error: "INVALID_SERVER_KEY"});
    if (!config.DISCORD_GATEWAY_ENABLED) return reply.code(503).send({error: "DISCORD_DISABLED"});
    const parsed = bridgeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({error: "INVALID_DISCORD_EVENT"});
    const s = await settings();
    const accepted: string[] = [], disabled: string[] = [];
    for (const e of parsed.data.events) {
      if (!s.channels[e.kind] || (e.kind === "private" && (!s.privateEnabled || !s.adminRole))) { disabled.push(e.id); continue; }
      if (Math.abs(Date.now() - e.occurredAt) > 24 * 3600_000) { disabled.push(e.id); continue; }
      const stamp = new Date(e.occurredAt).toISOString();
      await enqueue(e.kind, `[${parsed.data.serverId}] ${stamp}\n${e.text}`, `${parsed.data.serverId}:${e.id}`);
      accepted.push(e.id);
    }
    return {accepted, disabled};
  });
}
