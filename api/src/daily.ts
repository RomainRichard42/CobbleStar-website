import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { config } from "./config.js";
import { canReadGame, canWriteGame } from "./game-admin.js";
import { gameUuid } from "./game-admin-schema.js";
import { dailyStore } from "./daily-store.js";
import { DailyError, dailyCalendar, monthSchema, resourceSchema } from "./daily-schema.js";
type Auth = { session: (r: FastifyRequest) => Promise<{ id: string; discord_id: string | null } | null>; server: (r: FastifyRequest) => boolean };
const who = z.object({ uuid: gameUuid, serverId: z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/) });
const revision = z.number().int().min(0).max(2_000_000_000);
export function registerDaily(app: FastifyInstance, auth: Auth, store = dailyStore) {
  app.register(async daily => {
    daily.addHook("onRequest", async (_req, reply) => { reply.header("Cache-Control", "no-store"); });
    daily.setErrorHandler((error, _request, reply) => {
      if (error instanceof DailyError) return reply.code(error.status).send({ error: error.code, message: error.message });
      if (error instanceof z.ZodError) return reply.code(400).send({ error: "INVALID_INPUT", message: "Vérifie le mois, les quantités et les objets sélectionnés." });
      daily.log.error(error, "Daily request failed");
      return reply.code(500).send({ error: "DAILY_UNAVAILABLE", message: "Le calendrier est temporairement indisponible." });
    });
    const admin = { config: { rateLimit: { max: 90, timeWindow: "1 minute" } }, preHandler: async (r: FastifyRequest, reply: import("fastify").FastifyReply) => {
      const a = await auth.session(r), write = r.method !== "GET";
      if (!a) return reply.code(401).send({ message: "Connecte-toi avec ton compte administrateur." });
      if (!(write ? canWriteGame(a) : canReadGame(a))) return reply.code(403).send({ message: "Accès administrateur requis." });
      if (write && r.headers.origin !== new URL(config.SITE_ORIGIN).origin) return reply.code(403).send({ message: "Origine non autorisée." });
    }};
    const internal = { bodyLimit: 5 * 1024 * 1024, config: { rateLimit: { max: 600, timeWindow: "1 minute" } }, preHandler: async (r: FastifyRequest, reply: import("fastify").FastifyReply) => {
      if (!auth.server(r)) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
    }};
    daily.get("/api/admin/daily/:month", admin, async r => {
      const { month } = z.object({ month: monthSchema }).parse(r.params);
      const a = (await auth.session(r))!;
      return { ...await store.admin(month), canWrite: canWriteGame(a) };
    });
    daily.put("/api/admin/daily/:month", admin, async r => {
      const { month } = z.object({ month: monthSchema }).parse(r.params);
      const body = z.object({ revision, content: dailyCalendar }).strict().parse(r.body);
      return { revision: await store.save(month, body.content, body.revision) };
    });
    daily.post("/api/admin/daily/:month/publish", admin, async r => {
      const { month } = z.object({ month: monthSchema }).parse(r.params);
      const body = z.object({ revision }).strict().parse(r.body);
      await store.publish(month, body.revision, (await auth.session(r))!.id);
      return { ok: true };
    });
    daily.post("/api/internal/daily/catalog", internal, async r => {
      const body = z.object({ serverId: who.shape.serverId, items: z.array(z.object({ id: resourceSchema, label: z.string().min(1).max(300) }).strict()).min(1).max(30_000) }).strict().parse(r.body);
      await store.syncCatalog(body.serverId, body.items); return { ok: true };
    });
    daily.get("/api/internal/daily", internal, async r => store.view(z.object({ uuid: gameUuid }).parse(r.query).uuid));
    daily.post("/api/internal/daily/claim", internal, async r => {
      const b = who.extend({ month: monthSchema }).strict().parse(r.body);
      return { claim: await store.reserve(b.uuid, b.serverId, b.month) };
    });
    daily.post("/api/internal/daily/dispatch", internal, async r => {
      const b = who.extend({ id: z.string().uuid() }).strict().parse(r.body);
      return store.dispatch(b.uuid, b.serverId, b.id);
    });
    daily.post("/api/internal/daily/result", internal, async r => {
      const b = who.extend({ id: z.string().uuid(), status: z.enum(["delivered", "review"]), message: z.string().max(300).default("") }).strict().parse(r.body);
      await store.result(b.uuid, b.serverId, b.id, b.status, b.message); return { ok: true };
    });
  });
}
