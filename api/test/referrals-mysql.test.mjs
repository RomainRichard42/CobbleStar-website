import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40)});
const {ReferralStore}=await import('../dist/referrals.js');const {pool}=await import('../dist/db.js');after(()=>pool.end());
test('MySQL: separate referral tracks, concurrent qualification, migration replay and legacy protection',{skip:!process.env.LINK_TEST_MYSQL_PORT},async()=>{
 const database='cs_referral_test_'+randomBytes(6).toString('hex');
 const options={host:'127.0.0.1',port:Number(process.env.LINK_TEST_MYSQL_PORT),user:'root',password:'cobblestar-test-root-only'};
 const admin=await mysql.createConnection(options);let db;
 try{
  await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  db=mysql.createPool({...options,database,connectionLimit:4});
  const migration=(await readFile(new URL('../migrations/017_referrals.sql',import.meta.url),'utf8'))+'\n'+await readFile(new URL('../migrations/018_referral_tracks.sql',import.meta.url),'utf8');
  for(let replay=0;replay<2;replay++)for(const sql of migration.split(/;\s*(?:\r?\n|$)/).map(s=>s.trim()).filter(Boolean))await db.query(sql);
  await db.query('CREATE TABLE users (discord_id VARCHAR(24) UNIQUE,minecraft_uuid CHAR(32) UNIQUE,minecraft_linked_at DATETIME,merged_into CHAR(36))');
  const store=new ReferralStore(db),guild='123456789012345670',at=Math.floor((Date.now()+2000)/1000)*1000;
  const uuid=n=>n.toString(16).padStart(32,'0'),profile=n=>({uuid:uuid(n),firstSeen:at,activeSeconds:18000});
  const user=async(id,n)=>db.execute('INSERT INTO users VALUES(?,?,?,NULL)',[id,uuid(n),new Date(at+1000).toISOString().slice(0,19).replace('T',' ')]);
  await store.campaign(guild);await user('parent',100);await store.invite(guild,'own-link','parent');
  for(let n=1;n<=10;n++){await user('child'+n,n);await store.joined(guild,'child'+n,at,'own-link',null);}
  await Promise.all([store.sync(guild,Array.from({length:10},(_,i)=>profile(i+1))),store.sync(guild,Array.from({length:10},(_,i)=>profile(i+1)))]);
  let result=await store.sync(guild,[profile(100),profile(1)]);
  assert.deepEqual(result.players.map(p=>[p.keysTotal,p.alliance]),[[11,true],[0,false]]);assert.deepEqual(result.players[1].inviteeTiers,[1,2,3]);
  const [[before]]=await db.query('SELECT COUNT(*) AS n FROM referral_rewards_v2');
  await store.sync(guild,[profile(100),profile(1)]);const [[afterReplay]]=await db.query('SELECT COUNT(*) AS n FROM referral_rewards_v2');assert.equal(afterReplay.n,before.n);
  await store.configure(guild,'admin',{keys:[64,64,64,64]});result=await store.sync(guild,[profile(100),profile(1)]);assert.equal(result.players[0].keysTotal,11);
  await user('late',11);await store.joined(guild,'late',at,'own-link',null);result=await store.sync(guild,[{...profile(11),activeSeconds:36000}]);assert.equal(result.players[0].keysTotal,0);assert.equal(result.players[0].alliance,false);assert.equal(result.players[0].pulsarTotal,1);assert.deepEqual(result.players[0].inviteeTiers,[1,2,3,4]);
  await user('legacy-parent',200);await db.execute("INSERT INTO referral_rewards VALUES(?,?, 'inviter',1,1,0,?)",[guild,uuid(200),at]);
  await user('legacy-child',201);await store.joined(guild,'legacy-child',at,null,'legacy-parent');await store.sync(guild,[profile(201)]);
  result=await store.sync(guild,[profile(200)]);assert.equal(result.players[0].keysTotal,1);
  await db.execute('UPDATE users SET minecraft_uuid=? WHERE discord_id=?',[uuid(101),'parent']);result=await store.sync(guild,[profile(101)]);assert.equal(result.players[0].keysTotal,0);
  await store.left(guild,'child1');await store.joined(guild,'child1',at+1000,null,'different');const [[child]]=await db.query('SELECT inviter_id FROM referral_members WHERE invitee_id=?',['child1']);assert.equal(child.inviter_id,'parent');
 }finally{if(db)await db.end();await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);await admin.end();}
});
