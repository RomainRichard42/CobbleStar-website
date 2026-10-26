import { createHash, randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ChannelType, PermissionFlagsBits as P, type Guild } from "discord.js";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { config } from "./config.js";
import { pool, transaction } from "./db.js";
import { canReadGame, canWriteGame } from "./game-admin.js";
import { discordClient } from "./discord-runtime.js";
import { safeSyncRole } from "./discord-game-bot.js";
import { gameStatus, statusNames } from "./discord-game.js";
import { json, settings } from "./discord-store.js";
import { settingsSchema, roleMapping, snowflake, gradeIds, premiumIds, rankedIds, type Settings } from "./discord-policy.js";

type Actor = { id: string; discord_id: string | null };
type Auth = { session: (request: FastifyRequest) => Promise<Actor | null> };
const fail = (statusCode: number, message: string): never => { throw Object.assign(new Error(message), { statusCode }); };
export const settingsVersion = (value: Settings) => createHash("sha256").update(JSON.stringify(settingsSchema.parse(value))).digest("hex");
export const discordSettingsInput = z.object({
  version: z.string().regex(/^[a-f0-9]{64}$/), reason: z.string().trim().min(5).max(300),
  roleSyncEnabled: z.boolean(), statusEnabled: z.boolean(),
  roleMappings: z.array(roleMapping).max(200),
  publicChannels: z.object({ gts: snowflake.nullable(), minigame: snowflake.nullable() }).strict(),
}).strict().superRefine((v, ctx) => {
  const seen = new Set<string>();
  for (const m of v.roleMappings) {
    const valid = m.source === "club" || (m.source === "grade" ? [...gradeIds] : m.source === "premium" ? [...premiumIds] : [...rankedIds]).includes(m.key as never);
    const key = `${m.source}:${m.key}`;
    if (!valid || seen.has(key)) ctx.addIssue({ code: "custom", message: "Association de rôle invalide ou répétée" });
    seen.add(key);
  }
});
export const memberRoleInput = z.object({
  requestId: z.string().uuid(), roleId: snowflake, assigned: z.boolean(), reason: z.string().trim().min(5).max(300),
}).strict();
const options = { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } };
const writeOptions = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

