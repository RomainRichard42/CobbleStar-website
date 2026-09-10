import test from 'node:test';
import assert from 'node:assert/strict';
import { studioContent, emptyStudio, rewardCommand } from '../dist/quest-studio-schema.js';
Object.assign(process.env, { NODE_ENV:'test', PUBLIC_API_URL:'https://example.test', SITE_ORIGIN:'https://example.test', DB_HOST:'127.0.0.1', DB_NAME:'unused_test', DB_USER:'unused_test', DB_PASSWORD:'unused_test', COOKIE_SECRET:'isolated-test-cookie-secret-never-production', MINECRAFT_SERVER_KEY:'isolated-test-server-secret-never-production', GAME_ADMIN_DISCORD_IDS:'111111111111111111', GAME_ADMIN_READ_DISCORD_IDS:'222222222222222222' });
const { default: Fastify } = await import('fastify');
const { registerQuestStudio } = await import('../dist/quest-studio.js');
const { pool } = await import('../dist/db.js');
const content = () => ({ questConfig: { resetHour:6, chapters:[], quests:[{ id:'first_capture', title:'Première capture', description:'Une rencontre', category:'AVENTURE', chapterId:'', chapterTitle:'Aventure', kind:'SIDE', difficulty:'FACILE', icon:'cobblemon:poke_ball', accent:'#9B8CFF', order:1, autoStart:false, requires:[], objectives:[{ source:'cobblemon_capture', label:'Capturer', target:1, unique:false, optional:false, alternativeGroup:'', filters:{} }], rewards:[{ label:'Balls', icon:'cobblemon:poke_ball', choice:false, commands:['give {player} cobblemon:poke_ball 8'] }] }] }, npcs:[{ id:'professor', name:'Professeur Asteria', enabled:true, role:'DIALOGUE_QUEST', dialogue:'Bonjour', dialogueGraph:{ start:'hello', nodes:[{ id:'hello', title:'Accueil', text:'Une mission ?', canvasX:24, canvasY:42, choices:[{ label:'Oui', target:'', action:'accept:first_capture' }] }] }, questIds:['first_capture'], permission:0, repeatableDialogue:true, skin:'', nameColor:'ROLE', visualRole:'STORY', shopOffers:'' }] });
test('legacy stories retain parallel progression and current stories roundtrip', () => { const d=content(); assert.equal(studioContent.parse(d).questConfig.quests[0].sequential,false); d.questConfig.quests[0].sequential=true; assert.deepEqual(studioContent.parse(d),d); assert.deepEqual(studioContent.parse(emptyStudio), emptyStudio); });
test('dangling branches, duplicate names, unknown quests and prerequisite cycles fail validation', () => {
  for (const mutate of [d => d.npcs[0].dialogueGraph.nodes[0].choices[0].target='missing', d => d.npcs.push({...structuredClone(d.npcs[0]),id:'other',name:'  professeur asteria  '}), d => d.npcs[0].questIds=[], d => d.questConfig.quests[0].requires=['first_capture'], d => d.questConfig.quests.push(structuredClone(d.questConfig.quests[0]))]) { const d=content(); mutate(d); assert.equal(studioContent.safeParse(d).success,false); }
});
test('rewards cannot execute arbitrary console commands or target someone else', () => {
  for (const command of ['op {player}','execute as {player} run op {player}','give @a minecraft:diamond 8','give {player} minecraft:diamond 65','give {player} minecraft:diamond 8\nop intruder','lp user {player} parent add admin']) assert.equal(rewardCommand.safeParse(command).success,false,command);
  assert.equal(rewardCommand.safeParse('experience add {player} 100 points').success,true);
});
test('unsupported skins, malformed trades and oversized dialogue packets fail explicitly', () => {
  for (const mutate of [d => d.npcs[0].skin='https://example.test/skin.png', d => d.npcs[0].skin='player:JustAName', d => d.npcs[0].shopOffers='minecraft:diamond|oops|12|0', d => { d.npcs[0].dialogueGraph.nodes = Array.from({length:8}, (_,i) => ({id:i ? `node_${i}` : 'hello',title:'Texte',text:'é'.repeat(3000),canvasX:0,canvasY:0,choices:[]})); }]) {
    const d=content(); mutate(d); assert.equal(studioContent.safeParse(d).success,false);
  }
  const d=content(); d.npcs[0].skin='minecraft:textures/entity/player/wide/steve.png'; d.npcs[0].shopOffers='cobblemon:poke_ball|8|100|0';
  assert.equal(studioContent.safeParse(d).success,true);
});
function app() { const a=Fastify(); registerQuestStudio(a,{session:async req=>req.headers['x-test-role']?{id:'fixture',discord_id:req.headers['x-test-role']}:null,server:req=>req.headers.authorization==='Bearer fixture-server'}); return a; }
test('studio routes enforce game roles, origin, and server authentication before DB access', async () => {
  const a=app(), original=pool.execute; pool.execute=async()=>{throw Error('Unexpected DB access');};
  try {
    for (const url of ['/api/admin/quests','/api/admin/quests/main','/api/admin/quests/main/history/1']) { assert.equal((await a.inject({url})).statusCode,401); assert.equal((await a.inject({url,headers:{'x-test-role':'333'}})).statusCode,403); }
    for (const [method,url] of [['PUT','/api/admin/quests/main'],['POST','/api/admin/quests/main/publish']]) {
      assert.equal((await a.inject({method,url,headers:{'x-test-role':'222222222222222222',origin:'https://example.test'},payload:{}})).statusCode,403);
      assert.equal((await a.inject({method,url,headers:{'x-test-role':'111111111111111111',origin:'https://attacker.test'},payload:{}})).statusCode,403);
    }
    assert.equal((await a.inject({method:'POST',url:'/api/internal/quests/sync',payload:{}})).statusCode,401);
  } finally { pool.execute=original; await a.close(); }
});
test('draft/save/publish/conflict/server-ack contract with DB double (not a MySQL test)', async () => {
  const a=app(), origExec=pool.execute, origConnection=pool.getConnection;
  const catalog={protocol:2,items:[{id:'cobblemon:poke_ball',label:'Poké Ball'}],blocks:[],entities:[],species:[],biomes:[],dimensions:[]};
  const row={draft_revision:0,published_revision:0,draft_json:null,published_json:null,observed_json:{catalog}}; let publication=null;
  async function execute(sql,args) {
    if (sql.startsWith('SELECT')) return [[{...row}]];
    if (sql.startsWith('UPDATE quest_studio SET draft_json')) { row.draft_json=args[0]; row.draft_revision++; }
    else if (sql.startsWith('INSERT INTO quest_publications')) publication=args;
    else if (sql.startsWith('UPDATE quest_studio SET published_json')) { row.published_json=args[0]; row.published_revision=args[1]; }
    return [{affectedRows:1}];
  }
  pool.execute=execute; pool.getConnection=async()=>({beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute});
  const headers={'x-test-role':'111111111111111111',origin:'https://example.test'};
  try {
    let r=await a.inject({method:'PUT',url:'/api/admin/quests/main',headers,payload:{baseRevision:0,content:content()}}); assert.equal(r.statusCode,200); assert.equal(r.json().draftRevision,1); assert.equal(row.published_json,null);
    r=await a.inject({method:'PUT',url:'/api/admin/quests/main',headers,payload:{baseRevision:0,content:content()}}); assert.equal(r.statusCode,409);
    r=await a.inject({method:'POST',url:'/api/admin/quests/main/publish',headers,payload:{baseRevision:1,reason:'Première rencontre'}}); assert.equal(r.statusCode,200); assert.equal(r.json().publishedRevision,1); assert.equal(publication[3],headers['x-test-role']);
    r=await a.inject({method:'POST',url:'/api/internal/quests/sync',headers:{authorization:'Bearer fixture-server'},payload:{serverId:'main',appliedRevision:0,error:'',observed:content(),placements:[]}}); assert.equal(r.statusCode,200); assert.deepEqual(r.json().content,studioContent.parse(content()));
    row.observed_json=null;
    r=await a.inject({method:'POST',url:'/api/admin/quests/main/publish',headers,payload:{baseRevision:1,reason:'Ancien moteur'}}); assert.equal(r.statusCode,409); assert.equal(r.json().error,'STORY_ENGINE_REQUIRED');
    assert.match(r.json().message,/catalogue/i); assert.doesNotMatch(r.json().message,/Mets à jour le mod/);
    const bad=content(); bad.npcs[0].dialogueGraph.start='nonexistent';
    r=await a.inject({method:'PUT',url:'/api/admin/quests/main',headers,payload:{baseRevision:1,content:bad}}); assert.equal(r.statusCode,200,'Incomplete work can be saved as a draft');
    row.observed_json={catalog};
    r=await a.inject({method:'POST',url:'/api/admin/quests/main/publish',headers,payload:{baseRevision:2,reason:'Dialogue incomplet'}}); assert.equal(r.statusCode,400); assert.match(r.json().message,/dialogue/);
  } finally {pool.execute=origExec;pool.getConnection=origConnection;await a.close();}
});

