import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import mysql from 'mysql2/promise';
Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'https://example.test',SITE_ORIGIN:'https://example.test',DB_HOST:'127.0.0.1',DB_NAME:'unused_test',DB_USER:'unused',DB_PASSWORD:'unused',COOKIE_SECRET:'test-only-cookie-secret-never-production',MINECRAFT_SERVER_KEY:'test-only-server-secret-never-production'});
const {voteStore}=await import('../dist/vote-store.js');const {pool}=await import('../dist/db.js');
test.after(()=>pool.end());
test('MySQL votes: concurrent attempts, single key, replay, shared IP and account relink', {skip:!process.env.LINK_TEST_MYSQL_PORT},async t=>{
 const database='cs_votes_test_'+randomBytes(6).toString('hex');
 const options={host:'127.0.0.1',port:Number(process.env.LINK_TEST_MYSQL_PORT),user:'root',password:'cobblestar-test-root-only'};
 const admin=await mysql.createConnection(options);const original={execute:pool.execute,getConnection:pool.getConnection};let db,created=false;
 try{
  await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);created=true;
  db=mysql.createPool({...options,database,connectionLimit:8});
  const dir=new URL('../migrations/',import.meta.url);
  for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort())for(const sql of (await readFile(new URL(name,dir),'utf8')).split(/;\s*(?:\r?\n|$)/).map(s=>s.trim()).filter(Boolean))await db.query(sql);
  pool.execute=db.execute.bind(db);pool.getConnection=db.getConnection.bind(db);
  async function user(name){const a={id:randomUUID(),minecraft_uuid:randomBytes(16).toString('hex'),minecraft_username:name,minecraft_linked_at:new Date()};await db.execute('INSERT INTO users(id,minecraft_uuid,minecraft_username,minecraft_linked_at) VALUES(?,?,?,UTC_TIMESTAMP())',[a.id,a.minecraft_uuid,name]);return a;}
  const a=await user('VoteTester'),expires=new Date(Date.now()+240000);
  const attempts=await Promise.all([voteStore.create(a,'serveur_prive','ABCDEF',null,expires),voteStore.create(a,'serveur_prive','GHIJKL',null,expires)]);
  assert.equal(attempts[0].id,attempts[1].id);
  const attempt=attempts[0];assert.equal((await voteStore.active(a.id,'serveur_prive')).id,attempt.id);
  assert.equal(await voteStore.get(randomUUID(),attempt.id),null);
  const refs=await Promise.all([voteStore.claim(a,attempt,'sp:test:unique'),voteStore.claim(a,attempt,'sp:test:unique')]);assert.equal(refs[0],refs[1]);
  const [[claim]]=await db.query('SELECT COUNT(*) n,SUM(reward_keys) total FROM vote_claims WHERE user_id=?',[a.id]);assert.equal(Number(claim.n),1);assert.equal(Number(claim.total),1);
  assert.equal((await voteStore.get(a.id,attempt.id)).otp,null);
  await assert.rejects(voteStore.create(a,'serveur_prive','MNOPQR',null,expires),/VOTE_COOLDOWN_ACTIVE/);
  const b=await user('SecondTester'),c=await user('ThirdTester'),ip=randomBytes(32).toString('hex');
  const ab=await voteStore.create(b,'serveursminecraft',null,ip,expires),ac=await voteStore.create(c,'serveursminecraft',null,ip,expires);
  const results=await Promise.allSettled([voteStore.claim(b,ab,'sm:b'),voteStore.claim(c,ac,'sm:c')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  const d=await user('RelinkTester'),ad=await voteStore.create(d,'top_serveurs',null,null,expires);
  await db.execute('UPDATE users SET minecraft_uuid=? WHERE id=?',[randomBytes(16).toString('hex'),d.id]);await assert.rejects(voteStore.claim(d,ad,'top:d'),/VOTE_ACCOUNT_CHANGED/);
  const [[none]]=await db.query('SELECT COUNT(*) n FROM vote_claims WHERE user_id=?',[d.id]);assert.equal(Number(none.n),0);
 }finally{pool.execute=original.execute;pool.getConnection=original.getConnection;if(db)await db.end();if(created)await admin.query(`DROP DATABASE \`${database}\``);await admin.end();}
});
