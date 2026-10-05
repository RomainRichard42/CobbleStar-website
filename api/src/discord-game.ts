import {z} from "zod";
import type {FastifyInstance, FastifyRequest} from "fastify";
import type {RowDataPacket} from "mysql2/promise";
import {config} from "./config.js";
import {pool, transaction} from "./db.js";
import {settings, json} from "./discord-store.js";
import {gradeIds, premiumIds, rankedIds, type Settings} from "./discord-policy.js";

const uuid=z.string().regex(/^[0-9a-f]{32}$/);
export const gameProfileSchema=z.object({uuid, grade:z.enum(gradeIds), ranked:z.enum(rankedIds).nullable(),
  club:z.string().regex(/^[a-z0-9_-]{1,64}$/).nullable(), premium:z.enum(premiumIds).nullable().optional()}).strict();
export type GameProfile=z.infer<typeof gameProfileSchema>;
export const gameStateSchema=z.object({
  serverId:z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/), sessionId:z.string().uuid(),
  startedAt:z.number().int().positive().max(Number.MAX_SAFE_INTEGER), sequence:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  online:z.boolean(), maintenance:z.boolean(), players:z.number().int().min(0).max(100000),
  maxPlayers:z.number().int().min(1).max(100000), profiles:z.array(gameProfileSchema).max(100),
}).strict().refine(v=>v.online||v.players===0,{message:"Un serveur arrêté ne peut pas avoir de joueurs connectés"})
  .refine(v=>new Set(v.profiles.map(p=>p.uuid)).size===v.profiles.length,{message:"UUID répété"});
