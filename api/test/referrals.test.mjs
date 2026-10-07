import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40)});
const [{referralConfig,referralEligible,rewardPlan},{referralCommands,handleReferral},{pool},{gameStateSchema}]=await Promise.all([import('../dist/referrals.js'),import('../dist/referrals-bot.js'),import('../dist/db.js'),import('../dist/discord-game.js')]);
after(()=>pool.end());
const cfg=referralConfig.parse({}),at=Date.now()-20000000;
const member={invitee_id:'child',inviter_id:'parent',joined_at_ms:at,qualified_uuid:null,qualified_at_ms:null,active:1};
const child={discord_id:'child',minecraft_uuid:'a'.repeat(32),minecraft_linked_at:new Date(at+1)};
const parent={discord_id:'parent',minecraft_uuid:'b'.repeat(32),minecraft_linked_at:new Date(at-100)};
test('Approved defaults: five hours per referral, 1/2/3/4 inviters and Alliance only at four',()=>{
 assert.equal(cfg.seconds,18000);assert.deepEqual(cfg.keys,[1,2,3,5]);
 assert.deepEqual(rewardPlan(0,cfg),[]);assert.equal(rewardPlan(2,cfg).length,2);
 assert.deepEqual(rewardPlan(3,cfg).map(r=>r.keys),[1,2,3]);
 assert.equal(rewardPlan(3,cfg).some(r=>r.alliance),false);
 assert.equal(rewardPlan(4,cfg).reduce((n,r)=>n+r.keys,0),11);assert.equal(rewardPlan(5,cfg).filter(r=>r.alliance).length,1);
});
test('New linked players qualify; AFK/insufficient progress, self, old players, unlinked accounts and departed members do not',()=>{
 assert.equal(referralEligible(member,child,parent,18000,at,cfg),true);
 for(const [m,c,p,seconds,seen,config] of [
  [member,child,parent,17999,at,cfg],[member,child,parent,18000,0,cfg],
  [{...member,active:0},child,parent,18000,at,cfg],
  [member,{...child,minecraft_linked_at:new Date(at-2000)},parent,18000,at,cfg],
  [{...member,inviter_id:'child'},child,parent,18000,at,cfg],
  [member,child,{...parent,minecraft_uuid:child.minecraft_uuid},18000,at,cfg],
  [member,undefined,parent,18000,at,cfg],[member,child,undefined,18000,at,cfg],
  [member,child,parent,18000,at,{...cfg,enabled:false}]
 ])assert.equal(referralEligible(m,c,p,seconds,seen,config),false);
});
test('Server input remains authenticated/bounded and referrals cannot inject Discord identity',()=>{
 const state={serverId:'main',sessionId:'11111111-1111-4111-8111-111111111111',startedAt:Date.now(),sequence:1,online:true,maintenance:false,players:1,maxPlayers:50,profiles:[]};
 const p={uuid:child.minecraft_uuid,activeSeconds:18000,firstSeen:at};
 assert.equal(gameStateSchema.safeParse({...state,referralProfiles:[p]}).success,true);
 for(const ps of [[{...p,discord_id:'fake'}],[{...p,activeSeconds:-1}],[p,p],Array(101).fill(p)])assert.equal(gameStateSchema.safeParse({...state,referralProfiles:ps}).success,false);
});
test('Reward records freeze amounts and reject duplicate UUIDs and rejoin attribution',()=>{
 const sql=readFileSync(new URL('../migrations/017_referrals.sql',import.meta.url),'utf8');
 assert.match(sql,/UNIQUE KEY referral_unique_player\(guild_id,qualified_uuid\)/);
 assert.match(sql,/UNIQUE KEY referral_identity_uuid\(guild_id,uuid\)/);
 assert.match(sql,/PRIMARY KEY\(guild_id,uuid,role,milestone\)/);
 const source=readFileSync(new URL('../src/referrals.ts',import.meta.url),'utf8');
 assert.match(source,/INSERT IGNORE INTO referral_rewards_v2/);assert.match(source,/GREATEST\(active_seconds/);
 assert.match(source,/qualified_uuid\|\|r\[0\]\.inviter_id/);
});
test('Slash definitions and runtime checks restrict configuration to administrators',async()=>{
 const commands=referralCommands();assert.deepEqual(commands.map(c=>c.name),['parrainage','parrainage-admin']);assert.ok(commands[1].default_member_permissions);
 const i={commandName:'parrainage-admin',user:{id:'attacker'},options:{getSubcommand:()=> 'config'},editReply:()=>assert.fail('Unauthorized edit')};
 const guild={members:{fetch:async()=>({permissions:{has:()=>false}})}};
 await assert.rejects(()=>handleReferral(i,guild,{}),/Administrateur/);
});
