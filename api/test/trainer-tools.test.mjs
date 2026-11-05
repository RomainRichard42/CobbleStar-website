import test from 'node:test';import assert from 'node:assert/strict';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),GAME_ADMIN_DISCORD_IDS:'123'});
const {calcCatalog,calculateServerDamage,calcInput,registerPokecalc}=await import('../dist/pokecalc.js');
const {battleSchema,summarizeBattleUsage,registerBattleUsage}=await import('../dist/battle-usage.js');
const fighter=(id,ability)=>({id,ability});
const input={attacker:fighter('charizard--asteria','blaze'),defender:fighter('blastoise--normal','torrent'),move:'thunderbolt'};
const stats={hp:31,atk:31,def:31,spa:31,spd:31,spe:31},evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
const pokemon={species:'cobblemon:charizard',form:'Asteria',appearance:'cobblemon:charizard#cobblestar_asteria',shiny:false,star:false,level:50,ability:'blaze',nature:'serious',item:'',moves:['thunderbolt','flamethrower'],types:['fire','electric'],ivs:stats,evs,stats:{hp:153,atk:104,def:98,spa:129,spd:105,spe:120}};
const battle={id:'00000000-0000-4000-8000-000000000001',startedAt:new Date(Date.now()-60000).toISOString(),endedAt:new Date().toISOString(),mode:'ranked_solo',outcome:'finished',modVersion:'6.51.24',teams:[{slot:0,won:true,pokemon:[pokemon]}]};
test('regional type and STAB use the server data, with real calculation and ordinary immunity',()=>{
 const result=calculateServerDamage(input);assert.deepEqual(result.attacker.types,['Fire','Electric']);assert.deepEqual(result.damage,{min:104,max:126,minPercent:104/154*100,maxPercent:126/154*100});
 const immune=calculateServerDamage({...input,defender:fighter('garchomp--normal','roughskin')});assert.equal(immune.damage.max,0);
 const normal=calculateServerDamage({...input,attacker:fighter('charizard--normal','blaze'),move:'flamethrower'});const regional=calculateServerDamage({...input,move:'flamethrower'});assert.deepEqual(regional.damage,normal.damage);
 const rain=calculateServerDamage({...input,move:'flamethrower',field:{weather:'Rain'}});assert.ok(rain.damage.max<regional.damage.max);
});
test('calculator rejects invalid EV totals, unknown forms, illegal abilities/moves and arbitrary fields',()=>{
 assert.throws(()=>calculateServerDamage({...input,attacker:{...input.attacker,evs:{hp:252,atk:252,def:252,spa:0,spd:0,spe:0}}}));
 assert.throws(()=>calculateServerDamage({...input,attacker:{...input.attacker,id:'admin-only'}}));assert.throws(()=>calculateServerDamage({...input,attacker:{...input.attacker,ability:'wonderguard'}}));assert.throws(()=>calculateServerDamage({...input,move:'spacialrend'}));
 assert.equal(calcInput.safeParse({...input,overrides:{baseStats:{spa:9999}}}).success,false);
 const c=calcCatalog();assert.ok(c.pokemon.filter(p=>p.custom).length>=30);assert.ok(c.pokemon.some(p=>p.id==='chikorita--asteria'));assert.equal(c.items.find(i=>i.id==='choicespecs').name,'Lunettes Choix');assert.ok(!c.pokemon.some(p=>/allodus|patapouf|cobblestar_egg/.test(p.id)));
});
test('usage counts teams without duplicate species inflation, separates forms and preserves exact sets',()=>{
 const b=structuredClone(battle);b.teams[0].pokemon.push({...pokemon,star:true,appearance:pokemon.appearance+',cobblestar-star'});b.teams.push({slot:1,won:false,pokemon:[{...pokemon,form:'Normal',appearance:'cobblemon:charizard'}]});const result=summarizeBattleUsage([b]);assert.equal(result.teams,2);assert.equal(result.entries.length,2);const regional=result.entries.find(r=>r.form==='Asteria');assert.equal(regional.usage,50);assert.equal(regional.copies,2);assert.equal(regional.star,1);assert.equal(regional.sets.length,2);assert.equal(regional.winRate,100);assert.equal(regional.sets[0].pokemon.stats.spa,129);assert.equal(regional.moves.find(m=>m.value==='thunderbolt').count,2);
 const fled={...battle,outcome:'fled',teams:[{slot:0,won:null,pokemon:[pokemon]}]};assert.equal(summarizeBattleUsage([fled]).entries[0].winRate,null);
});
test('telemetry rejects player identities, duplicate sides, future timestamps and malformed samples',()=>{
 assert.equal(battleSchema.safeParse(battle).success,true);const punctuation=structuredClone(battle);punctuation.teams[0].pokemon[0].appearance='cobblemon:unown#?,shiny';assert.equal(battleSchema.safeParse(punctuation).success,true);assert.equal(battleSchema.safeParse({...battle,username:'secret'}).success,false);
 assert.equal(battleSchema.safeParse({...battle,teams:[...battle.teams,...battle.teams]}).success,false);assert.equal(battleSchema.safeParse({...battle,endedAt:'2099-01-01T00:00:00.000Z'}).success,false);
});
test('private stats require an admin, telemetry requires server auth; retries are idempotent; calculator remains public',async()=>{
 const {default:Fastify}=await import('fastify');const app=Fastify();const saved=new Map();let reads=0;
 registerBattleUsage(app,{session:async r=>r.headers.authorization?{id:'test',discord_id:r.headers.authorization==='admin'?'123':'999'}:null,server:r=>r.headers.authorization==='server'},{insert:async(serverId,battles)=>{for(const b of battles)saved.set(serverId+':'+b.id,b);return battles.map(b=>b.id);},read:async()=>{reads++;return {battles:[...saved.values()],total:saved.size};}});registerPokecalc(app);
 try{
  assert.equal((await app.inject({url:'/api/admin/battle-usage'})).statusCode,401);assert.equal((await app.inject({url:'/api/admin/battle-usage',headers:{authorization:'player'}})).statusCode,403);assert.equal(reads,0);
  const request={method:'POST',url:'/api/internal/battle-usage',payload:{serverId:'main',battles:[battle]}};assert.equal((await app.inject(request)).statusCode,401);for(let i=0;i<2;i++)assert.equal((await app.inject({...request,headers:{authorization:'server'}})).statusCode,200);assert.equal(saved.size,1);
  const response=await app.inject({url:'/api/admin/battle-usage?mode=ranked_solo&days=7',headers:{authorization:'admin'}});assert.equal(response.statusCode,200);assert.equal(response.headers['cache-control'],'private, no-store');assert.equal(response.json().battles,1);
  assert.equal((await app.inject({url:'/api/admin/battle-usage?days=365',headers:{authorization:'admin'}})).statusCode,400);assert.equal((await app.inject({method:'POST',url:'/api/pokecalc/damage',payload:input})).statusCode,200);
 }finally{await app.close();const {pool}=await import('../dist/db.js');await pool.end();}
});
