import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import mysql from "mysql2/promise";
import Fastify from "fastify";
Object.assign(process.env,{NODE_ENV:"test",PUBLIC_API_URL:"https://example.test",SITE_ORIGIN:"https://example.test",DB_HOST:"127.0.0.1",DB_NAME:"unused_daily",DB_USER:"unused",DB_PASSWORD:"unused",COOKIE_SECRET:"test-only-cookie-secret-never-production",MINECRAFT_SERVER_KEY:"test-only-server-secret-never-production",GAME_ADMIN_DISCORD_IDS:"writer",GAME_ADMIN_READ_DISCORD_IDS:"reader"});
const { dailyStore }=await import("../dist/daily-store.js");
const { registerDaily }=await import("../dist/daily.js");
const { pool }=await import("../dist/db.js");
const { daysInMonth,parisDate,emptyCalendar,dailyReward,validateCalendar }=await import("../dist/daily-schema.js");
test.after(()=>pool.end());
test("months include leap February and Europe/Paris midnight/DST",()=>{
 assert.equal(daysInMonth("2026-11"),30);assert.equal(daysInMonth("2026-12"),31);assert.equal(daysInMonth("2027-02"),28);assert.equal(daysInMonth("2028-02"),29);
 assert.equal(parisDate(new Date("2026-10-31T22:59:59Z")),"2026-10-31");
 assert.equal(parisDate(new Date("2026-10-31T23:00:00Z")),"2026-11-01");
 assert.equal(parisDate(new Date("2026-06-04T22:00:00Z")),"2026-06-05");
 assert.equal(parisDate(new Date("2026-10-25T00:30:00Z")),parisDate(new Date("2026-10-25T01:30:00Z")));
 assert.throws(()=>daysInMonth("2026-13"));assert.throws(()=>validateCalendar("2026-11",emptyCalendar("2026-12")));
 assert.throws(()=>validateCalendar("2026-11",emptyCalendar("2026-11"),true));
 assert.equal(dailyReward.safeParse({...emptyCalendar("2026-11").days[0],items:[{item:"minecraft:air",count:1}]}).success,false);
 assert.equal(dailyReward.safeParse({...emptyCalendar("2026-11").days[0],stars:-1}).success,false);
});
test("routes require admin rights, same origin and server authentication",async()=>{
 const app=Fastify();let called=0;
 registerDaily(app,{session:async r=>r.headers.actor?{id:"actor",discord_id:r.headers.actor}:null,server:r=>r.headers["x-test-key"]==="internal"},
 {...dailyStore,admin:async()=>{called++;return {};},save:async()=>{called++;return 1;},view:async()=>{called++;return {};}});
 assert.equal((await app.inject("/api/admin/daily/2026-11")).statusCode,401);
 assert.equal((await app.inject({url:"/api/admin/daily/2026-11",headers:{actor:"outsider"}})).statusCode,403);
 assert.equal((await app.inject({method:"PUT",url:"/api/admin/daily/2026-11",headers:{actor:"reader",origin:"https://example.test"},payload:{revision:0,content:emptyCalendar("2026-11")}})).statusCode,403);
 assert.equal((await app.inject({method:"PUT",url:"/api/admin/daily/2026-11",headers:{actor:"writer",origin:"https://evil.test"},payload:{revision:0,content:emptyCalendar("2026-11")}})).statusCode,403);
 assert.equal((await app.inject("/api/internal/daily?uuid="+"a".repeat(32))).statusCode,401);assert.equal(called,0);
 const good=await app.inject({url:"/api/admin/daily/2026-11",headers:{actor:"reader"}});assert.equal(good.statusCode,200);assert.equal(good.json().canWrite,false);assert.equal(good.headers["cache-control"],"no-store");
 assert.equal((await app.inject({url:"/api/admin/daily/2026-99",headers:{actor:"writer"}})).statusCode,400);
 assert.equal((await app.inject({method:"POST",url:"/api/internal/daily/claim",headers:{"x-test-key":"internal"},payload:{uuid:"a".repeat(32),serverId:"main",month:"2026-11",reward:{stars:999}}})).statusCode,400);
 await app.close();
});
test("SQL: races, missing days, month rollover, immutable rewards and exactly-once Stars", {skip:!process.env.LINK_TEST_MYSQL_PORT},async t=>{
 const database="cs_daily_test_"+randomBytes(6).toString("hex");
 const options={host:"127.0.0.1",port:Number(process.env.LINK_TEST_MYSQL_PORT),user:"root",password:"cobblestar-test-root-only"};
 const admin=await mysql.createConnection(options);let db,created=false;
 const original={execute:pool.execute,getConnection:pool.getConnection};
 try{
  await admin.query("CREATE DATABASE "+database+" CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");created=true;
  db=mysql.createPool({...options,database,connectionLimit:12});
  for(const file of (await readdir(new URL("../migrations/",import.meta.url))).filter(f=>f.endsWith(".sql")).sort()){
   for(const sql of (await readFile(new URL("../migrations/"+file,import.meta.url),"utf8")).split(/;\s*(?:\r?\n|$)/).map(s=>s.trim()).filter(Boolean))await db.query(sql);
  }
  pool.execute=db.execute.bind(db);pool.getConnection=db.getConnection.bind(db);
  const uuid=randomBytes(16).toString("hex"),uid=randomUUID(),actor=randomUUID();
  await db.execute("INSERT INTO users(id,minecraft_uuid,minecraft_username,minecraft_linked_at) VALUES(?,?,?,UTC_TIMESTAMP())",[uid,uuid,"DailyTest"]);
  await dailyStore.syncCatalog("main",[{id:"cobblemon:poke_ball",label:"Poké Ball"}]);
  const content=emptyCalendar("2026-11");content.days=content.days.map((r,i)=>({...r,label:"Jour "+(i+1),stars:10,items:[{item:"cobblemon:poke_ball",count:2}]}));
  const rev=await dailyStore.save("2026-11",content,0);assert.equal(rev,1);
  await assert.rejects(dailyStore.save("2026-11",content,0),/autre administrateur/);
  await dailyStore.publish("2026-11",1,actor,new Date("2026-11-01T12:00:00Z"));
  async function claim(date){return dailyStore.reserve(uuid,"main","2026-11",new Date(date+"T12:00:00Z"));}
  async function complete(c,date=c.date){await dailyStore.dispatch(uuid,"main",c.id);await dailyStore.result(uuid,"main",c.id,"delivered","test",new Date(date+"T12:00:00Z"));}
  const concurrent=await Promise.all(Array.from({length:8},()=>claim("2026-11-01")));
  assert.equal(new Set(concurrent.map(c=>c.id)).size,1);assert.equal(concurrent[0].day,1);
  const dispatches=await Promise.allSettled(Array.from({length:6},()=>dailyStore.dispatch(uuid,"main",concurrent[0].id)));
  assert.equal(dispatches.filter(v=>v.status==="fulfilled").length,1);
  await assert.rejects(dailyStore.result("b".repeat(32),"main",concurrent[0].id,"delivered","test"),/introuvable/);
  await Promise.all(Array.from({length:8},()=>dailyStore.result(uuid,"main",concurrent[0].id,"delivered","test",new Date("2026-11-01T12:00:00Z"))));
  assert.equal((await claim("2026-11-01")).id,concurrent[0].id);
  const second=await claim("2026-11-02");assert.equal(second.day,2);await complete(second);
  const third=await claim("2026-11-03");assert.equal(third.day,3);await complete(third);
  const fourth=await claim("2026-11-05");assert.equal(fourth.day,4,"missing Nov 4 does not skip reward 4");
  assert.equal((await dailyStore.reserve(uuid,"main","2026-11",new Date("2026-11-06T12:00:00Z"))).id,fourth.id,"pending delivery survives missed days");
  await complete(fourth,"2026-11-06");
  assert.equal((await claim("2026-11-06")).id,fourth.id,"late delivery consumes today's collection, no second reward");
  assert.equal((await dailyStore.view(uuid,new Date("2026-11-06T20:00:00Z"))).canClaim,false);
  const view=await dailyStore.view(uuid,new Date("2026-11-05T20:00:00Z"));assert.equal(view.canClaim,false);assert.equal(view.nextDay,5);
  const changed=structuredClone(content);changed.days[0].stars=999;
  await dailyStore.save("2026-11",changed,1);
  await assert.rejects(dailyStore.publish("2026-11",2,actor,new Date("2026-11-06T12:00:00Z")),/verrouillées/);
  const [[wallet]]=await db.query("SELECT balance FROM wallets WHERE user_id=?",[uid]);assert.equal(Number(wallet.balance),40);
  const [[transactions]]=await db.query("SELECT COUNT(*) total FROM star_transactions WHERE user_id=? AND kind='daily'",[uid]);assert.equal(Number(transactions.total),4);
  const next=emptyCalendar("2026-12");next.days=next.days.map(r=>({...r,cobbleCoins:50}));await dailyStore.save("2026-12",next,0);await dailyStore.publish("2026-12",1,actor,new Date("2026-11-06T12:00:00Z"));
  await assert.rejects(dailyStore.reserve(uuid,"main","2026-11",new Date("2026-11-30T23:00:00Z")),/nouveau mois/);
  const december=await dailyStore.reserve(uuid,"main","2026-12",new Date("2026-11-30T23:00:00Z"));assert.equal(december.day,1);
  await assert.rejects(dailyStore.reserve(randomBytes(16).toString("hex"),"main","2026-11",new Date("2026-11-06T12:00:00Z")),/Lie ton compte/);
  await assert.rejects(dailyStore.publish("2026-11",2,actor,new Date("2026-12-01T12:00:00Z")),/terminé/);
  await dailyStore.dispatch(uuid,"main",december.id);await dailyStore.result(uuid,"main",december.id,"review","interruption");
  assert.equal((await dailyStore.reserve(uuid,"main","2026-12",new Date("2026-12-02T12:00:00Z"))).status,"review");
  await assert.rejects(dailyStore.dispatch(uuid,"main",december.id),/déjà commencé/);
 }finally{
  pool.execute=original.execute;pool.getConnection=original.getConnection;
  if(db)await db.end();if(created)await admin.query("DROP DATABASE "+database);await admin.end();
 }
});
