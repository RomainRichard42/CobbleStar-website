import test from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),GAME_ADMIN_DISCORD_IDS:'123'});
const prices=Object.fromEntries(['iv1','iv10','iv31','ev1','ev10','ev252','level1','level10','level100','gender','sterile','ability','hiddenAbility','nature','tmBasic','tmMedium','tmStrong'].map(k=>[k,100]));
const basic={prices,tmPrices:{},huntCoins:[2000,2000,5000,10000],raidLegendaryPool:['cobblemon:lugia']};
const extended={...basic,raidBossPools:{facile:[{species:'cobblemon:venusaur',heldItem:''}],difficile:[{species:'cobblemon:garchomp',heldItem:null}]},raidLegendaryItems:{'cobblemon:lugia':'cobblemon:leftovers'}};
const raidCatalog={pokemon:[{id:'cobblemon:venusaur',name:'Florizarre'},{id:'cobblemon:garchomp',name:'Carchacrok'}],items:[{id:'cobblemon:leftovers',name:'Restes'}],legendaryOneIn:{facile:0,difficile:40}};
test('boss editing validates server species/items and refuses altered legendary odds',async()=>{
 const {playerServicesConfig:s,validateRaidSelection:validate}=await import('../dist/player-services.js');const known={legendaries:[{id:'cobblemon:lugia',name:'Lugia'}],raidCatalog};
 assert.equal(validate(s.parse(extended),known),'');assert.equal(s.safeParse({...extended,legendaryOneIn:1}).success,false);
 assert.equal(s.safeParse({...extended,raidBossPools:{...extended.raidBossPools,facile:[]}}).success,false);
 assert.equal(s.safeParse({...extended,raidBossPools:{...extended.raidBossPools,facile:[...extended.raidBossPools.facile,...extended.raidBossPools.facile]}}).success,false);
 assert.ok(validate({...extended,raidLegendaryItems:{'cobblemon:mewtwo':''}},known));
 assert.ok(validate({...extended,raidLegendaryItems:{'cobblemon:lugia':'missing:item'}},known));
 assert.ok(validate({...extended,raidBossPools:{...extended.raidBossPools,facile:[{species:'cobblemon:lugia',heldItem:null}]}},known));
});
test('first updated server sync imports existing boss pools without overwriting queued admin selections',async()=>{
 const [{default:Fastify},{registerPlayerServices},{pool}]=await Promise.all([import('fastify'),import('../dist/player-services.js'),import('../dist/db.js')]);
 const original={getConnection:pool.getConnection};let row={revision:7,config_json:JSON.stringify({...basic,prices:{...prices,nature:321}}),observed_json:JSON.stringify([{id:'cobblemon:lugia',name:'Lugia'}])};const updates=[];
 pool.getConnection=async()=>({beginTransaction:async()=>{},query:async()=>[[{...row}],[]],execute:async(sql,args)=>{updates.push({sql,args});if(sql.includes('SET config_json')){row.config_json=args[0];row.revision++;}if(sql.includes('SET observed_json'))row.observed_json=args[0];return [{affectedRows:1},[]];},commit:async()=>{},rollback:async()=>{},release:()=>{}});
 const app=Fastify();registerPlayerServices(app,{session:async()=>null,server:()=>true});
 try{
  const large={...raidCatalog,pokemon:[...raidCatalog.pokemon,...Array.from({length:1000},(_,i)=>({id:`cobblemon:sample${i}`,name:`Exemple ${i}`}))]};
  const request={serverId:'main',appliedRevision:6,error:'',config:extended,legendaries:[{id:'cobblemon:lugia',name:'Lugia'}],raidCatalog:large};
  const first=await app.inject({method:'POST',url:'/api/internal/player-services/sync',payload:request});assert.equal(first.statusCode,200,first.body);assert.equal(first.json().revision,8);assert.equal(first.json().config.prices.nature,321);assert.deepEqual(first.json().config.raidBossPools,extended.raidBossPools);
  const second=await app.inject({method:'POST',url:'/api/internal/player-services/sync',payload:{...request,appliedRevision:8}});assert.equal(second.json().revision,8);assert.equal(updates.filter(x=>x.sql.includes('SET config_json')).length,1);
 }finally{pool.getConnection=original.getConnection;await app.close();await pool.end();}
});
