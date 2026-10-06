import test,{after} from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40)});
const [{CommunityEventStore},{pool}]=await Promise.all([import('../dist/discord-community-events.js'),import('../dist/db.js')]);
after(()=>pool.end());
// Transactional SQL double. The real MySQL counterpart verifies FOR UPDATE concurrency in CI.
function database() {
  let events=new Map(),participants=[],notices=[],serial=0,queue=Promise.resolve(),rollbacks=0,locks=0;
  const copy=v=>structuredClone(v);
  async function query(sql,a=[]) {
    if(sql.includes('FROM discord_settings'))return [[{guild_id:a[0]}],[]];
    if(sql.includes('COUNT(*)'))return [[{n:[...events.values()].filter(e=>e.guild_id===a[0]&&['scheduled','running'].includes(e.status)).length}],[]];
    if(sql.includes('FROM discord_community_events')) {
      let rows=[...events.values()];
      if(sql.includes('interaction_id=?'))rows=rows.filter(e=>e.interaction_id===a[0]&&e.guild_id===a[1]);
      else rows=rows.filter(e=>e.guild_id===a[0]&&e.id===a[1]);
      if(sql.includes('FOR UPDATE'))locks++;
      return [rows.map(copy),[]];
    }
    if(sql.includes('FROM discord_community_participants'))return [participants.filter(p=>p.event_id===a[0]&&(!sql.includes('user_id=?')||p.user_id===a[1])).sort((a,b)=>a.position-b.position).map(copy),[]];
    throw Error('Unexpected query: '+sql);
  }
  async function execute(sql,a=[]) {
    if(sql.startsWith('INSERT IGNORE INTO discord_settings'))return [{affectedRows:1},[]];
    if(sql.includes('INSERT INTO discord_community_events')) {
      const [id,guild_id,creator_id,channel_id,interaction_id,title,kind,details,starts_at_ms,ends_at_ms,created_at_ms,capacity]=a;
      events.set(id,{id,guild_id,creator_id,channel_id,interaction_id,title,kind,details,starts_at_ms,ends_at_ms,created_at_ms,capacity,status:'scheduled',revision:1,schedule_version:1,published_revision:0,message_id:null});
    }else if(sql.includes('INSERT INTO discord_community_participants')) {
      const [event_id,user_id,status,joined_at_ms,confirmed_at_ms]=a;assert.ok(!participants.some(p=>p.event_id===event_id&&p.user_id===user_id));
      participants.push({event_id,user_id,status,joined_at_ms,confirmed_at_ms,position:++serial,dm_reminders:0});
    }else if(sql.includes('INSERT INTO discord_community_notifications')) {
      const [event_id,schedule_version,kind,user_id,available_at_ms,expires_at_ms]=a;
      const old=notices.find(n=>n.event_id===event_id&&n.schedule_version===schedule_version&&n.kind===kind&&n.user_id===user_id);
      if(old){if(old.state==='skipped')old.state='pending';}else notices.push({event_id,schedule_version,kind,user_id,available_at_ms,expires_at_ms,state:'pending'});
    }else if(sql.startsWith('DELETE FROM discord_community_participants'))participants=participants.filter(p=>p.event_id!==a[0]||p.user_id!==a[1]);
    else if(sql.startsWith('UPDATE discord_community_participants')) {
      const p=participants.find(p=>p.event_id===a[1]&&p.user_id===a[2]);
      if(sql.includes("status='confirmed'")){p.status='confirmed';p.confirmed_at_ms=a[0];}else p.dm_reminders=a[0]?1:0;
    }else if(sql.startsWith('UPDATE discord_community_notifications')) {
      for(const n of notices)if(n.event_id===a[0]&&n.state==='pending'&&(!sql.includes('user_id=?')||n.user_id===a[1]))n.state='skipped';
    }else if(sql.startsWith('UPDATE discord_community_events')) {
      const e=events.get(a.at(-1));
      if(sql.includes('title=?'))Object.assign(e,{title:a[0],details:a[1],starts_at_ms:a[2],ends_at_ms:a[3],capacity:a[4],schedule_version:e.schedule_version+a[5]});
      if(sql.includes("status='cancelled'"))Object.assign(e,{status:'cancelled',cancel_reason:a[0]});
      e.revision++;
    }else throw Error('Unexpected execute: '+sql);
    return [{affectedRows:1},[]];
  }
  const db={query,execute,getConnection:async()=>{
    let release,snapshot;
    return {query,execute,beginTransaction:async()=>{
      const previous=queue;queue=new Promise(r=>release=r);await previous;
      snapshot=[copy(events),copy(participants),copy(notices),serial];
    },commit:async()=>release(),rollback:async()=>{[events,participants,notices,serial]=snapshot;rollbacks++;release();},release:()=>{}};
  }};
  return {db,rows:()=>({events,participants,notices,rollbacks,locks})};
}
const guild='123456789012345670',actor='123456789012345671',channel='123456789012345672';
const now=Date.now(),draft={title:'Raid test',details:'No network',kind:'raid',startsAt:now+30*3600000,endsAt:now+31*3600000,capacity:1};
test('SQL store transactions: duplicate join, FIFO promotion, opt-in and revocation preserve all participants',async()=>{
  const f=database(),store=new CommunityEventStore(f.db),e=await store.create(guild,actor,channel,'123456789012345673',draft,now);
  assert.equal((await store.create(guild,actor,channel,'123456789012345673',draft,now)).id,e.id);
  await Promise.all(Array.from({length:20},(_,n)=>store.join(guild,e.id,String(123456789012345680n+BigInt(n)),now)));
  const p=await store.participants(e.id);assert.equal(p.length,20);assert.equal(p.filter(p=>p.status==='confirmed').length,1);
  const first=p[0],next=p[1];await store.join(guild,e.id,first.user_id,now);assert.equal((await store.participants(e.id)).length,20);
  assert.equal(await store.toggleDm(guild,e.id,next.user_id,now),true);
  await store.leave(guild,e.id,first.user_id,now);
  assert.equal((await store.participants(e.id)).find(p=>p.status==='confirmed').user_id,next.user_id);
  assert.ok(f.rows().notices.some(n=>n.user_id===next.user_id&&n.kind.startsWith('place:')));
  assert.equal(await store.toggleDm(guild,e.id,next.user_id,now),false);
  assert.ok(f.rows().notices.filter(n=>n.user_id===next.user_id).every(n=>n.state==='skipped'));
  assert.ok(f.rows().locks>=24);assert.equal((await new CommunityEventStore(f.db).participants(e.id)).length,19);
});
test('Edits never evict confirmed players, rollback is atomic and a moved schedule supersedes old jobs',async()=>{
  const f=database(),store=new CommunityEventStore(f.db),e=await store.create(guild,actor,channel,'123456789012345673',{...draft,capacity:2},now);
  await store.join(guild,e.id,'123456789012345680',now);await store.join(guild,e.id,'123456789012345681',now);
  await assert.rejects(()=>store.edit(guild,e.id,{...draft,title:'Lost change'},now),/plus d’inscrits/);
  assert.equal((await store.get(guild,e.id)).title,draft.title);assert.equal((await store.get(guild,e.id)).capacity,2);assert.equal(f.rows().rollbacks,1);
  await store.edit(guild,e.id,{...draft,capacity:2,startsAt:draft.startsAt+3600000,endsAt:draft.endsAt+3600000},now);
  assert.equal((await store.get(guild,e.id)).schedule_version,2);
  assert.ok(f.rows().notices.filter(n=>n.schedule_version===1).every(n=>n.state==='skipped'));
  await store.toggleDm(guild,e.id,'123456789012345680',now);await store.cancel(guild,e.id,'Report',now);
  assert.ok(f.rows().notices.filter(n=>n.kind!=='cancel').every(n=>n.state==='skipped'));
  assert.ok(f.rows().notices.some(n=>n.kind==='cancel'&&n.user_id==='123456789012345680'));
  assert.equal(await store.toggleDm(guild,e.id,'123456789012345680',now),false);
  assert.ok(f.rows().notices.filter(n=>n.kind==='cancel').every(n=>n.state==='skipped'));
  await assert.rejects(()=>store.toggleDm(guild,e.id,'123456789012345680',now),/fermées/);
  await assert.rejects(()=>store.join(guild,e.id,'123456789012345690',now),/fermées/);
});
test('Wrong guild, unknown participant and started event fail closed without writes',async()=>{
  const f=database(),store=new CommunityEventStore(f.db),e=await store.create(guild,actor,channel,'123456789012345673',draft,now);
  await assert.rejects(()=>store.join('123456789012345699',e.id,'123456789012345680',now),/introuvable/);
  await assert.rejects(()=>store.toggleDm(guild,e.id,'123456789012345680',now),/Inscris-toi/);
  await assert.rejects(()=>store.join(guild,e.id,'123456789012345680',draft.startsAt),/fermées/);
  assert.equal((await store.participants(e.id)).length,0);
});
