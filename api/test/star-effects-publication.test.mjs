import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildStarPack} from '../dist/star-assets.js';
test('FX publication is admin-only, transactional and never publishes Pokemon drafts',async()=>{
 Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),GAME_ADMIN_DISCORD_IDS:'123',GAME_ADMIN_READ_DISCORD_IDS:'456'});
 const [{default:Fastify},{registerStarStudio},{pool}]=await Promise.all([import('fastify'),import('../dist/star-studio.js'),import('../dist/db.js')]);
 const saved={query:pool.query,execute:pool.execute,getConnection:pool.getConnection};
 const file=name=>readFileSync(new URL('../../public/downloads/pokemon-star/dragonite/'+name,import.meta.url));
 const model=JSON.parse(file('dragonite.geo.json')),published={species:'dragonite',model,texture:file('dragonite.png').toString('base64')};
 const native={species:'dragonite',poser:'cobblemon:dragonite',bones:model['minecraft:geometry'][0].bones.map(({name,parent})=>({name,...(parent?{parent}:{})}))};
 let rows=[{published_json:JSON.stringify(published),draft_json:'invalid unfinished draft'},{published_json:null,draft_json:'another draft'}],calls=[],fail=false;
 pool.query=async()=>[[{catalog_json:JSON.stringify([native])}],[]];
 pool.getConnection=async()=>({
  beginTransaction:async()=>calls.push(['begin']),
  query:async sql=>{calls.push([sql]);return [sql.includes('star_models')?rows:[],[]];},
  execute:async(sql,args)=>{calls.push([sql,args]);if(fail)throw new Error('DB_WRITE_FAILED');return [[],[]];},
  commit:async()=>calls.push(['commit']),rollback:async()=>calls.push(['rollback']),release:()=>calls.push(['release'])
 });
 const app=Fastify();registerStarStudio(app,{session:async r=>r.headers.authorization?{id:'test',discord_id:r.headers.authorization==='admin'?'123':'456'}:null,server:()=>false});
 const post=(authorization,origin='http://localhost:3000')=>app.inject({method:'POST',url:'/api/admin/star/publish-effects',headers:{...(authorization?{authorization}:{}),origin},payload:{}});
 try{
  assert.equal((await post()).statusCode,401);assert.equal((await post('reader')).statusCode,403);assert.equal((await post('admin','http://bad.test')).statusCode,403);assert.equal(calls.length,0);
  assert.equal((await post('admin')).statusCode,200);
  const insert=calls.find(([sql])=>sql.startsWith('INSERT IGNORE'));
  assert.deepEqual(insert[1][1],buildStarPack([published],[native]));assert.deepEqual(JSON.parse(insert[1][2]),['dragonite']);
  assert.ok(calls.some(([sql])=>sql==='commit'));assert.ok(!calls.some(([sql])=>sql.startsWith('UPDATE star_models')));
  calls=[];rows=[];assert.equal((await post('admin')).statusCode,200);assert.deepEqual(calls.find(([sql])=>sql.startsWith('INSERT IGNORE'))[1][1],buildStarPack([],[]));
  calls=[];fail=true;assert.equal((await post('admin')).statusCode,400);assert.ok(calls.some(([sql])=>sql==='rollback'));assert.ok(!calls.some(([sql])=>sql==='commit'));
  // API deployment: the first authenticated sync publishes automatically, even concurrently.
  fail=false;calls=[];rows=[{published_json:JSON.stringify(published),draft_json:'unfinished'}];
  pool.execute=async()=>[[],[]];
  pool.query=async sql=>[[sql.includes('star_catalog')?{catalog_json:JSON.stringify([native])}:{sha1:'a'.repeat(40),species_json:'["dragonite"]'}],[]];
  const automatic=Fastify();registerStarStudio(automatic,{session:async()=>null,server:r=>r.headers.authorization==='server'});
  const sync=(target,authorized=true)=>target.inject({method:'POST',url:'/api/internal/star/sync',headers:authorized?{authorization:'server'}:{},payload:{serverId:'main',hash:'',ready:0,total:0,error:''}});
  try{
   assert.equal((await sync(automatic,false)).statusCode,401);assert.equal(calls.length,0);
   const results=await Promise.all([sync(automatic),sync(automatic)]);assert.ok(results.every(r=>r.statusCode===200));
   assert.equal(calls.filter(([sql])=>sql==='begin').length,1);
   assert.deepEqual(calls.find(([sql])=>sql.startsWith('INSERT IGNORE'))[1][1],buildStarPack([published],[native]));
   assert.ok(!calls.some(([sql])=>sql.startsWith('UPDATE star_models')));
   await sync(automatic);assert.equal(calls.filter(([sql])=>sql==='begin').length,1);
  }finally{await automatic.close();}
  fail=true;calls=[];const failing=Fastify();registerStarStudio(failing,{session:async()=>null,server:()=>true});
  try{
   const response=await sync(failing);assert.equal(response.statusCode,200);assert.equal(response.json().hash,'a'.repeat(40));
   assert.ok(calls.some(([sql])=>sql==='rollback'));
   await sync(failing);assert.equal(calls.filter(([sql])=>sql==='begin').length,1,'failed rebuild is throttled');
  }finally{await failing.close();}
 }finally{pool.query=saved.query;pool.execute=saved.execute;pool.getConnection=saved.getConnection;await app.close();await pool.end();}
});
