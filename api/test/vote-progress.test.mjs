import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {registerVoteProgress} from '../dist/vote-progress.js';

test('Rank vote progress is server-only, UUID-normalized and read-only',async()=>{
 const app=Fastify();let calls=[];
 registerVoteProgress(app,{authorized:r=>r.headers.authorization==='server-test',count:async id=>{calls.push(id);return 53;}});
 try {
  const url='/api/internal/votes/progress?uuid=12345678-1234-1234-1234-123456789ABC';
  assert.equal((await app.inject({url})).statusCode,401);assert.equal(calls.length,0);
  assert.equal((await app.inject({url:'/api/internal/votes/progress?uuid=not-an-id',headers:{authorization:'server-test'}})).statusCode,400);assert.equal(calls.length,0);
  const result=await app.inject({url,headers:{authorization:'server-test'}});
  assert.equal(result.statusCode,200);assert.deepEqual(result.json(),{total:53});assert.deepEqual(calls,['12345678123412341234123456789abc']);
 }finally{await app.close();}
});
test('No votes returns zero; a failed provider never returns a fabricated zero',async()=>{
 for(const count of [async()=>0,async()=>{throw new Error('offline');},async()=>-1]){
  const app=Fastify();registerVoteProgress(app,{authorized:()=>true,count});
  try{const response=await app.inject({url:'/api/internal/votes/progress?uuid='+'a'.repeat(32)});
   if(response.statusCode===200)assert.deepEqual(response.json(),{total:0});else assert.equal(response.statusCode,500);
  }finally{await app.close();}
 }
});
