import test from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'https://example.test',SITE_ORIGIN:'https://example.test',DB_HOST:'127.0.0.1',DB_NAME:'unused',DB_USER:'unused',DB_PASSWORD:'unused',COOKIE_SECRET:'isolated-test-cookie-secret-not-production',MINECRAFT_SERVER_KEY:'isolated-test-server-secret-not-production',DISCORD_GUILD_ID:'1540002066469101629',GAME_ADMIN_DISCORD_IDS:'111111111111111111',GAME_ADMIN_READ_DISCORD_IDS:'222222222222222222'});
const {default:Fastify}=await import('fastify');
const {Collection,PermissionsBitField,PermissionFlagsBits:P,ChannelType}=await import('discord.js');
const {registerDiscordAdmin,settingsVersion,discordSettingsInput}=await import('../dist/discord-admin.js');
const {settingsSchema}=await import('../dist/discord-policy.js');
const {pool}=await import('../dist/db.js');
const guildId=process.env.DISCORD_GUILD_ID,memberId='444444444444444444',roleId='555555555555555555';
const headers={'x-actor':process.env.GAME_ADMIN_DISCORD_IDS,origin:'https://example.test'};
const base=settingsSchema.parse({staffRole:'666666666666666666',channels:{chat:'888888888888888888'},watched:['999999999999999999']});
let stored=structuredClone(base), audits=new Map(),calls=[],online=true;
const me={id:'777777777777777777',permissions:new PermissionsBitField([P.ManageRoles,P.ManageChannels]),roles:{highest:{position:10}}};
const role={id:roleId,name:'Membre',position:2,managed:false,permissions:new PermissionsBitField(),guild:{id:guildId}};
const roles=new Collection([[roleId,role]]),channels=new Collection();
const member={id:memberId,displayName:'Membre test',user:{username:'tester',bot:false},roles:{cache:new Collection(),add:async id=>calls.push(['add',id]),remove:async id=>calls.push(['remove',id])},manageable:true,displayAvatarURL:()=>'',joinedTimestamp:123};
const guild={id:guildId,roles:{fetch:async()=>roles},channels:{fetch:async()=>channels},members:{fetchMe:async()=>me,fetch:async()=>member,list:async opts=>{calls.push(['list',opts]);return new Collection([[memberId,member]]);},search:async opts=>{calls.push(['search',opts]);return new Collection([[memberId,member]]);}}};
function app(){const a=Fastify();a.setErrorHandler((e,_r,reply)=>reply.code(e.name==='ZodError'?400:e.statusCode||500).send({message:e.message}));registerDiscordAdmin(a,{session:async req=>req.headers['x-actor']?{id:'test',discord_id:req.headers['x-actor']}:null},()=>online?{guilds:{fetch:async()=>guild}}:null);return a;}
const oldQuery=pool.query,oldExecute=pool.execute,oldConnection=pool.getConnection;
const query=async(sql,args=[])=>{
  if(sql.startsWith('SELECT settings'))return [[{settings:JSON.stringify(stored)}]];
  if(sql.startsWith('SELECT guild_id,actor'))return [[audits.get(args[0])].filter(Boolean)];
  if(sql.startsWith('SELECT status,COUNT'))return [[{status:'reception',total:2}]];
  if(sql.startsWith('SELECT kind,COUNT'))return [[{kind:'gts',total:3,pending:1,retrying:1,delivered:2}]];
  if(sql.startsWith('SELECT DATE_FORMAT')||sql.startsWith('SELECT id,channel_id')||sql.startsWith('SELECT e.id')||sql.startsWith('SELECT id,actor_discord_id')||sql.startsWith('SELECT state,received_at'))return [[]];
  throw new Error('Unexpected query: '+sql);
};
const execute=async(sql,args=[])=>{
  if(sql.startsWith('INSERT IGNORE INTO discord_settings'))return [{affectedRows:0}];
  if(sql.startsWith('UPDATE discord_settings')){stored=JSON.parse(args[0]);return [{affectedRows:1}];}
  if(sql.startsWith('INSERT IGNORE INTO discord_admin_audit')){if(audits.has(args[0]))return [{affectedRows:0}];audits.set(args[0],{guild_id:args[1],actor_discord_id:args[2],payload:JSON.parse(args[5]),status:'pending'});return [{affectedRows:1}];}
  if(sql.startsWith('INSERT INTO discord_admin_audit')){audits.set(args[0],{action:args[3],reason:args[4],payload:JSON.parse(args[5]),status:'done'});return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE discord_admin_audit')){audits.get(args[0]).status=sql.includes("status='done'")?'done':'unknown';return [{affectedRows:1}];}
  throw new Error('Unexpected execute: '+sql);
};
pool.query=query;pool.execute=execute;pool.getConnection=async()=>({query,execute,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}});
test.after(async()=>{pool.query=oldQuery;pool.execute=oldExecute;pool.getConnection=oldConnection;await pool.end();});
const settingsBody=()=>({version:settingsVersion(stored),reason:'Configuration test',roleSyncEnabled:false,statusEnabled:false,roleMappings:[],publicChannels:{gts:null,minigame:null}});
const roleBody=()=>({requestId:'00000000-0000-4000-8000-000000000001',roleId,assigned:true,reason:'Association test'});

