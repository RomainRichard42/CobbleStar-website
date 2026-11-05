import test from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),GAME_ADMIN_DISCORD_IDS:'123',GAME_ADMIN_READ_DISCORD_IDS:'456'});
const config={prices:{iv1:10,iv10:100,iv31:310,ev1:5,ev10:50,ev252:1260,level1:5,level10:50,level100:500,gender:100,sterile:200,ability:100,hiddenAbility:300,nature:200,tmBasic:100,tmMedium:200,tmStrong:300},tmPrices:{},huntCoins:[2000,2000,5000,10000],raidLegendaryPool:['cobblemon:mewtwo']};
test('player-service configuration bounds, exact price keys and unique server species',async()=>{
 const {playerServicesConfig:s}=await import('../dist/player-services.js');assert.deepEqual(s.parse(config),config);
 for(const change of [{prices:{...config.prices,nature:0}},{prices:{...config.prices,nature:1.5}},{huntCoins:[2000]},{raidLegendaryPool:['cobblemon:mewtwo','cobblemon:mewtwo']},{tmPrices:{'../escape':100}},{prices:{...config.prices,arbitrary:1}}])assert.equal(s.safeParse({...config,...change}).success,false);
});
test('configuration retains admin access and origin checks; stale edits and unknown legends fail',async()=>{
 const [{default:Fastify},{registerPlayerServices},{pool}]=await Promise.all([import('fastify'),import('../dist/player-services.js'),import('../dist/db.js')]);
 const old={query:pool.query,execute:pool.execute,getConnection:pool.getConnection};let writes=0;
 const row={server_id:'main',revision:3,applied_revision:3,last_seen_at:null,sync_error:'',config_json:JSON.stringify(config),observed_json:JSON.stringify([{id:'cobblemon:mewtwo',name:'Mewtwo'}])};
 pool.query=async()=>[[row],[]];pool.execute=async()=>[[row],[]];pool.getConnection=async()=>({beginTransaction:async()=>{},query:async()=>[[row],[]],execute:async()=>{writes++;return[{affectedRows:1},[]];},commit:async()=>{},rollback:async()=>{},release:()=>{}});
 const app=Fastify();registerPlayerServices(app,{session:async r=>r.headers.authorization?{id:'actor',discord_id:r.headers.authorization==='writer'?'123':'456'}:null,server:r=>r.headers['x-server-key']==='test'});
 const request=(method,auth,body,origin='http://localhost:3000')=>app.inject({method,url:'/api/admin/player-services/main',headers:{...(auth?{authorization:auth}:{}),origin},...(body?{payload:body}:{})});
 try{
  assert.equal((await request('GET')).statusCode,401);assert.equal((await request('GET','reader')).statusCode,200);
  assert.equal((await request('PUT','reader',{revision:3,config})).statusCode,403);assert.equal((await request('PUT','writer',{revision:3,config},'https://other.test')).statusCode,403);
  assert.equal((await request('PUT','writer',{revision:2,config})).statusCode,409);assert.equal((await request('PUT','writer',{revision:3,config:{...config,raidLegendaryPool:['cobblemon:pikachu']}})).statusCode,400);assert.equal(writes,0);
  const response=await request('PUT','writer',{revision:3,config});assert.equal(response.statusCode,200);assert.equal(response.json().revision,4);assert.equal(writes,1);
  assert.equal((await app.inject({method:'POST',url:'/api/internal/player-services/sync',payload:{}})).statusCode,401);
 }finally{pool.query=old.query;pool.execute=old.execute;pool.getConnection=old.getConnection;await app.close();await pool.end();}
});
