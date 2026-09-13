import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {randomUUID,createHash} from 'node:crypto';
import {createQuestUploadReceiver} from '../dist/quest-sync-upload.js';

test('Star catalogue crosses a 96 KiB proxy without publishing partial lists',async()=>{
 const body={serverId:'main',hash:'',ready:0,total:0,error:'',catalog:Array.from({length:1000},(_,i)=>({species:`species_${i}`,poser:'cobblemon:dragonite',bones:Array.from({length:120},(_,j)=>({name:`bone_${j}`,parent:'root'}))}))};
 assert.ok(Buffer.byteLength(JSON.stringify(body))>2*1024*1024);
 const compressed=gzipSync(JSON.stringify(body)),uploadId=randomUUID(),digest=createHash('sha256').update(compressed).digest('hex');
 const size=4096,count=Math.ceil(compressed.length/size),receive=createQuestUploadReceiver(Date.now,'STAR');let result;
 for(let index=0;index<count;index++){
  const chunk={serverId:'main',uploadId,digest,index,count,data:compressed.subarray(index*size,(index+1)*size).toString('base64')};
  assert.ok(Buffer.byteLength(JSON.stringify(chunk))<96*1024);result=await receive(chunk);
  if(index<count-1)assert.equal(result.complete,false);
 }
 assert.equal(result.complete,true);assert.deepEqual(result.body,body);
});
test('Star and quest uploads are isolated and failures name Star',async()=>{
 const star=createQuestUploadReceiver(Date.now,'STAR'),quests=createQuestUploadReceiver();
 await assert.rejects(()=>star({}),/INVALID_STAR_CHUNK/);
 await assert.rejects(()=>quests({}),/INVALID_QUEST_CHUNK/);
});