test('all routes reject anonymous and unrelated accounts; writes reject read-only and cross-site requests',async()=>{
  const a=app();
  for(const [method,url] of [['GET','/api/admin/discord'],['GET','/api/admin/discord/members'],['PUT','/api/admin/discord/settings'],['PUT',`/api/admin/discord/members/${memberId}/role`]]){
    assert.equal((await a.inject({method,url})).statusCode,401);
    assert.equal((await a.inject({method,url,headers:{'x-actor':'333333333333333333'}})).statusCode,403);
    if(method==='PUT')for(const h of [{'x-actor':process.env.GAME_ADMIN_READ_DISCORD_IDS,origin:'https://example.test'},{'x-actor':headers['x-actor']},{...headers,origin:'https://attacker.test'}])assert.equal((await a.inject({method,url,headers:h,payload:{}})).statusCode,403);
  }await a.close();
});
test('settings reject arbitrary access expansion, invalid mapping keys and duplicate sources',()=>{
  assert.equal(discordSettingsInput.safeParse({...settingsBody(),staffRole:memberId}).success,false);
  assert.equal(discordSettingsInput.safeParse({...settingsBody(),privateEnabled:true}).success,false);
  assert.equal(discordSettingsInput.safeParse({...settingsBody(),roleMappings:[{source:'grade',key:'admin',role:roleId}]}).success,false);
  const m={source:'grade',key:'recrue',role:roleId};assert.equal(discordSettingsInput.safeParse({...settingsBody(),roleMappings:[m,m]}).success,false);
});
test('read-only member search is paginated and offline mutations fail closed',async()=>{
  const a=app();calls=[];let r=await a.inject({url:'/api/admin/discord/members?q=Tes',headers:{'x-actor':process.env.GAME_ADMIN_READ_DISCORD_IDS}});assert.equal(r.statusCode,200);assert.deepEqual(calls[0],['search',{query:'Tes',limit:50}]);assert.equal(r.json().members[0].username,'tester');
  r=await a.inject({url:'/api/admin/discord/members?after=111111111111111111',headers});assert.equal(r.statusCode,200);assert.deepEqual(calls[1],['list',{limit:50,after:'111111111111111111'}]);
  online=false;r=await a.inject({method:'PUT',url:'/api/admin/discord/settings',headers,payload:settingsBody()});assert.equal(r.statusCode,503);online=true;await a.close();
});
test('offline dashboard preserves recorded statistics without exposing secrets or message contents',async()=>{
  const a=app();online=false;
  const response=await a.inject({url:'/api/admin/discord',headers});assert.equal(response.statusCode,200,response.body);
  const body=response.json();assert.equal(body.live,null);assert.match(body.liveError,/hors ligne/);assert.equal(body.tickets[0].total,2);assert.equal(body.outbox[0].retrying,1);assert.equal(body.canWrite,true);assert.equal(body.version.length,64);
  for(const secret of ['DISCORD_BOT_TOKEN','COOKIE_SECRET','DB_PASSWORD','description','content'])assert.equal(response.body.includes(secret),false);
  online=true;await a.close();
});
test('settings use a revision check, preserve private configuration and record the actor',async()=>{
  stored=structuredClone(base);audits.clear();const a=app(),payload=settingsBody();
  let r=await a.inject({method:'PUT',url:'/api/admin/discord/settings',headers,payload:{...payload,roleSyncEnabled:true}});assert.equal(r.statusCode,200,r.body);assert.equal(stored.roleSyncEnabled,true);assert.deepEqual(stored.channels,base.channels);assert.deepEqual(stored.watched,base.watched);assert.equal(audits.size,1);
  r=await a.inject({method:'PUT',url:'/api/admin/discord/settings',headers,payload});assert.equal(r.statusCode,409);assert.equal(stored.roleSyncEnabled,true);await a.close();
});
test('settings cannot enable missing counters, assign privileged mappings or choose an inaccessible channel',async()=>{
  const a=app();let r=await a.inject({method:'PUT',url:'/api/admin/discord/settings',headers,payload:{...settingsBody(),statusEnabled:true}});assert.equal(r.statusCode,400);
  role.permissions=new PermissionsBitField([P.Administrator]);r=await a.inject({method:'PUT',url:'/api/admin/discord/settings',headers,payload:{...settingsBody(),roleMappings:[{source:'grade',key:'recrue',role:roleId}]}});assert.equal(r.statusCode,400);role.permissions=new PermissionsBitField();
  r=await a.inject({method:'PUT',url:'/api/admin/discord/settings',headers,payload:{...settingsBody(),publicChannels:{gts:roleId,minigame:null}}});assert.equal(r.statusCode,400);await a.close();
});
test('manual roles protect staff, hierarchy, bots and Minecraft-managed grades',async()=>{
  const a=app();calls=[];const send=()=>a.inject({method:'PUT',url:`/api/admin/discord/members/${memberId}/role`,headers,payload:roleBody()});
  role.permissions=new PermissionsBitField([P.ManageRoles]);assert.equal((await send()).statusCode,400);role.permissions=new PermissionsBitField();
  role.position=11;assert.equal((await send()).statusCode,400);role.position=2;
  member.user.bot=true;assert.equal((await send()).statusCode,400);member.user.bot=false;
  stored.roleMappings=[{source:'grade',key:'recrue',role:roleId}];assert.equal((await send()).statusCode,400);stored.roleMappings=[];
  stored.staffRole=roleId;assert.equal((await send()).statusCode,400);stored.staffRole=base.staffRole;
  assert.deepEqual(calls,[]);await a.close();
});
test('role writes are audited and retrying the same request does not call Discord again, even with reordered JSON',async()=>{
  audits.clear();calls=[];const a=app(),payload=roleBody(),send=body=>a.inject({method:'PUT',url:`/api/admin/discord/members/${memberId}/role`,headers,payload:body});
  const r=await send(payload);assert.equal(r.statusCode,200,r.body);assert.deepEqual(calls,[['add',roleId]]);
  const audit=audits.get(payload.requestId);assert.equal(audit.status,'done');audit.payload={assigned:true,roleId,memberId};
  assert.equal((await send(payload)).statusCode,200);assert.equal(calls.length,1);
  assert.equal((await send({...payload,assigned:false})).statusCode,409);assert.equal(calls.length,1);await a.close();
});
test('unconfirmed Discord response is marked unknown and is not automatically replayed',async()=>{
  audits.clear();const add=member.roles.add;member.roles.add=async()=>{throw new Error('Discord unavailable');};const a=app(),payload=roleBody();const send=()=>a.inject({method:'PUT',url:`/api/admin/discord/members/${memberId}/role`,headers,payload});
  assert.equal((await send()).statusCode,502);assert.equal(audits.get(payload.requestId).status,'unknown');assert.equal((await send()).statusCode,409);member.roles.add=add;await a.close();
});