export function registerDiscordAdmin(app: FastifyInstance, auth: Auth, currentClient = discordClient) {
  async function authorize(request: FastifyRequest, reply: FastifyReply, write = false) {
    reply.header("Cache-Control", "no-store");
    const actor = await auth.session(request);
    if (!actor) { reply.code(401).send({ error: "AUTH_REQUIRED" }); return null; }
    if (!(write ? canWriteGame(actor) : canReadGame(actor))) { reply.code(403).send({ error: "ADMIN_REQUIRED" }); return null; }
    if (write && request.headers.origin !== new URL(config.SITE_ORIGIN).origin) { reply.code(403).send({ error: "INVALID_ORIGIN" }); return null; }
    return actor;
  }
  async function liveGuild(): Promise<Guild> {
    const client = currentClient();
    if (!client) return fail(503, "Le bot est hors ligne. Les actions Discord sont suspendues.");
    return client.guilds.fetch(config.DISCORD_GUILD_ID);
  }

  app.get("/api/admin/discord", options, async (request, reply) => {
    const actor = await authorize(request, reply); if (!actor) return;
    const s = await settings();
    const [[tickets], [outbox], [daily], [recentTickets], [events], [audit], state] = await Promise.all([
      pool.query<RowDataPacket[]>("SELECT status,COUNT(*) AS total FROM discord_tickets WHERE guild_id=? GROUP BY status", [config.DISCORD_GUILD_ID]),
      pool.query<RowDataPacket[]>("SELECT kind,COUNT(*) AS total,SUM(delivered_at IS NULL) AS pending,SUM(delivered_at IS NULL AND attempts>0) AS retrying,SUM(delivered_at IS NOT NULL) AS delivered FROM discord_event_outbox GROUP BY kind"),
      pool.query<RowDataPacket[]>("SELECT DATE_FORMAT(created_at,'%Y-%m-%d') AS day,COUNT(*) AS total,SUM(delivered_at IS NOT NULL) AS delivered FROM discord_event_outbox WHERE created_at>=DATE_SUB(UTC_DATE(),INTERVAL 29 DAY) GROUP BY DATE_FORMAT(created_at,'%Y-%m-%d') ORDER BY day"),
      pool.query<RowDataPacket[]>("SELECT id,channel_id AS channelId,owner_id AS ownerId,subject,status,claimed_by AS claimedBy,created_at AS createdAt FROM discord_tickets WHERE guild_id=? ORDER BY created_at DESC LIMIT 30", [config.DISCORD_GUILD_ID]),
      pool.query<RowDataPacket[]>("SELECT e.id,e.title,e.kind,e.status,e.channel_id AS channelId,e.message_id AS messageId,e.starts_at_ms AS startsAt,e.ends_at_ms AS endsAt,(SELECT COUNT(*) FROM discord_community_participants p WHERE p.event_id=e.id AND p.status='confirmed') AS participants FROM discord_community_events e WHERE e.guild_id=? ORDER BY e.starts_at_ms DESC LIMIT 30", [config.DISCORD_GUILD_ID]),
      pool.query<RowDataPacket[]>("SELECT id,actor_discord_id AS actorId,action,reason,status,created_at AS createdAt FROM discord_admin_audit WHERE guild_id=? ORDER BY created_at DESC LIMIT 30", [config.DISCORD_GUILD_ID]),
      gameStatus(s.gameServerId),
    ]);
    let live = null;
    let liveError: string | null = null;
    if (currentClient()) {
      try {
        const g = await liveGuild();
        const [roles, channels, me] = await Promise.all([g.roles.fetch(), g.channels.fetch(), g.members.fetchMe()]);
        const mapped = new Set(s.roleMappings.map(m => m.role));
        live = {
          name: g.name, memberCount: g.memberCount, icon: g.iconURL({ size: 128 }),
          botName: me.user.username, botId: me.id, latency: Math.max(0, Math.round(g.client.ws.ping)),
          roles: [...roles.values()].sort((a, b) => b.position - a.position).map(r => ({
            id: r.id, name: r.name, color: r.hexColor, position: r.position, managed: r.managed,
            syncSafe: safeSyncRole(r, me, s), manualSafe: safeSyncRole(r, me, s) && !mapped.has(r.id),
          })),
          channels: [...channels.values()].filter(c => c !== null).map(c => ({
            id: c.id, name: c.name, type: c.type, parentId: c.parentId,
            canSend: c.type === ChannelType.GuildText && !!c.permissionsFor(me)?.has([P.ViewChannel, P.SendMessages, P.AttachFiles]),
            canManage: !!c.permissionsFor(me)?.has(P.ManageChannels),
          })).sort((a, b) => a.name.localeCompare(b.name)),
        };
      } catch { liveError = "Discord ne répond pas ou le bot n’a pas accès au serveur."; }
    } else liveError = "Bot hors ligne. Les données conservées restent consultables.";
    return { generatedAt: new Date().toISOString(), guildId: config.DISCORD_GUILD_ID, canWrite: canWriteGame(actor),
      live, liveError, settings: s, version: settingsVersion(s), tickets, outbox, daily, recentTickets, events, audit,
      minecraft: { ...statusNames(state?.state ?? null, state?.at ?? 0), receivedAt: state?.at ?? null, stale: !state || Date.now() - state.at > 120000 },
    };
  });

  app.get("/api/admin/discord/members", options, async (request, reply) => {
    if (!await authorize(request, reply)) return;
    const { q, after } = z.object({ q: z.string().trim().max(64).default(""), after: snowflake.optional() }).strict().parse(request.query);
    const g = await liveGuild();
    const members = q ? await g.members.search({ query: q, limit: 50 }) : await g.members.list({ limit: 50, ...(after ? { after } : {}) });
    return { members: [...members.values()].map(m => ({ id: m.id, name: m.displayName, username: m.user.username,
      avatar: m.displayAvatarURL({ size: 64 }), bot: m.user.bot, joinedAt: m.joinedTimestamp,
      roles: [...m.roles.cache.keys()].filter(id => id !== g.id), manageable: m.manageable && !m.user.bot,
    })), next: !q && members.size === 50 ? members.lastKey() : null, truncated: !!q && members.size === 50 };
  });

  app.put("/api/admin/discord/settings", writeOptions, async (request, reply) => {
    const actor = await authorize(request, reply, true); if (!actor) return;
    const input = discordSettingsInput.parse(request.body);
    const g = await liveGuild();
    const [roles, channels, me] = await Promise.all([g.roles.fetch(), g.channels.fetch(), g.members.fetchMe()]);
    await transaction(async c => {
      await c.execute("INSERT IGNORE INTO discord_settings(guild_id,settings) VALUES(?,?)", [g.id, JSON.stringify(settingsSchema.parse({}))]);
      const [rows] = await c.query<RowDataPacket[]>("SELECT settings FROM discord_settings WHERE guild_id=? FOR UPDATE", [g.id]);
      const previous = settingsSchema.parse(json(rows[0]!.settings));
      if (settingsVersion(previous) !== input.version) return fail(409, "La configuration a changé. Actualise la page avant de réessayer.");
      for (const m of input.roleMappings) {
        const r = roles.get(m.role);
        // Even disabled mappings cannot introduce privileged roles for a later activation.
        if (!r || !safeSyncRole(r, me, previous)) return fail(400, "Un rôle est absent, privilégié ou au-dessus du bot.");
      }
      const next = settingsSchema.parse({ ...previous, roleSyncEnabled: input.roleSyncEnabled, statusEnabled: input.statusEnabled, roleMappings: input.roleMappings });
      for (const kind of ["gts", "minigame"] as const) {
        const id = input.publicChannels[kind];
        if (!id) { delete next.channels[kind]; continue; }
        const channel = channels.get(id);
        if (!channel || channel.type !== ChannelType.GuildText || !channel.permissionsFor(me)?.has([P.ViewChannel, P.SendMessages, P.AttachFiles])) return fail(400, "Le bot doit pouvoir voir le salon, écrire et joindre des fichiers.");
        next.channels[kind] = id;
      }
      if (next.statusEnabled) {
        const category = next.statusCategory && channels.get(next.statusCategory);
        if (!category || category.type !== ChannelType.GuildCategory) return fail(400, "Configure les compteurs avec /csconfig serveur avant de les activer ici.");
        for (const id of [next.statusChannel, next.playersChannel]) {
          const ch = id && channels.get(id);
          if (!ch || ch.type !== ChannelType.GuildVoice || ch.parentId !== category.id || !ch.permissionsFor(me)?.has(P.ManageChannels)) return fail(400, "Un compteur est absent ou inaccessible au bot.");
        }
      }
      await c.execute("UPDATE discord_settings SET settings=? WHERE guild_id=?", [JSON.stringify(next), g.id]);
      await c.execute("INSERT INTO discord_admin_audit(id,guild_id,actor_discord_id,action,reason,payload,status,completed_at) VALUES(?,?,?,?,?,?, 'done',UTC_TIMESTAMP())", [randomUUID(), g.id, actor.discord_id, "settings", input.reason, JSON.stringify({ before: previous, after: next })]);
    });
    return { ok: true };
  });

  app.put("/api/admin/discord/members/:id/role", writeOptions, async (request, reply) => {
    const actor = await authorize(request, reply, true); if (!actor) return;
    const { id } = z.object({ id: snowflake }).parse(request.params);
    const input = memberRoleInput.parse(request.body);
    const g = await liveGuild();
    const s = await settings();
    const [roles, me, member] = await Promise.all([g.roles.fetch(), g.members.fetchMe(), g.members.fetch({ user: id, force: true })]);
    const role = roles.get(input.roleId);
    if (!role || !safeSyncRole(role, me, s) || s.roleMappings.some(m => m.role === role.id)) return fail(400, "Ce rôle est protégé ou géré par Minecraft. Modifie sa source en jeu.");
    if (member.user.bot || !member.manageable) return fail(400, "Ce membre est protégé par la hiérarchie Discord.");
    const payload = JSON.stringify({ memberId: id, roleId: role.id, assigned: input.assigned });
    const fresh = await transaction(async c => {
      const [result] = await c.execute<import("mysql2/promise").ResultSetHeader>("INSERT IGNORE INTO discord_admin_audit(id,guild_id,actor_discord_id,action,reason,payload,status) VALUES(?,?,?,?,?,?, 'pending')", [input.requestId, g.id, actor.discord_id, "member_role", input.reason, payload]);
      if (result.affectedRows) return true;
      const [rows] = await c.query<RowDataPacket[]>("SELECT guild_id,actor_discord_id,payload,status FROM discord_admin_audit WHERE id=?", [input.requestId]);
      const old = rows[0]!;
      const original = json<{memberId: string; roleId: string; assigned: boolean}>(old.payload);
      if (old.guild_id !== g.id || old.actor_discord_id !== actor.discord_id || original.memberId !== id || original.roleId !== role.id || original.assigned !== input.assigned) return fail(409, "Identifiant de demande déjà utilisé.");
      if (old.status !== "done") return fail(409, "Demande déjà traitée ou en cours. Actualise le membre pour vérifier son rôle.");
      return false;
    });
    if (!fresh) return { ok: true, duplicate: true };
    try {
      const reason = `Panneau CobbleStar · ${actor.discord_id} · ${input.reason}`;
      if (input.assigned) await member.roles.add(role.id, reason); else await member.roles.remove(role.id, reason);
      await pool.execute("UPDATE discord_admin_audit SET status='done',completed_at=UTC_TIMESTAMP() WHERE id=?", [input.requestId]);
    } catch {
      await pool.execute("UPDATE discord_admin_audit SET status='unknown',completed_at=UTC_TIMESTAMP() WHERE id=?", [input.requestId]);
      return fail(502, "Discord n’a pas confirmé le changement. Actualise le membre avant de réessayer.");
    }
    return { ok: true };
  });
}
