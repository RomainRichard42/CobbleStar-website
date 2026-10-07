import test from 'node:test';
import assert from 'node:assert/strict';
import {settingsSchema,bridgeSchema,inviteAttribution,mayConfirm,summary,plain} from '../dist/discord-policy.js';

test('Discord configuration is opt-in and accepts partially configured destinations',()=>{
  const defaults=settingsSchema.parse({});
  assert.equal(defaults.privateEnabled,false);assert.equal(defaults.retentionDays,30);
  assert.deepEqual(defaults.channels,{});assert.deepEqual(defaults.watched,[]);
  assert.equal(settingsSchema.parse({channels:{gts:'123456789012345678'}}).channels.gts,'123456789012345678');
  assert.throws(()=>settingsSchema.parse({channels:{private:'@everyone'}}));
  assert.throws(()=>settingsSchema.parse({retentionDays:0}));
  assert.throws(()=>settingsSchema.parse({retentionDays:3650}));
});
test('Bridge rejects command injection fields and oversized or unknown event types',()=>{
  const event={id:'abc-1',kind:'chat',text:'Bonjour !',occurredAt:Date.now()};
  assert.ok(bridgeSchema.safeParse({serverId:'main',events:[event]}).success);
  for(const body of [{serverId:'../escape',events:[event]}, {serverId:'main',events:[{...event,kind:'execute_command'}]},
    {serverId:'main',events:[{...event,command:'op someone'}]}, {serverId:'main',events:Array(26).fill(event)},
    {serverId:'main',events:[{...event,text:'x'.repeat(6001)}]}]) assert.equal(bridgeSchema.safeParse(body).success,false);
});
test('Invite attribution never invents an inviter for ambiguous or unavailable counters',()=>{
  const before=new Map([['a',2],['b',0]]);
  assert.equal(inviteAttribution(before,[{code:'a',uses:3,inviter:'user'}]).inviter,'user');
  assert.equal(inviteAttribution(before,[{code:'a',uses:4,inviter:'user'}]),null);
  assert.equal(inviteAttribution(before,[{code:'a',uses:3},{code:'b',uses:1}]),null);
  assert.equal(inviteAttribution(before,[{code:'new',uses:1}]),null);
  assert.equal(inviteAttribution(before,[]),null);
});
test('Closure confirmation is owner-bound and expires; summary remains deterministic',()=>{
  assert.ok(mayConfirm('owner','owner',new Date(2000),1000));
  assert.equal(mayConfirm('owner','other',new Date(2000),1000),false);
  assert.equal(mayConfirm('owner','owner',new Date(1000),1000),false);
  assert.equal(mayConfirm('owner','owner',null),false);
  const result=summary({subject:'Bug',description:'Objet manquant',claimed_by:'staff',close_reason:'Objet retrouvé'});
  assert.match(result,/Objet retrouvé/);assert.match(result,/staff/);assert.equal(plain('ab\u0000cd',3),'abc');
});
test('Authenticated ingest is bounded, idempotent and drops disabled private logging',async()=>{
  Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),DISCORD_GATEWAY_ENABLED:'true'});
  const [{default:Fastify},{registerDiscordBridge},{pool},{discordCommands}]=await Promise.all([import('fastify'),import('../dist/discord-bridge.js'),import('../dist/db.js'),import('../dist/discord-bot.js')]);
  const commands=discordCommands();
  assert.deepEqual(commands.map(c=>c.name),['csconfig','ticket','evenement','parrainage','parrainage-admin']);
  assert.ok(commands[0].default_member_permissions);
  assert.ok(commands[1].options.some(o=>o.name==='forcer-fermeture'));
  const original={query:pool.query,execute:pool.execute};let cfg={channels:{chat:'123456789012345678',private:'123456789012345679'},privateEnabled:false};
  const inserted=new Map();let reads=0;
  pool.query=async()=>{reads++;return [[{settings:cfg}],[]];};
  pool.execute=async(sql,args)=>{assert.match(sql,/INSERT IGNORE/);if(!inserted.has(args[0]))inserted.set(args[0],args);return[{},[]];};
  const app=Fastify();registerDiscordBridge(app,r=>r.headers.authorization==='test-key');
  const now=Date.now();const event=(id,kind)=>({id,kind,text:'Test',occurredAt:now});
  const request=(events,authorized=true)=>app.inject({method:'POST',url:'/internal/discord/events',headers:authorized?{authorization:'test-key'}:{},payload:{serverId:'main',events}});
  try {
    assert.equal((await request([event('one','chat')],false)).statusCode,401);assert.equal(reads,0);
    assert.equal((await request([{...event('one','chat'),kind:'execute'}])).statusCode,400);assert.equal(reads,0);
    const r=await request([event('one','chat'),event('two','private'),event('three','gts')]);assert.equal(r.statusCode,200);
    assert.deepEqual(r.json(),{accepted:['one'],disabled:['two','three']});assert.equal(inserted.size,1);
    await request([event('one','chat')]);assert.equal(inserted.size,1);
    cfg={...cfg,privateEnabled:true};await request([event('two','private')]);assert.equal(inserted.size,1);
    cfg={...cfg,adminRole:'123456789012345688'};await request([event('two','private')]);assert.equal(inserted.size,2);
    const old=await request([{...event('stale','chat'),occurredAt:now-25*3600_000}]);assert.deepEqual(old.json().disabled,['stale']);
    assert.ok(inserted.has('main:one'));assert.ok(inserted.has('main:two'));
  } finally {pool.query=original.query;pool.execute=original.execute;await app.close();await pool.end();}
});
