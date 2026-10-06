import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';

test('MySQL events: concurrent last slot, FIFO promotion, restart, edit rollback and cancellation',{skip:!process.env.LINK_TEST_MYSQL_PORT},async()=>{
  const database='cs_events_test_'+randomBytes(6).toString('hex');
  const access={host:'127.0.0.1',port:Number(process.env.LINK_TEST_MYSQL_PORT),user:'root',password:'cobblestar-test-root-only'};
  const admin=await mysql.createConnection(access);let db,globalPool;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db=mysql.createPool({...access,database,connectionLimit:10});
    await db.query('CREATE TABLE discord_settings(guild_id VARCHAR(24) PRIMARY KEY,settings JSON NOT NULL) ENGINE=InnoDB');
    const migration=await readFile(new URL('../migrations/016_discord_community_events.sql',import.meta.url),'utf8');
    for(let replay=0;replay<2;replay++)for(const statement of migration.split(/;\s*(?:\r?\n|$)/).map(s=>s.trim()).filter(Boolean))await db.query(statement);
    Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40)});
    const {CommunityEventStore}=await import('../dist/discord-community-events.js');globalPool=(await import('../dist/db.js')).pool;
    const store=new CommunityEventStore(db),now=Date.now(),guild='123456789012345670',actor='123456789012345671',channel='123456789012345672';
    const draft={title:'Tournoi test CI',details:'Base jetable, aucun Discord',kind:'tournoi',startsAt:now+30*3600000,endsAt:now+31*3600000,capacity:1};
    const event=await store.create(guild,actor,channel,'123456789012345673',draft,now);
    assert.equal((await store.create(guild,actor,channel,'123456789012345673',draft,now)).id,event.id);
    await Promise.all(Array.from({length:12},(_,n)=>store.join(guild,event.id,String(123456789012345680n+BigInt(n)),now)));
    let people=await store.participants(event.id);assert.equal(people.length,12);assert.equal(people.filter(p=>p.status==='confirmed').length,1);
    const first=people.find(p=>p.status==='confirmed'),next=people.find(p=>p.status==='waiting');
    await store.join(guild,event.id,first.user_id,now);assert.equal((await store.participants(event.id)).length,12);
    await store.toggleDm(guild,event.id,next.user_id,now);
    await store.leave(guild,event.id,first.user_id,now);
    people=await store.participants(event.id);assert.equal(people.filter(p=>p.status==='confirmed').length,1);assert.equal(people.find(p=>p.status==='confirmed').user_id,next.user_id);
    const [jobs]=await db.query('SELECT * FROM discord_community_notifications WHERE event_id=? AND user_id=?',[event.id,next.user_id]);
    assert.ok(jobs.some(j=>j.kind.startsWith('place:')));assert.ok(jobs.some(j=>j.kind==='24h'));
    const restarted=new CommunityEventStore(db);assert.equal((await restarted.participants(event.id)).length,11);
    await store.edit(guild,event.id,{...draft,capacity:2},now);assert.equal((await store.participants(event.id)).filter(p=>p.status==='confirmed').length,2);
    await assert.rejects(()=>store.edit(guild,event.id,{...draft,title:'Wrong',capacity:1},now),/plus d’inscrits/);
    assert.equal((await store.get(guild,event.id)).title,draft.title);assert.equal((await store.get(guild,event.id)).capacity,2);
    await store.edit(guild,event.id,{...draft,capacity:2,startsAt:draft.startsAt+3600000,endsAt:draft.endsAt+3600000},now);
    assert.equal((await store.get(guild,event.id)).schedule_version,2);
    assert.equal((await db.query("SELECT COUNT(*) n FROM discord_community_notifications WHERE event_id=? AND schedule_version=1 AND state='pending'",[event.id]))[0][0].n,0);
    const due=await store.due(guild,now+8*3600000);assert.ok(due.every(n=>n.schedule_version===2));
    await store.cancel(guild,event.id,'Annulation test CI',now);assert.equal((await store.get(guild,event.id)).status,'cancelled');
    await assert.rejects(()=>store.join(guild,event.id,'123456789012345699',now),/fermées/);
    assert.equal((await db.query("SELECT COUNT(*) n FROM discord_community_notifications WHERE event_id=? AND kind<>'cancel' AND state='pending'",[event.id]))[0][0].n,0);
    assert.ok((await store.due(guild,now)).some(n=>n.kind==='cancel'));
    assert.equal(await store.get('123456789012345698',event.id),undefined);
    await store.housekeeping(guild,1,draft.endsAt+3*86400000);assert.equal((await store.participants(event.id)).length,0);
  }finally {
    if(db)await db.end();if(globalPool)await globalPool.end();
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);await admin.end();
  }
});
