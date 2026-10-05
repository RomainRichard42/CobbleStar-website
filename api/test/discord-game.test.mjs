import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {Collection,PermissionsBitField,PermissionFlagsBits as P,ChannelType} from 'discord.js';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),DISCORD_GATEWAY_ENABLED:'true'});
const [{gameStateSchema,desiredRoles,statusNames,newerState,registerDiscordGame},{settingsSchema},{DiscordGameSync,safeSyncRole},{pool}]=await Promise.all([
  import('../dist/discord-game.js'),import('../dist/discord-policy.js'),import('../dist/discord-game-bot.js'),import('../dist/db.js')]);
const id=n=>'123456789012345'+String(n).padStart(3,'0');
const uuid='a'.repeat(32),owner=id(20),grade=id(3),promoted=id(4),staff=id(5),rank=id(6),club=id(7),bot=id(2),guildId=id(1);
const session='11111111-1111-4111-8111-111111111111';
const state=(patch={})=>({serverId:'main',sessionId:session,startedAt:Date.now()-1000,sequence:1,online:true,maintenance:false,players:3,maxPlayers:50,profiles:[{uuid,grade:'recrue',ranked:null,club:null}],...patch});
after(async()=>{await pool.end();});

test('Authoritative state is bounded, excludes Discord IDs/role IDs and validates UUIDs',()=>{
  assert.ok(gameStateSchema.safeParse(state()).success);
  for(const v of [state({discordId:owner}),state({profiles:[{uuid,grade:'admin',ranked:null,club:null}]}),
    state({profiles:[{uuid,grade:'recrue',ranked:null,club:null,role:staff}]}),state({profiles:Array(101).fill(state().profiles[0])}),
    state({profiles:[state().profiles[0],state().profiles[0]]}),state({online:false,players:1})])assert.equal(gameStateSchema.safeParse(v).success,false);
});
test('Game mappings are opt-in, deduplicated and use grade, current rank and stable club identity',()=>{
  const s=settingsSchema.parse({roleMappings:[{source:'grade',key:'recrue',role:grade},{source:'ranked',key:'star',role:rank},{source:'club',key:'my-club-uuid',role:club}]});
  assert.equal(s.roleSyncEnabled,false);assert.equal(s.statusEnabled,false);
  assert.deepEqual(desiredRoles(s,{uuid,grade:'recrue',ranked:'star',club:'my-club-uuid'}),[grade,rank,club]);
  assert.deepEqual(desiredRoles(s,null),[]);
  assert.deepEqual(desiredRoles(s,{uuid,grade:'elite',ranked:null,club:null}),[]);
});
test('Counts distinguish unconfigured, fresh, stale, maintenance and orderly shutdown',()=>{
  const now=Date.now();assert.match(statusNames(null,0,now).players,/—/);
  assert.match(statusNames(state(),now,now).players,/3 \/ 50/);
  assert.match(statusNames(state(),now-121000,now).status,/Sans réponse/);
  assert.match(statusNames(state(),now-121000,now).players,/0 \/ 50/);
  assert.match(statusNames(state({maintenance:true}),now,now).status,/Maintenance/);
  assert.match(statusNames(state({online:false,players:0}),now,now).status,/Hors ligne/);
  assert.match(statusNames(state({online:false,players:0}),now-600000,now).status,/Hors ligne/);
});
test('Paid grades are separate, highest family is mapped, unknown is not a revocation',()=>{
  const s=settingsSchema.parse({roleMappings:[{source:'grade',key:'recrue',role:grade},
    {source:'premium',key:'etoile',role:promoted},{source:'premium',key:'cosmique',role:rank},{source:'premium',key:'galactique',role:club}]});
  const p=state().profiles[0];
  for(const [premium,role] of [['etoile',promoted],['cosmique',rank],['galactique',club]]) {
    assert.ok(gameStateSchema.safeParse(state({profiles:[{...p,premium}]})).success);
    assert.deepEqual(desiredRoles(s,{...p,premium},[club]),[grade,role]);
  }
  assert.deepEqual(desiredRoles(s,p,[rank,staff]),[grade,rank]);
  assert.deepEqual(desiredRoles(s,p),[grade]);
  assert.deepEqual(desiredRoles(s,{...p,premium:null},[rank]),[grade]);
  assert.deepEqual(desiredRoles(s,null,[rank]),[]);
  assert.equal(gameStateSchema.safeParse(state({profiles:[{...p,premium:'admin'}]})).success,false);
  assert.equal(gameStateSchema.safeParse(state({profiles:[{...p,premium:['etoile','galactique']}]})).success,false);
});
test('Old heartbeats/shutdowns cannot overwrite a new server session or refresh the expiry',()=>{
  const next=state({startedAt:1000,sequence:5});
  const old={started_at:1000,session_id:session,sequence_no:5};
  assert.equal(newerState(old,next),false);
  assert.equal(newerState(old,{...next,sequence:6}),true);
  assert.equal(newerState(old,{...next,startedAt:999,sequence:999}),false);
  assert.equal(newerState(old,{...next,sessionId:'22222222-2222-4222-8222-222222222222',sequence:999}),false);
  assert.equal(newerState(old,{...next,startedAt:1001,sequence:0}),true);
});
function fixture(extra={}) {
  const calls=[],saved=[],channels=new Collection(),roles=new Collection();
  const g={id:guildId};
  for(const roleId of [guildId,grade,promoted,staff,rank,club,bot])roles.set(roleId,{id:roleId,guild:g,managed:false,position:1,permissions:new PermissionsBitField(roleId===staff?[P.Administrator]:[])});
  const me={id:bot,permissions:new PermissionsBitField([P.ManageRoles,P.ManageChannels]),roles:{highest:{position:10}}};
  const m={id:owner,roles:{cache:new Collection([[staff,roles.get(staff)],[grade,roles.get(grade)]]),
    add:async(roleId)=>{calls.push(['add',roleId]);m.roles.cache.set(roleId,roles.get(roleId));},
    remove:async(roleId)=>{calls.push(['remove',roleId]);m.roles.cache.delete(roleId);}}};
  g.roles={fetch:async roleId=>roleId?roles.get(roleId):roles};
  g.members={fetchMe:async()=>me,fetch:async request=>{assert.equal(request.force,true);return m;}};
  let serial=100;
  g.channels={fetch:async channelId=>channels.get(channelId),create:async options=>{
    const c={id:id(++serial),guildId,type:options.type,name:options.name,parentId:options.parent,
      permissionsFor:()=>new PermissionsBitField([P.ManageChannels]),
      permissionOverwrites:{set:async overwrites=>{c.overwrites=overwrites;}},
      setParent:async parent=>{c.parentId=parent;},setName:async name=>{calls.push(['name',c.id,name]);c.name=name;}};
    c.overwrites=options.permissionOverwrites;channels.set(c.id,c);return c;
  }};
  const s=settingsSchema.parse({staffRole:staff,roleMappings:[{source:'grade',key:'eclaireur',role:promoted},{source:'ranked',key:'star',role:rank},{source:'club',key:'club-uuid',role:club}],...extra});
  const candidate={discord_id:owner,uuid,owner_uuid:uuid,roles:[grade],profile:{uuid,grade:'eclaireur',ranked:'star',club:'club-uuid'}};
  const sync=new DiscordGameSync(async()=>g,{warn:()=>calls.push(['warn'])});
  return {g,me,m,s,candidate,sync,calls,saved,channels,roles};
}
async function withPool(f,fn) {
  const old={query:pool.query,execute:pool.execute};
  pool.execute=async(sql,args)=>{if(sql.includes('discord_role_state'))f.saved.push({roles:JSON.parse(args[2]),uuid:args[3]});return [{affectedRows:1},[]];};
  pool.query=async()=>[[{state:JSON.stringify(state({profiles:[]})),received_at:new Date()}],[]];
  try{await fn();}finally{Object.assign(pool,old);}
}
test('Promotion removes only the previously owned badge and keeps unrelated staff roles',async()=>{
  const f=fixture();await withPool(f,async()=>{await f.sync.syncCandidate(f.g,f.s,f.candidate,f.me);});
  assert.deepEqual(f.calls,[['remove',grade],['add',promoted],['add',rank],['add',club]]);
  assert.ok(f.m.roles.cache.has(staff));assert.deepEqual(f.saved.at(-1).roles,[promoted,rank,club]);
});
test('Unlink removes owned roles; an unavailable snapshot for an unchanged link preserves them',async()=>{
  const f=fixture();await withPool(f,async()=>{
    await f.sync.syncCandidate(f.g,f.s,{...f.candidate,profile:null},f.me);assert.equal(f.calls.length,0);
    await f.sync.syncCandidate(f.g,f.s,{...f.candidate,uuid:null,profile:null},f.me);
  });
  assert.deepEqual(f.calls,[['remove',grade]]);assert.ok(f.m.roles.cache.has(staff));
  assert.deepEqual(f.saved.at(-1).roles,[]);
});
test('Paid badges survive unavailable LP, disappear on revocation and are never transferred on relink',async()=>{
  const f=fixture({roleMappings:[{source:'premium',key:'etoile',role:grade},{source:'premium',key:'cosmique',role:promoted}]});
  await withPool(f,async()=>{
    await f.sync.syncCandidate(f.g,f.s,f.candidate,f.me);
    assert.equal(f.calls.length,0);
    await f.sync.syncCandidate(f.g,f.s,{...f.candidate,profile:{...f.candidate.profile,premium:'cosmique'}},f.me);
    assert.deepEqual(f.calls,[['remove',grade],['add',promoted]]);
    f.calls.length=0;
    await f.sync.syncCandidate(f.g,f.s,{...f.candidate,roles:[promoted],profile:{...f.candidate.profile,premium:null}},f.me);
    assert.deepEqual(f.calls,[['remove',promoted]]);
    f.calls.length=0;f.m.roles.cache.set(grade,f.roles.get(grade));
    await f.sync.syncCandidate(f.g,f.s,{...f.candidate,uuid:'b'.repeat(32)},f.me);
    assert.deepEqual(f.calls,[['remove',grade]]);
    assert.ok(f.m.roles.cache.has(staff));
  });
});
test('Role safety rejects staff, moderation, integrations, @everyone and roles above the bot',async()=>{
  const f=fixture();assert.equal(safeSyncRole(f.roles.get(grade),f.me,f.s),true);
  for(const role of [f.roles.get(staff),f.roles.get(guildId),{...f.roles.get(grade),managed:true},{...f.roles.get(grade),position:10},
    ...[P.ManageMessages,P.MoveMembers,P.ManageNicknames].map(p=>({...f.roles.get(grade),permissions:new PermissionsBitField([p])}))])assert.equal(safeSyncRole(role,f.me,f.s),false);
  f.roles.get(grade).permissions=new PermissionsBitField([P.Administrator]);
  await withPool(f,async()=>assert.rejects(()=>f.sync.syncCandidate(f.g,f.s,f.candidate,f.me),/privilégié/));
  assert.equal(f.calls.length,0);assert.equal(f.saved.length,0);
});
test('Interrupted grants retain ownership intent so later unlink can clean up',async()=>{
  const f=fixture();f.m.roles.add=async roleId=>{f.calls.push(['add',roleId]);f.m.roles.cache.set(roleId,f.roles.get(roleId));throw Error('Network interruption');};
  await withPool(f,async()=>{
    await assert.rejects(()=>f.sync.syncCandidate(f.g,f.s,f.candidate,f.me));
    const owned=f.saved.at(-1).roles;assert.ok(owned.includes(promoted));
    await f.sync.syncCandidate(f.g,f.s,{...f.candidate,roles:owned,uuid:null,profile:null},f.me);
  });
  assert.ok(!f.m.roles.cache.has(promoted));assert.ok(f.m.roles.cache.has(staff));
});
test('One category contains two non-connectable counters; setup and unchanged updates are idempotent',async()=>{
  const f=fixture({statusEnabled:true});
  await withPool(f,async()=>{
    await f.sync.setupStatus(f.s);await f.sync.setupStatus(f.s);
    assert.equal(f.channels.size,3);
    const category=f.channels.get(f.s.statusCategory);assert.equal(category.type,ChannelType.GuildCategory);
    for(const field of ['statusChannel','playersChannel']) {
      const c=f.channels.get(f.s[field]);assert.equal(c.type,ChannelType.GuildVoice);assert.equal(c.parentId,category.id);
      assert.ok(c.overwrites.find(o=>o.id===guildId).deny.includes(P.Connect));
    }
    const count=f.calls.filter(c=>c[0]==='name').length;await f.sync.tick(f.s);
    assert.equal(f.calls.filter(c=>c[0]==='name').length,count);
    assert.match(f.channels.get(f.s.playersChannel).name,/3 \/ 50/);
  });
});
test('Authenticated HTTP state accepts linked UUIDs only, rejects forged identity and ignores replay',async()=>{
  const {default:Fastify}=await import('fastify'),app=Fastify();registerDiscordGame(app,r=>r.headers.authorization==='test-key');
  const old={query:pool.query,execute:pool.execute,getConnection:pool.getConnection};let stored,received=0;const profiles=new Map();
  const query=async sql=>sql.includes('discord_settings')?[[{settings:{}}],[]]:[stored?[stored]:[],[]];
  const execute=async(sql,args)=>{
    if(sql.startsWith('INSERT IGNORE INTO discord_game_status')&&!stored)stored={session_id:args[2],started_at:0,sequence_no:-1};
    if(sql.startsWith('UPDATE discord_game_status')){stored={session_id:args[0],started_at:args[1],sequence_no:args[2]};received++;}
    if(sql.includes('INSERT INTO discord_game_players')&&args[4]===uuid)profiles.set(args[2],JSON.parse(args[3]));
    return [{affectedRows:1},[]];
  };
  pool.query=query;pool.execute=execute;pool.getConnection=async()=>({query,execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}});
  const payload=state(),send=(v=payload,auth=true)=>app.inject({method:'POST',url:'/internal/discord/state',headers:auth?{authorization:'test-key'}:{},payload:v});
  try {
    assert.equal((await send(payload,false)).statusCode,401);assert.equal(received,0);
    assert.equal((await send({...payload,discordId:owner})).statusCode,400);
    assert.equal((await send({...payload,serverId:'other'})).statusCode,409);
    assert.equal((await send({...payload,startedAt:Date.now()+600000})).statusCode,400);
    assert.equal((await send()).statusCode,200);assert.equal(received,1);assert.equal(profiles.size,1);
    await send();assert.equal(received,1);
    await send({...payload,sequence:2,profiles:[{uuid:'b'.repeat(32),grade:'elite',ranked:'star',club:null}]});assert.equal(profiles.size,1);
    await send({...payload,sequence:999,startedAt:payload.startedAt-1});assert.equal(received,2);
  }finally{Object.assign(pool,old);await app.close();}
});
