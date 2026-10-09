import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
Object.assign(process.env, {
  NODE_ENV:"test", PUBLIC_API_URL:"https://example.test", SITE_ORIGIN:"https://example.test",
  DB_HOST:"127.0.0.1", DB_NAME:"unused_test", DB_USER:"unused_test", DB_PASSWORD:"unused_test",
  COOKIE_SECRET:"test-only-cookie-secret-never-used-in-production",
  MINECRAFT_SERVER_KEY:"test-only-server-secret-never-used-in-production",
});
const {app}=await import("../dist/server.js");
const {pool}=await import("../dist/db.js");
test("price bridge is read-only, authenticated, and rejects a malformed catalogue",async()=>{
  const directory=mkdtempSync(join(tmpdir(),"cobblestar-policy-")), original=process.cwd();
  const execute=pool.execute;pool.execute=async()=>{throw new Error("Price bridge must not access player balances");};
  try {
    const url="/api/internal/economy/policy";
    assert.equal((await app.inject({url})).statusCode,401);
    assert.equal((await app.inject({url,headers:{"x-cobblestar-server-key":"wrong-key"}})).statusCode,401);
    const headers={"x-cobblestar-server-key":process.env.MINECRAFT_SERVER_KEY};
    const response=await app.inject({url,headers});assert.equal(response.statusCode,200);
    assert.equal(response.json().values["grades.gardien"],1_200_000);
    assert.equal((await app.inject({url,method:"POST",headers,payload:{balance:1_000_000}})).statusCode,404);
    process.chdir(directory);writeFileSync("economy.policy.json",'{"version":1,"values":{}}');
    assert.equal((await app.inject({url,headers})).statusCode,503);
  } finally {process.chdir(original);pool.execute=execute;await app.close();await pool.end();rmSync(directory,{recursive:true,force:true});}
});