test('large modpack catalogue exceeds 2 MiB, sync accepts it intact; heartbeat preserves catalogue and draft', async () => {
  const a=app(), original=pool.execute;
  const catalog={protocol:2,items:Array.from({length:12000},(_,i)=>({id:`test:item_${i}`,label:'é'.repeat(100)})),blocks:[],entities:[],species:[],biomes:[],dimensions:[]};
  const body={serverId:'main',appliedRevision:0,error:'',observed:{...content(),catalog},placements:[]};
  assert.ok(Buffer.byteLength(JSON.stringify(body))>2*1024*1024);
  const draft=JSON.stringify(content()); let observed={}, writes=0;
  pool.execute=async(sql,args)=>{
    if(sql.startsWith('INSERT INTO quest_studio')) {
      assert.match(sql,/JSON_MERGE_PATCH/); assert.doesNotMatch(sql,/draft_json/);
      observed={...observed,...JSON.parse(args[1])}; writes++;
      return [{affectedRows:1}];
    }
    return [[{published_revision:0,published_json:null}]];
  };
  const headers={authorization:'Bearer fixture-server'};
  try {
    let r=await a.inject({method:'POST',url:'/api/internal/quests/sync',headers,payload:body});
    assert.equal(r.statusCode,200,r.body); assert.deepEqual(observed.catalog,catalog);
    const heartbeat=structuredClone(body); delete heartbeat.observed.catalog; heartbeat.error='API HTTP 413';
    r=await a.inject({method:'POST',url:'/api/internal/quests/sync',headers,payload:heartbeat});
    assert.equal(r.statusCode,200); assert.deepEqual(observed.catalog,catalog); assert.equal(draft,JSON.stringify(content()));
    const invalid=structuredClone(heartbeat); invalid.observed.catalog={protocol:2,items:[]};
    r=await a.inject({method:'POST',url:'/api/internal/quests/sync',headers,payload:invalid});
    assert.equal(r.statusCode,400); assert.equal(r.json().error,'INVALID_QUEST_SYNC'); assert.equal(writes,2);
    r=await a.inject({method:'POST',url:'/api/internal/quests/sync',headers:{...headers,'content-type':'application/json'},payload:JSON.stringify({padding:'x'.repeat(16*1024*1024)})});
    assert.equal(r.statusCode,413); assert.equal(writes,2);
    r=await a.inject({method:'PUT',url:'/api/admin/quests/main',headers:{'x-test-role':'111111111111111111',origin:'https://example.test'},payload:body});
    assert.equal(r.statusCode,413,'Draft input remains bounded at 2 MiB');
  } finally {pool.execute=original;await a.close();}
});

