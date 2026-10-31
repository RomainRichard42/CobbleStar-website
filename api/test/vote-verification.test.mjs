import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Fastify from 'fastify';
import {voteProviders,parseMinecraftEligibility,voteClientIp,VoteError} from '../dist/vote-providers.js';
import {registerVoteVerification} from '../dist/vote-verification.js';
const settings={topToken:'private-top',privateToken:'private-sp',minecraftId:'7799',minecraftEnabled:true,proxyPeers:[],ipSecret:'test-only-secret'};
const actor={id:randomUUID(),minecraft_uuid:'a'.repeat(32),minecraft_username:'Dresseur',minecraft_linked_at:new Date()};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status});
test('provider replies are checked, bounded and never leak credentials',async()=>{
 const calls=[]; const p=voteProviders(settings,async(url,options)=>{calls.push({url:new URL(url),options});return reply({code:200,success:true,duration:119});});
 assert.equal((await p.check('top_serveurs','Dresseur',null,null)).voted,true);
 assert.equal(calls[0].url.hostname,'api.top-serveurs.net'); assert.equal(calls[0].url.searchParams.get('playername'),'Dresseur'); assert.equal(calls[0].options.redirect,'error');
 for(const value of [{success:false,code:403},{success:true,code:200,duration:'120'},{success:true,code:200,duration:121}]) {
  await assert.rejects(voteProviders(settings,async()=>reply(value)).check('top_serveurs','Dresseur',null,null),/VOTE_PROVIDER_UNAVAILABLE/);
 }
 assert.deepEqual(await voteProviders(settings,async()=>reply({success:false,code:404},404)).check('top_serveurs','Dresseur',null,null),{voted:false});
 const broken=voteProviders(settings,async()=>{throw new Error('https://private-top-secret');});
 await assert.rejects(broken.check('top_serveurs','Dresseur',null,null),e=>e.message==='VOTE_PROVIDER_UNAVAILABLE');
 await assert.rejects(voteProviders(settings,async()=>new Response('x'.repeat(40000))).check('top_serveurs','Dresseur',null,null),/VOTE_PROVIDER_UNAVAILABLE/);
});
test('OTP proof requires typed server data; SM eligibility is not a successful vote',async()=>{
 const p=voteProviders(settings,async url=>String(url).endsWith('/otp')?reply({success:true,data:{token:'ABCDEF'}}):reply({success:true,data:{username:'Dresseur',voted_at:1793480000,next_vote_seconds:5399}}));
 assert.equal(await p.otp(),'ABCDEF'); assert.equal((await p.check('serveur_prive','Dresseur','ABCDEF',null)).username,'Dresseur');
 assert.deepEqual(await voteProviders(settings,async()=>reply({success:false,message:'No vote found with this token'},404)).check('serveur_prive','Dresseur','ABCDEF',null),{voted:false});
 assert.deepEqual(parseMinecraftEligibility('true'),{voted:false}); assert.equal(parseMinecraftEligibility('86399').voted,true);
 for(const value of ['false','0','-1','86401','<html>error</html>'])assert.throws(()=>parseMinecraftEligibility(value));
 assert.equal(voteClientIp('198.51.100.4','192.0.2.99',[]),'198.51.100.4');
 assert.equal(voteClientIp('::ffff:127.0.0.1','192.0.2.99, 198.51.100.4',['127.0.0.1']),'198.51.100.4');
 assert.equal(voteClientIp('127.0.0.1','spoof',['127.0.0.1']),null);
 assert.equal(voteClientIp('23.109.138.130','192.0.2.99, 198.51.100.4, 172.64.1.2',['23.109.138.130','172.64.0.0/13']),'198.51.100.4');
 assert.equal(voteClientIp('23.109.138.130','192.0.2.99, 198.51.100.4',['23.109.138.130','invalid/0']),'198.51.100.4');
 assert.equal(voteClientIp('127.0.0.1','2400:cb00::1',['127.0.0.1','2400:cb00::/32']),null);
});
async function fixture(t, overrides={}) {
 const rows=new Map();let claims=0, voted=false, current=actor;
 const store={active:async(id,site)=>[...rows.values()].find(a=>a.user_id===id&&a.vote_site===site&&!a.claim_id&&a.expires_at>Date.now())||null,
 get:async(id,key)=>rows.get(key)?.user_id===id?rows.get(key):null,
 create:async(a,site,otp,ip_hash,expires_at)=>{const row={id:randomUUID(),user_id:a.id,vote_site:site,minecraft_uuid:a.minecraft_uuid,username:a.minecraft_username,otp,ip_hash,created_at:new Date(),expires_at,claim_id:null};rows.set(row.id,row);return row;},
 claim:async(a,row)=>row.claim_id|| (claims++,row.claim_id=randomUUID())};
 const app=Fastify();t.after(()=>app.close());
 const providers={otp:async()=>'ABCDEF',check:async()=>voted?{voted:true,username:'Dresseur',votedAt:Date.now()}: {voted:false},...overrides};
 registerVoteVerification(app,{origin:'https://example.test',settings,session:async()=>current,store,providers});
 const post=(path,body,origin='https://example.test')=>app.inject({method:'POST',url:'/api/votes/'+path,headers:{origin},payload:body});
 return {app,rows,post,setVoted:v=>voted=v,setActor:v=>current=v,claims:()=>claims};
}
test('a click or client-supplied reward cannot credit a vote; ownership and CSRF enforced',async t=>{
 const f=await fixture(t); assert.equal((await f.post('start',{siteId:'top_serveurs'},'https://evil.test')).statusCode,403);
 assert.equal((await f.post('start',{siteId:'top_serveurs',username:'Other',reward:100})).statusCode,400);
 const start=await f.post('start',{siteId:'top_serveurs'});assert.equal(start.statusCode,200);assert.equal(start.headers['cache-control'],'private, no-store');
 const a=start.json().attempt;assert.equal(new URL(a.url).searchParams.get('pseudo'),'Dresseur');assert.equal(f.claims(),0);
 assert.equal((await f.post('check',{attemptId:a.id})).json().verified,false);assert.equal(f.claims(),0);
 f.setActor({...actor,id:randomUUID()});assert.equal((await f.post('check',{attemptId:a.id})).statusCode,404);
 f.setActor({...actor,minecraft_uuid:'b'.repeat(32)});assert.equal((await f.post('check',{attemptId:a.id})).statusCode,409);
 f.setActor(actor);f.setVoted(true);const checks=await Promise.all([f.post('check',{attemptId:a.id}),f.post('check',{attemptId:a.id})]);
 assert.ok(checks.every(r=>r.json().verified&&r.json().rewardKeys===1));assert.equal(f.claims(),1);
});
test('OTP username mismatch, expired proof, anonymous and unlinked users fail closed',async t=>{
 const f=await fixture(t,{check:async()=>({voted:true,username:'OtherName',votedAt:Date.now()})});
 const a=(await f.post('start',{siteId:'serveur_prive'})).json().attempt;assert.equal(new URL(a.url).searchParams.get('token'),'ABCDEF');
 assert.equal((await f.post('check',{attemptId:a.id})).json().error,'VOTE_USERNAME_MISMATCH');
 f.rows.get(a.id).expires_at=new Date(0);assert.equal((await f.post('check',{attemptId:a.id})).json().error,'VOTE_ATTEMPT_EXPIRED');
 f.setActor(null);assert.equal((await f.post('start',{siteId:'top_serveurs'})).statusCode,401);
 f.setActor({...actor,minecraft_linked_at:null});assert.equal((await f.post('start',{siteId:'top_serveurs'})).statusCode,409);assert.equal(f.claims(),0);
});
test('existing Top vote cannot be replayed through a new challenge',async t=>{
 const f=await fixture(t);f.setVoted(true);assert.equal((await f.post('start',{siteId:'top_serveurs'})).json().error,'VOTE_PROVIDER_COOLDOWN');assert.equal(f.rows.size,0);
});
