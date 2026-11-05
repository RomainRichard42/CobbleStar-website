import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify';
import type {RowDataPacket,ResultSetHeader} from 'mysql2/promise';
import {z} from 'zod';
import {pool,transaction} from './db.js';
import {canReadGame,canWriteGame} from './game-admin.js';
import {config} from './config.js';

const serverId=z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/);
const species=z.string().regex(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/).max(160);
const amount=z.number().int().min(1).max(1_000_000);
const prices=z.object({iv1:amount,iv10:amount,iv31:amount,ev1:amount,ev10:amount,ev252:amount,level1:amount,level10:amount,level100:amount,gender:amount,sterile:amount,ability:amount,hiddenAbility:amount,nature:amount,tmBasic:amount,tmMedium:amount,tmStrong:amount}).strict();
export const playerServicesConfig=z.object({prices,tmPrices:z.record(z.string().regex(/^[a-z0-9]{1,64}$/),amount).refine(v=>Object.keys(v).length<=1000),huntCoins:z.array(z.number().int().min(0).max(1_000_000)).length(4),raidLegendaryPool:z.array(species).max(24).refine(v=>new Set(v).size===v.length)}).strict();
const revision=z.number().int().min(0).max(2_000_000_000);
const catalog=z.array(z.object({id:species,name:z.string().min(1).max(160)}).strict()).max(500);
type Auth={session:(r:FastifyRequest)=>Promise<{id:string;discord_id:string|null}|null>;server:(r:FastifyRequest)=>boolean};
const decode=(v:unknown)=>typeof v==='string'?JSON.parse(v):v;
export function registerPlayerServices(app:FastifyInstance,auth:Auth){
 const admin=async(r:FastifyRequest,reply:FastifyReply)=>{reply.header('Cache-Control','no-store');const actor=await auth.session(r);if(!actor)return reply.code(401).send({message:'Connexion administrateur requise.'});if(!(r.method==='GET'?canReadGame(actor):canWriteGame(actor)))return reply.code(403).send({message:'Accès administrateur requis.'});if(r.method!=='GET'&&r.headers.origin!==new URL(config.SITE_ORIGIN).origin)return reply.code(403).send({message:'Origine non autorisée.'});};
 const options={preHandler:admin,bodyLimit:400_000,config:{rateLimit:{max:60,timeWindow:'1 minute'}}};
 app.get('/api/admin/player-services',options,async()=>{const [rows]=await pool.query<RowDataPacket[]>('SELECT server_id AS serverId,revision,applied_revision AS appliedRevision,last_seen_at AS lastSeenAt,sync_error AS error FROM player_services_config ORDER BY server_id');return {servers:rows};});
 app.get('/api/admin/player-services/:serverId',options,async(r,reply)=>{
  const parsed=z.object({serverId}).safeParse(r.params);if(!parsed.success)return reply.code(400).send({message:'Serveur invalide.'});
  const [rows]=await pool.execute<RowDataPacket[]>('SELECT * FROM player_services_config WHERE server_id=?',[parsed.data.serverId]);if(!rows[0])return reply.code(404).send({message:'Le serveur doit se connecter une première fois pour charger ses réglages.'});const row=rows[0];return {serverId:row.server_id,revision:row.revision,appliedRevision:row.applied_revision,lastSeenAt:row.last_seen_at,error:row.sync_error,config:decode(row.config_json),catalog:decode(row.observed_json),canWrite:canWriteGame((await auth.session(r))!)};
 });
 app.put('/api/admin/player-services/:serverId',options,async(r,reply)=>{
  const params=z.object({serverId}).safeParse(r.params),input=z.object({revision,config:playerServicesConfig}).strict().safeParse(r.body);if(!params.success||!input.success)return reply.code(400).send({message:'Vérifie les tarifs et les espèces sélectionnées.'});
  return transaction(async db=>{const [rows]=await db.query<RowDataPacket[]>('SELECT * FROM player_services_config WHERE server_id=? FOR UPDATE',[params.data.serverId]);const row=rows[0];if(!row)return reply.code(404).send({message:'Serveur inconnu.'});if(row.revision!==input.data.revision)return reply.code(409).send({message:'Les réglages ont changé. Recharge la page.'});const known=catalog.parse(decode(row.observed_json));if(input.data.config.raidLegendaryPool.some(id=>!known.some(p=>p.id===id)))return reply.code(400).send({message:'Un légendaire sélectionné est absent du serveur.'});await db.execute('UPDATE player_services_config SET config_json=?,revision=revision+1,updated_by=? WHERE server_id=?',[JSON.stringify(input.data.config),(await auth.session(r))!.id,params.data.serverId]);return {ok:true,revision:row.revision+1};});
 });
 app.post('/api/internal/player-services/sync',{bodyLimit:400_000,config:{rateLimit:{max:12,timeWindow:'1 minute'}},preHandler:async(r,reply)=>{if(!auth.server(r))return reply.code(401).send({error:'INVALID_SERVER_KEY'});}},async(r,reply)=>{
  const input=z.object({serverId,appliedRevision:revision,error:z.string().max(300),config:playerServicesConfig,legendaries:catalog}).strict().safeParse(r.body);if(!input.success)return reply.code(400).send({error:'INVALID_INPUT'});const b=input.data;
  return transaction(async db=>{await db.execute('INSERT IGNORE INTO player_services_config(server_id,config_json,observed_json) VALUES(?,?,?)',[b.serverId,JSON.stringify(b.config),JSON.stringify(b.legendaries)]);await db.execute('UPDATE player_services_config SET observed_json=?,applied_revision=?,last_seen_at=NOW(),sync_error=? WHERE server_id=?',[JSON.stringify(b.legendaries),b.appliedRevision,b.error,b.serverId]);const [rows]=await db.query<RowDataPacket[]>('SELECT revision,config_json FROM player_services_config WHERE server_id=?',[b.serverId]);return {revision:rows[0]!.revision,config:decode(rows[0]!.config_json)};});
 });
}
