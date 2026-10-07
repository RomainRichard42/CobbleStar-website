import test,{after} from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40)});
const {ReferralStore}=await import('../dist/referrals.js');
const {pool}=await import('../dist/db.js');after(()=>pool.end());
// Deterministic persistence double; SQL semantics still require a MySQL integration run.
function fixture(){
 const users=[],members=[],clocks=new Map(),identities=new Map(),grants=new Map(),invites=new Map();let campaign;
 const run=async(sql,p=[])=>{
  const s=sql.replace(/\s+/g,' ').trim();
  if(s.startsWith('INSERT IGNORE INTO referral_campaigns'))campaign??={id:p[1],config:p[2],started_at_ms:p[3]};
  else if(s.startsWith('SELECT * FROM referral_campaigns'))return [[campaign]];
  else if(s.startsWith('UPDATE referral_campaigns'))campaign.config=p[0];
  else if(s.startsWith('INSERT INTO referral_audit')){}
  else if(s.startsWith('INSERT INTO referral_invites'))invites.set(p[1],p[2]);
  else if(s.startsWith('SELECT owner_id'))return [[...(invites.has(p[1])?[{owner_id:invites.get(p[1])}]:[])]];
  else if(s.startsWith('INSERT IGNORE INTO referral_members')){if(!members.some(m=>m.invitee_id===p[1]))members.push({invitee_id:p[1],inviter_id:p[2],joined_at_ms:p[3],qualified_uuid:null,active:1});}
  else if(s.startsWith('UPDATE referral_members SET active=')){const m=members.find(m=>m.invitee_id===p[1]);if(m)m.active=s.includes('active=1')?1:0;}
  else if(s.startsWith('UPDATE referral_members SET inviter_id='))members.find(m=>m.invitee_id===p[2]).inviter_id=p[0];
  else if(s.startsWith('UPDATE referral_members SET qualified_uuid=')){const m=members.find(m=>m.invitee_id===p[3]);m.qualified_uuid=p[0];m.qualified_at_ms=p[1];}
  else if(s.startsWith('SELECT * FROM referral_members'))return [[...members.filter(m=>s.includes('inviter_id=?')?m.inviter_id===p[1]&&m.qualified_uuid:m.invitee_id===p[1])]];
  else if(s.startsWith('SELECT discord_id,minecraft_uuid'))return [[...users.filter(u=>u.minecraft_linked_at&&(s.includes('WHERE minecraft_uuid=?')?u.minecraft_uuid===p[0]:u.discord_id===p[0]))]];
  else if(s.startsWith('INSERT INTO referral_playtime')){const old=clocks.get(p[1]);clocks.set(p[1],{active_seconds:Math.max(old?.active_seconds??0,p[2]),first_seen_ms:Math.min(old?.first_seen_ms??p[3],p[3])});}
  else if(s.startsWith('SELECT active_seconds'))return [[clocks.get(p[1])]];
  else if(s.startsWith('INSERT IGNORE INTO referral_identities')){if(!identities.has(p[1])&&![...identities.values()].includes(p[2]))identities.set(p[1],p[2]);}
  else if(s.startsWith('SELECT uuid FROM referral_identities'))return [[...(identities.has(p[1])?[{uuid:identities.get(p[1])}]:[])]];
  else if(s.startsWith('INSERT IGNORE INTO referral_rewards VALUES')){const key=p.slice(1,4).join(':');if(!grants.has(key))grants.set(key,{uuid:p[1],role:p[2],milestone:p[3],vote_keys:p[4],alliance:p[5]});}
  else if(s.startsWith('INSERT IGNORE INTO referral_rewards(')){for(const m of members.filter(m=>m.inviter_id===p[5]&&m.qualified_uuid)){const key=`${m.qualified_uuid}:invitee:${p[0]}`;if(!grants.has(key))grants.set(key,{uuid:m.qualified_uuid,role:'invitee',milestone:p[0],vote_keys:p[1],alliance:p[2]});}}
  else if(s.startsWith('SELECT COALESCE(SUM')){const own=[...grants.values()].filter(g=>g.uuid===p[1]);return [[{keysTotal:own.reduce((n,g)=>n+g.vote_keys,0),alliance:own.some(g=>g.alliance)?1:0}]];}
  else throw new Error(`Unhandled query: ${s}`);
  return [{affectedRows:1}];
 };
 const c={execute:run,query:run,beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{}};
 const store=new ReferralStore({getConnection:async()=>c,execute:run,query:run});
 const uuid=n=>n.toString(16).padStart(32,'0');const at=Date.now()+1000;
 const user=(id,n)=>{const u={discord_id:id,minecraft_uuid:uuid(n),minecraft_linked_at:new Date(at+1)};users.push(u);return u;};
 const profile=u=>({uuid:u.minecraft_uuid,activeSeconds:18000,firstSeen:at});
 return {store,users,members,grants,uuid,at,user,profile};
}
test('Store: qualification, cumulative group rewards, replay and a late eleventh invitee',async()=>{
 const f=fixture(),parent=f.user('parent',100);await f.store.campaign('g');await f.store.invite('g','link','parent');
 for(let n=1;n<=10;n++){const u=f.user('child'+n,n);await f.store.joined('g',u.discord_id,f.at,'link',null);await f.store.sync('g',[f.profile(u)]);}
 let r=await f.store.sync('g',[f.profile(parent)]);assert.equal(r.players[0].keysTotal,11);assert.equal(r.players[0].alliance,true);
 const child=f.users[1];r=await f.store.sync('g',[f.profile(child)]);assert.equal(r.players[0].keysTotal,11);
 const count=f.grants.size;await f.store.sync('g',[f.profile(child),f.profile(parent)]);assert.equal(f.grants.size,count);
 const late=f.user('late',11);await f.store.joined('g','late',f.at,'link',null);r=await f.store.sync('g',[f.profile(late)]);assert.equal(r.players[0].keysTotal,11);assert.equal(r.players[0].alliance,true);
});
test('Store: frozen reward amounts and frozen Minecraft identities prevent relink rewards',async()=>{
 const f=fixture(),parent=f.user('parent',100),child=f.user('child',1);await f.store.campaign('g');await f.store.joined('g','child',f.at,null,'parent');
 await f.store.sync('g',[f.profile(child)]);await f.store.configure('g','admin',{keys:[64,2,3,5]});
 let r=await f.store.sync('g',[f.profile(parent),f.profile(child)]);assert.deepEqual(r.players.map(p=>p.keysTotal),[1,1]);
 parent.minecraft_uuid=f.uuid(101);child.minecraft_uuid=f.uuid(2);r=await f.store.sync('g',[f.profile(parent),f.profile(child)]);assert.deepEqual(r.players.map(p=>p.keysTotal),[0,0]);
 await f.store.left('g','child');await f.store.joined('g','child',f.at+1,null,'different');assert.equal(f.members[0].inviter_id,'parent');
});
test('Store: ambiguous attribution is repairable once; pause stops grants and rejoin is tracked',async()=>{
 const f=fixture(),parent=f.user('parent',100),child=f.user('child',1);await f.store.campaign('g');await f.store.joined('g','child',f.at,null,null);
 let r=await f.store.sync('g',[f.profile(child)]);assert.equal(r.players[0].keysTotal,0);
 await f.store.attribute('g','admin','child','parent');await assert.rejects(()=>f.store.attribute('g','admin','child','other'),/indéterminée/);
 await f.store.configure('g','admin',{enabled:false});await f.store.left('g','child');await f.store.joined('g','child',f.at+1,null,'other');assert.equal(f.members[0].active,1);
 r=await f.store.sync('g',[f.profile(child)]);assert.equal(r.players[0].keysTotal,0);
 await f.store.configure('g','admin',{enabled:true});r=await f.store.sync('g',[f.profile(child)]);assert.equal(r.players[0].keysTotal,1);
});
