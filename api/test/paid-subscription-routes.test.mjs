import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
Object.assign(process.env,{
  NODE_ENV:"test",PUBLIC_API_URL:"https://example.test",SITE_ORIGIN:"https://example.test",
  DB_HOST:"127.0.0.1",DB_NAME:"unused_test",DB_USER:"unused_test",DB_PASSWORD:"unused_test",
  COOKIE_SECRET:"test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY:"test-only-server-secret-never-used-in-production",
});
const { app }=await import("../dist/server.js");
const { pool }=await import("../dist/db.js");
const uuid="123456781234123412341234567890ab";
const headers={"x-cobblestar-server-key":process.env.MINECRAFT_SERVER_KEY};
const purchase=(productId,requestId=randomUUID(),quantity=1,target=uuid)=>app.inject({method:"POST",url:"/api/internal/shop/purchase",headers,payload:{uuid:target,productId,quantity,requestId}});

test("real purchase routes: atomic debit, replay protection, expiry, renewal and gift leases (DB double)",async()=>{
  const originals={getConnection:pool.getConnection,execute:pool.execute};
  let data={wallets:{player:10000,intruder:10000},purchases:{},subscriptions:{},gifts:{},transactions:0};
  let queryCount=0,snapshot;
  const connection={
    beginTransaction:async()=>{snapshot=structuredClone(data);},commit:async()=>{},rollback:async()=>{data=snapshot;},release:()=>{},
    execute:async(sql,args)=>{
      queryCount++;const text=sql.replace(/\s+/g," ").trim();
      if(text.startsWith("SELECT u.id,w.balance")){const id=args[0]===uuid?"player":"intruder";return[[{id,balance:data.wallets[id]}]];}
      if(text.startsWith("SELECT id,user_id,product_id,stars_spent"))return[[data.purchases[args[0]]].filter(Boolean)];
      if(text.startsWith("SELECT tier,TIMESTAMPDIFF"))return[[data.subscriptions[args[0]]].filter(Boolean)];
      if(text.startsWith("UPDATE wallets SET balance=balance-")){data.wallets[args[1]]-=args[0];return[{affectedRows:1}];}
      if(text.startsWith("INSERT INTO shop_purchases")){data.purchases[args[0]]={id:args[0],user_id:args[1],product_id:args[2],stars_spent:args[3]};return[{affectedRows:1}];}
      if(text.startsWith("INSERT INTO star_transactions")){data.transactions++;return[{affectedRows:1}];}
      if(text.startsWith("INSERT INTO paid_subscriptions(")){data.subscriptions[args[0]]={tier:args[1],expires_ms:Date.parse(args[2].replace(" ","T")+"Z")};return[{affectedRows:1}];}
      if(text.startsWith("INSERT IGNORE INTO paid_subscription_gifts")){const key=args[0]+":"+args[1];data.gifts[key]??={tier:args[1],status:"pending",purchase:args[2]};return[{affectedRows:1}];}
      throw new Error("Unhandled purchase SQL: "+text);
    }
  };
  pool.getConnection=async()=>connection;
  pool.execute=async(sql,args)=>{
    queryCount++;const text=sql.replace(/\s+/g," ").trim();const id=(args[0]===uuid||args[1]===uuid)?"player":"intruder";
    if(text.startsWith("SELECT s.tier"))return[[data.subscriptions[id]].filter(Boolean)];
    if(text.startsWith("SELECT g.tier"))return[Object.entries(data.gifts).filter(([key])=>key.startsWith(id+":")).map(([,value])=>value)];
    if(text.startsWith("UPDATE paid_subscription_gifts")){
      const complete=text.includes("g.status='delivered'");const tier=args[complete?1:2];const gift=data.gifts[id+":"+tier];
      if(!gift||complete&&!(gift.status==="leased"&&gift.token===args[2])||!complete&&gift.status!=="pending")return[{affectedRows:0}];
      if(complete){gift.status="delivered";gift.token=null;}else{gift.status="leased";gift.token=args[0];}
      return[{affectedRows:1}];
    }
    throw new Error("Unhandled subscription SQL: "+text);
  };
  try {
    for(const url of ["/api/internal/shop/subscription", "/api/internal/shop/subscription/gift/claim", "/api/internal/shop/subscription/gift/complete"]){
      assert.equal((await app.inject({url,method:url.endsWith("subscription")?"GET":"POST"})).statusCode,401);
    }
    assert.equal(queryCount,0);
    assert.equal((await purchase("rank_etoile_monthly",randomUUID(),2)).statusCode,400);
    assert.equal(queryCount,0);
    data.wallets.player=500;
    assert.equal((await purchase("rank_etoile_monthly")).statusCode,409);
    assert.equal(data.wallets.player,500);assert.equal(Object.keys(data.purchases).length,0);
    data.wallets.player=10000;
    const first=randomUUID();assert.equal((await purchase("rank_cosmique_monthly",first)).statusCode,200);
    assert.equal(data.wallets.player,7800);const firstExpiry=data.subscriptions.player.expires_ms;
    assert.equal(Object.keys(data.gifts).length,1);
    assert.equal((await purchase("rank_cosmique_monthly",first)).json().duplicate,true);
    assert.equal(data.wallets.player,7800);assert.equal(data.subscriptions.player.expires_ms,firstExpiry);
    assert.equal((await purchase("rank_galactique_monthly",first)).statusCode,409);
    assert.equal((await purchase("rank_cosmique_monthly",first,1,"abcdefabcdefabcdefabcdefabcdefab")).statusCode,409);
    assert.equal(data.wallets.intruder,10000);
    assert.equal((await purchase("rank_etoile_monthly")).statusCode,409);
    assert.equal(data.wallets.player,7800);
    assert.equal((await purchase("rank_cosmique_monthly")).statusCode,200);
    assert.equal(data.wallets.player,5600);assert.ok(data.subscriptions.player.expires_ms>firstExpiry);
    assert.equal(Object.keys(data.gifts).length,1);
    const info=(await app.inject({url:"/api/internal/shop/subscription?uuid="+uuid,headers})).json();
    assert.equal(info.subscription.tier,"cosmique");assert.equal(info.gifts.length,1);
    const body={uuid,tier:"cosmique"};
    const claim=await app.inject({method:"POST",url:"/api/internal/shop/subscription/gift/claim",headers,payload:body});assert.equal(claim.statusCode,200);
    assert.equal((await app.inject({method:"POST",url:"/api/internal/shop/subscription/gift/claim",headers,payload:body})).statusCode,409);
    const token=claim.json().leaseToken;
    assert.equal((await app.inject({method:"POST",url:"/api/internal/shop/subscription/gift/complete",headers,payload:{...body,leaseToken:"x".repeat(40)}})).statusCode,409);
    assert.equal((await app.inject({method:"POST",url:"/api/internal/shop/subscription/gift/complete",headers,payload:{...body,leaseToken:token}})).statusCode,200);
    data.subscriptions.player.expires_ms=Date.now()-1;
    assert.equal((await purchase("rank_cosmique_monthly")).statusCode,200);
    assert.equal(Object.keys(data.gifts).length,1);assert.equal(data.gifts["player:cosmique"].status,"delivered");
    assert.equal((await app.inject({method:"POST",url:"/api/internal/shop/subscription/gift/claim",headers,payload:body})).statusCode,409);
    data.wallets.player=5000;
    assert.equal((await purchase("rank_galactique_monthly")).statusCode,200);
    assert.equal(data.wallets.player,1700);assert.equal(data.subscriptions.player.tier,"galactique");assert.equal(Object.keys(data.gifts).length,2);
    assert.equal(data.transactions,4);
  } finally {pool.getConnection=originals.getConnection;pool.execute=originals.execute;await app.close();await pool.end();}
});