test('quest freshness uses the UTC database timestamp, not a host-timezone Date conversion', async () => {
  const a=app(), original=pool.execute, iso='2026-09-10T15:30:00.123Z';
  pool.execute=async sql=>{
    if(sql.startsWith('SELECT revision')) return [[]];
    assert.match(sql,/DATE_FORMAT\(last_seen_at/); assert.match(sql,/AS last_seen_iso/);
    return [[{draft_json:content(),observed_json:content(),draft_revision:1,published_revision:0,applied_revision:0,last_seen_iso:iso,last_seen_at:new Date('2026-09-10T13:30:00.123Z'),sync_error:''}]];
  };
  try {
    const response=await a.inject({url:'/api/admin/quests/main',headers:{'x-test-role':'111111111111111111'}});
    assert.equal(response.statusCode,200,response.body); assert.equal(response.json().lastSeenAt,iso);
  } finally {pool.execute=original;await a.close();}
});
test('scenario choices reject retired rotations, unsupported events, missing actors and invalid dialogue conditions', () => {
  for (const mutate of [d=>d.questConfig.quests[0].kind='DAILY',d=>d.questConfig.quests[0].kind='WEEKLY',d=>d.questConfig.quests[0].kind='MONTHLY',d=>d.questConfig.quests[0].objectives[0].source='imaginary_event',d=>d.questConfig.quests[0].objectives[0].source='story_npc_talk',d=>d.questConfig.quests[0].objectives[0].filters={type:'fire'},d=>d.npcs[0].dialogueGraph.nodes[0].when={questId:'missing',status:'ACTIVE'},d=>d.npcs[0].dialogueGraph.nodes[0].when={questId:'first_capture',status:'ACTIVE',objectiveIndex:12}]) {const d=content();mutate(d);assert.equal(studioContent.safeParse(d).success,false);}
  const d=content();d.questConfig.quests[0].sequential=true;d.questConfig.quests[0].objectives.push({source:'story_npc_talk',label:'Revenir voir le professeur',target:1,unique:false,optional:false,alternativeGroup:'',filters:{npc:'professor'}});d.npcs[0].dialogueGraph.nodes[0].when={questId:'first_capture',status:'ACTIVE',objectiveIndex:1};assert.equal(studioContent.safeParse(d).success,true);
});
