import test from "node:test";
import assert from "node:assert/strict";
import { nextSubscriptionMonth, canPurchaseTier, activateSubscription } from "../dist/paid-subscriptions.js";
import { getGameShopCatalog } from "../dist/shop.js";

test("validated monthly pricing and one shared family for A/B tags", () => {
  const ranks=getGameShopCatalog().filter(product=>product.deliveryMode==="subscription");
  assert.deepEqual(ranks.map(rank=>[rank.subscriptionTier,rank.starsPrice]),[["etoile",1000],["cosmique",2200],["galactique",3300]]);
  assert.equal(new Set(ranks.map(rank=>rank.subscriptionTier)).size,3);
  assert.ok(ranks.every(rank=>rank.category==="ranks"&&rank.benefits.some(value=>value.includes("F2P"))));
});
test("one calendar month in UTC, clamped month end and leap year",()=>{
  const parse=Date.parse;
  assert.equal(nextSubscriptionMonth(parse("2026-01-31T14:00:00Z"),0),parse("2026-02-28T14:00:00Z"));
  assert.equal(nextSubscriptionMonth(parse("2028-01-31T14:00:00Z"),0),parse("2028-02-29T14:00:00Z"));
  assert.equal(nextSubscriptionMonth(parse("2026-10-08T14:00:00Z"),parse("2026-11-08T14:00:00Z")),parse("2026-12-08T14:00:00Z"));
  assert.equal(nextSubscriptionMonth(parse("2026-10-08T14:00:00Z"),parse("2026-09-01T14:00:00Z")),parse("2026-11-08T14:00:00Z"));
});
test("downgrade waits for expiration; renewal and upgrades preserve remaining time",()=>{
  const current={tier:"cosmique",expires_ms:200};
  assert.equal(canPurchaseTier(current,"etoile",100),false);
  assert.equal(canPurchaseTier(current,"cosmique",100),true);
  assert.equal(canPurchaseTier(current,"galactique",100),true);
  assert.equal(canPurchaseTier(current,"etoile",200),true);
});
test("gift entitlement is unique per player and tier, unaffected by renewal or A/B",async()=>{
  const statements=[];const connection={execute:async(sql,args)=>{statements.push({sql,args});return[[],[]];}};
  await activateSubscription(connection,"user","purchase-a","cosmique",null,Date.parse("2026-10-08T14:00:00Z"));
  await activateSubscription(connection,"user","purchase-b","cosmique",{tier:"cosmique",expires_ms:Date.parse("2026-11-08T14:00:00Z")},Date.parse("2026-10-08T14:00:00Z"));
  assert.equal(statements.filter(row=>row.sql.includes("INSERT IGNORE INTO paid_subscription_gifts")).length,2);
  assert.ok(statements.filter(row=>row.sql.includes("paid_subscription_gifts")).every(row=>row.args[0]==="user"&&row.args[1]==="cosmique"));
  assert.ok(statements.filter(row=>row.sql.includes("paid_subscriptions(")).at(-1).args[2].startsWith("2026-12-08"));
  const before=statements.length;await activateSubscription(connection,"user","purchase-c","etoile",null,Date.parse("2026-10-08T14:00:00Z"));
  assert.equal(statements.length,before+1);
});
