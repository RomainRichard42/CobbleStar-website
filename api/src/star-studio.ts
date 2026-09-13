import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { RowDataPacket } from "mysql2/promise";
import { createHash } from "node:crypto";
import { z } from "zod";
import { pool, transaction } from "./db.js";
import { config } from "./config.js";
import { canReadGame, canWriteGame } from "./game-admin.js";
import { buildStarPack, validateStar, type NativeModel, type StarModel } from "./star-assets.js";
import { createQuestUploadReceiver } from "./quest-sync-upload.js";
type Actor={id:string;discord_id:string|null};
type Auth={session:(r:FastifyRequest)=>Promise<Actor|null>;server:(r:FastifyRequest)=>boolean};
const decode=(v:unknown)=>typeof v==="string"?JSON.parse(v):v;
const params=z.object({species:z.string().regex(/^[a-z0-9_]{1,80}$/)});
const catalogSchema=z.array(z.object({species:z.string().regex(/^[a-z0-9_]{1,80}$/),poser:z.string().regex(/^cobblemon:[a-z0-9_./-]+$/),bones:z.array(z.object({name:z.string().max(80),parent:z.string().max(80).optional()})).max(256)})).max(2000);
export function registerStarStudio(app:FastifyInstance,auth:Auth){
 const receiveUpload=createQuestUploadReceiver(Date.now,"STAR");
 async function authorize(r:FastifyRequest,reply:FastifyReply,write=false){
  reply.header("Cache-Control","no-store");const actor=await auth.session(r);
  if(!actor){reply.code(401).send({error:"AUTH_REQUIRED"});return null;}
  if(!(write?canWriteGame(actor):canReadGame(actor))){reply.code(403).send({error:"GAME_ADMIN_REQUIRED"});return null;}
  if(write&&r.headers.origin!==new URL(config.SITE_ORIGIN).origin){reply.code(403).send({error:"INVALID_ORIGIN"});return null;}return actor;
 }
 async function catalog(){const [rows]=await pool.query<RowDataPacket[]>("SELECT catalog_json FROM star_catalog WHERE id=1");return (rows[0]?decode(rows[0].catalog_json):[]) as NativeModel[];}
 app.get("/api/admin/star",async(r,reply)=>{
  const actor=await authorize(r,reply);if(!actor)return;
  const [[models],[servers],[publication],native]=await Promise.all([pool.query<RowDataPacket[]>("SELECT species,revision,published_revision AS publishedRevision,updated_at AS updatedAt FROM star_models ORDER BY species"),pool.query<RowDataPacket[]>("SELECT * FROM star_servers"),pool.query<RowDataPacket[]>("SELECT sha1 FROM star_publication WHERE id=1"),catalog()]);
  return {models,servers,hash:publication[0]?.sha1??"",catalog:native.map(n=>({species:n.species,poser:n.poser})),canWrite:canWriteGame(actor)};
 });
 app.put("/api/admin/star/:species",{bodyLimit:8*1024*1024,config:{rateLimit:{max:20,timeWindow:"1 minute"}}},async(r,reply)=>{
  const actor=await authorize(r,reply,true);if(!actor)return;const {species}=params.parse(r.params);
  const input=z.object({expectedRevision:z.number().int().nonnegative(),asset:z.unknown()}).parse(r.body);
  const native=(await catalog()).find(n=>n.species===species);if(!native)return reply.code(409).send({error:"SERVER_CATALOG_REQUIRED"});
  let asset:StarModel;try{asset=validateStar(input.asset,native);}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"INVALID_MODEL"});}
  const result=await transaction(async db=>{
   await db.query("SELECT id FROM star_publication WHERE id=1 FOR UPDATE");
   const [rows]=await db.execute<RowDataPacket[]>("SELECT revision FROM star_models WHERE species=? FOR UPDATE",[species]);
   if((rows[0]?.revision??0)!==input.expectedRevision)return false;
   await db.execute("INSERT INTO star_models(species,draft_json,actor_id) VALUES(?,?,?) ON DUPLICATE KEY UPDATE draft_json=VALUES(draft_json),actor_id=VALUES(actor_id),revision=revision+1",[species,JSON.stringify(asset),actor.id]);return true;
  });return result?{ok:true}:reply.code(409).send({error:"DRAFT_CHANGED_REFRESH"});
 });
 app.post("/api/admin/star/:species/publish",async(r,reply)=>{
  if(!await authorize(r,reply,true))return;const {species}=params.parse(r.params);
  const {revision}=z.object({revision:z.number().int().positive()}).parse(r.body);const native=await catalog();
  try{return await transaction(async db=>{
   await db.query("SELECT id FROM star_publication WHERE id=1 FOR UPDATE");
   const [rows]=await db.query<RowDataPacket[]>("SELECT * FROM star_models ORDER BY species FOR UPDATE");
   const selected=rows.find(row=>row.species===species);if(!selected||selected.revision!==revision)return reply.code(409).send({error:"DRAFT_CHANGED_REFRESH"});
   const assets=rows.flatMap(row=>row.species===species?[decode(row.draft_json)]:row.published_json?[decode(row.published_json)]:[]) as StarModel[];
   const pack=buildStarPack(assets,native),sha1=createHash("sha1").update(pack).digest("hex"),speciesList=assets.map(a=>a.species).sort();
   await db.execute("INSERT IGNORE INTO star_packs(sha1,pack,species_json) VALUES(?,?,?)",[sha1,pack,JSON.stringify(speciesList)]);
   await db.execute("UPDATE star_models SET published_json=draft_json,published_revision=revision WHERE species=?",[species]);
   await db.execute("UPDATE star_publication SET sha1=? WHERE id=1",[sha1]);return {ok:true,hash:sha1};
  });}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"PUBLICATION_FAILED"});}
 });
 const serverAuth=async(r:FastifyRequest,reply:FastifyReply)=>{if(!auth.server(r))return reply.code(401).send({error:"INVALID_SERVER_KEY"});};
 app.post("/api/internal/star/sync",{bodyLimit:4*1024*1024,config:{rateLimit:{max:120,timeWindow:"1 minute"}},onRequest:serverAuth},async(r,reply)=>sync(r,reply,r.body));
 app.post("/api/internal/star/sync-chunk",{bodyLimit:96*1024,config:{rateLimit:{max:1800,timeWindow:"1 minute"}},onRequest:serverAuth},async(r,reply)=>{
  reply.header("Cache-Control","no-store");const result=await receiveUpload(r.body);
  return result.complete?sync(r,reply,result.body):result;
 });
 async function sync(r:FastifyRequest,reply:FastifyReply,value:unknown){
  if(!auth.server(r))return reply.code(401).send({error:"INVALID_SERVER_KEY"});
  const body=z.object({serverId:z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/),hash:z.string().regex(/^([a-f0-9]{40})?$/),ready:z.number().int().min(0),total:z.number().int().min(0),error:z.string().max(400),catalog:catalogSchema.min(1).optional()}).parse(value);
  if(body.catalog)await pool.execute("INSERT INTO star_catalog(id,catalog_json) VALUES(1,?) ON DUPLICATE KEY UPDATE catalog_json=VALUES(catalog_json)",[JSON.stringify(body.catalog)]);
  await pool.execute("INSERT INTO star_servers(server_id,applied_hash,ready_clients,total_clients,last_error) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE applied_hash=VALUES(applied_hash),ready_clients=VALUES(ready_clients),total_clients=VALUES(total_clients),last_error=VALUES(last_error),seen_at=CURRENT_TIMESTAMP",[body.serverId,body.hash,body.ready,body.total,body.error]);
  const [rows]=await pool.query<RowDataPacket[]>("SELECT p.sha1,k.species_json FROM star_publication p LEFT JOIN star_packs k ON k.sha1=p.sha1 WHERE p.id=1");
  reply.header("Cache-Control","no-store");return {schema:1,hash:rows[0]?.sha1??"",species:rows[0]?.species_json?decode(rows[0].species_json):[],catalogAccepted:!!body.catalog};
 }
 app.get("/api/star/packs/:hash.zip",{config:{rateLimit:{max:300,timeWindow:"1 minute"}}},async(r,reply)=>{
  const {hash}=z.object({hash:z.string().regex(/^[a-f0-9]{40}$/)}).parse(r.params);
  const [rows]=await pool.execute<RowDataPacket[]>("SELECT pack FROM star_packs WHERE sha1=?",[hash]);if(!rows[0])return reply.code(404).send({error:"PACK_NOT_FOUND"});
  return reply.type("application/zip").header("Cache-Control","public,max-age=31536000,immutable").send(rows[0].pack);
 });
}