export type GameState=z.infer<typeof gameStateSchema>;
export function newerState(old:{started_at:number; session_id:string; sequence_no:number}|undefined, next:GameState) {
  return !old||next.startedAt>Number(old.started_at)||next.startedAt===Number(old.started_at)&&next.sessionId===old.session_id&&next.sequence>Number(old.sequence_no);
}
export function desiredRoles(s:Settings, profile:GameProfile|null, owned:string[]=[]) {
  if(!profile)return [];
  // Older mods or unavailable LuckPerms omit premium: preserve owned paid badges, never grant one.
  return [...new Set(s.roleMappings.filter(m=>m.source==="premium"&&profile.premium===undefined
    ?owned.includes(m.role):profile[m.source]===m.key).map(m=>m.role))];
}
export function statusNames(state:GameState|null, receivedAt:number, now=Date.now()) {
  if(!state)return {status:"⚪ Serveur : En attente",players:"👥 Joueurs : —"};
  const stale=now-receivedAt>120000;
  const label=!state.online?"🔴 Serveur : Hors ligne":stale?"🔴 Serveur : Sans réponse":state.maintenance?"🟠 Serveur : Maintenance":"🟢 Serveur : En ligne";
  return {status:label,players:`👥 Joueurs : ${stale||!state.online?0:state.players} / ${state.maxPlayers}`};
}
export function registerDiscordGame(app:FastifyInstance,authorized:(request:FastifyRequest)=>boolean) {
  app.post("/internal/discord/state",{bodyLimit:60000,config:{rateLimit:{max:30,timeWindow:"1 minute"}}},async(request,reply)=>{
    if(!authorized(request))return reply.code(401).send({error:"INVALID_SERVER_KEY"});
    if(!config.DISCORD_GATEWAY_ENABLED)return reply.code(503).send({error:"DISCORD_DISABLED"});
    const parsed=gameStateSchema.safeParse(request.body);
    if(!parsed.success||parsed.data.startedAt>Date.now()+300000)return reply.code(400).send({error:"INVALID_DISCORD_STATE"});
    const s=await settings(), value=parsed.data;
    if(value.serverId!==s.gameServerId)return reply.code(409).send({error:"DISCORD_SERVER_NOT_SELECTED"});
    await transaction(async c=>{
      // The insert establishes the row lock even on the first heartbeat. Competing sessions
      // are then ordered by server start time and sequence; stale shutdowns never win.
      await c.execute("INSERT IGNORE INTO discord_game_status (guild_id,server_id,session_id,started_at,sequence_no,state) VALUES (?,?,?,0,-1,?)",
        [config.DISCORD_GUILD_ID,value.serverId,value.sessionId,JSON.stringify(value)]);
      const [rows]=await c.query<RowDataPacket[]>("SELECT started_at,session_id,sequence_no FROM discord_game_status WHERE guild_id=? AND server_id=? FOR UPDATE",[config.DISCORD_GUILD_ID,value.serverId]);
      if(!newerState(rows[0] as {started_at:number;session_id:string;sequence_no:number}|undefined,value))return;
      await c.execute("UPDATE discord_game_status SET session_id=?,started_at=?,sequence_no=?,state=?,received_at=NOW() WHERE guild_id=? AND server_id=?",
        [value.sessionId,value.startedAt,value.sequence,JSON.stringify({...value,profiles:[]}),config.DISCORD_GUILD_ID,value.serverId]);
      for(const p of value.profiles) {
        // Keep only linked accounts. Discord identity is always resolved from the current
        // users table; the game cannot supply an arbitrary Discord user or role ID.
        await c.execute(`INSERT INTO discord_game_players (guild_id,server_id,uuid,profile)
          SELECT ?,?,?,? FROM users WHERE minecraft_uuid=? AND discord_id IS NOT NULL AND merged_into IS NULL AND minecraft_linked_at IS NOT NULL
          ON DUPLICATE KEY UPDATE profile=VALUES(profile),updated_at=NOW()`,
          [config.DISCORD_GUILD_ID,value.serverId,p.uuid,JSON.stringify(p),p.uuid]);
      }
    });
    return {ok:true};
  });
}
export async function gameStatus(serverId:string) {
  const [rows]=await pool.query<RowDataPacket[]>("SELECT state,received_at FROM discord_game_status WHERE guild_id=? AND server_id=?",[config.DISCORD_GUILD_ID,serverId]);
  return rows[0]?{state:gameStateSchema.parse(json(rows[0].state)),at:new Date(rows[0].received_at).getTime()}:null;
}
export interface RoleCandidate extends RowDataPacket {discord_id:string; uuid:string|null; owner_uuid:string|null; profile:string|GameProfile|null; roles:string|string[]|null;}
export async function roleCandidates(serverId:string,after:string) {
  const [rows]=await pool.query<RoleCandidate[]>(`SELECT ids.discord_id,u.minecraft_uuid AS uuid,r.uuid AS owner_uuid,p.profile,r.roles FROM (
    SELECT u.discord_id FROM users u JOIN discord_game_players p ON p.uuid=u.minecraft_uuid AND p.guild_id=? AND p.server_id=?
      WHERE u.discord_id IS NOT NULL AND u.merged_into IS NULL AND u.minecraft_linked_at IS NOT NULL
    UNION SELECT discord_id FROM discord_role_state WHERE guild_id=?
  ) ids LEFT JOIN users u ON u.discord_id=ids.discord_id AND u.merged_into IS NULL AND u.minecraft_linked_at IS NOT NULL
    LEFT JOIN discord_game_players p ON p.uuid=u.minecraft_uuid AND p.guild_id=? AND p.server_id=?
    LEFT JOIN discord_role_state r ON r.discord_id=ids.discord_id AND r.guild_id=?
    WHERE ids.discord_id>? ORDER BY ids.discord_id LIMIT 20`,
    [config.DISCORD_GUILD_ID,serverId,config.DISCORD_GUILD_ID,config.DISCORD_GUILD_ID,serverId,config.DISCORD_GUILD_ID,after]);
  return rows;
}
export async function saveRoleState(discordId:string, roles:string[], uuid:string|null) {
  await pool.execute("INSERT INTO discord_role_state (guild_id,discord_id,roles,uuid) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE roles=VALUES(roles),uuid=VALUES(uuid),updated_at=NOW()",
    [config.DISCORD_GUILD_ID,discordId,JSON.stringify(roles),uuid]);
}
