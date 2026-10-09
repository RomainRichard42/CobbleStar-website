import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {economyPolicySchema, getEconomyPolicy} from "../dist/economy-policy.js";

test("economy catalogue: progressive grades, complete jobs and safe buybacks", () => {
  const p=getEconomyPolicy();
  assert.equal(p.values["grades.eclaireur"],25000);
  assert.equal(p.values["grades.elite"],p.values["grades.mercenaire"]);
  assert.equal(p.values["jobs.miner.mine_common"],2);
  assert.equal(Object.keys(p.values).filter(k=>k.startsWith("jobs.")).length,17);
  assert.equal(p.items["cobblestar_planets:booster_asteria"][0],p.items["cobblestar_planets:booster_nebelia"][0]);
  for(const [buy,sell] of Object.values(p.items))assert.ok(sell<=buy/3);
  assert.ok(p.values["raids.difficile"]>p.values["raids.facile"]);
  assert.equal(p.values["sga.certification"],2500);
});
test("policy rejects decimals, negative/excessive amounts, arbitrage and unequal final grades",()=>{
  const baseline=getEconomyPolicy();
  for(const value of [-1, 0.5, 1_000_000_001, "100"]){const p=structuredClone(baseline);p.values["jobs.miner.mine_common"]=value;assert.equal(economyPolicySchema.safeParse(p).success,false);}
  const bad=structuredClone(baseline);bad.items["cobblemon:poke_ball"]=[100,101];assert.equal(economyPolicySchema.safeParse(bad).success,false);
  const grades=structuredClone(baseline);grades.values["grades.mercenaire"]++;assert.equal(economyPolicySchema.safeParse(grades).success,false);
});
test("already approved subscription prices and referral rewards stay unchanged",()=>{
  const products=JSON.parse(readFileSync("shop.catalog.json","utf8")).products;
  for(const [tier,price] of [["etoile",1000],["cosmique",2200],["galactique",3300]])assert.equal(products.find(p=>p.id===`rank_${tier}_monthly`).starsPrice,price);
  const referral=readFileSync("src/referrals.ts","utf8");assert.match(referral,/15 Hyper Balls \+ 5 000 Cobblecoins/);
});
