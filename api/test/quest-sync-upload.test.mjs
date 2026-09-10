import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {randomUUID, createHash} from 'node:crypto';
import {createQuestUploadReceiver} from '../dist/quest-sync-upload.js';

function upload(body, size=4096, compressed=gzipSync(JSON.stringify(body))) {
  const count=Math.ceil(compressed.length/size), uploadId=randomUUID(), digest=createHash('sha256').update(compressed).digest('hex');
  return Array.from({length:count},(_,index)=>({serverId:'main',uploadId,digest,index,count,data:compressed.subarray(index*size,(index+1)*size).toString('base64')}));
}
test('complete, verified gzip JSON only; reordered/duplicate chunks and isolated servers',async()=>{
  const body={serverId:'main',observed:{catalog:{protocol:2,items:Array.from({length:12000},(_,i)=>({id:`item:${i}`,label:'é'.repeat(100)}))}}};
  assert.ok(Buffer.byteLength(JSON.stringify(body))>2*1024*1024);
  const chunks=upload(body), receive=createQuestUploadReceiver(); assert.ok(chunks.length>1);
  for(const chunk of chunks.slice(1).reverse()) {
    assert.ok(Buffer.byteLength(JSON.stringify(chunk))<96*1024);
    assert.equal((await receive(chunk)).complete,false);
    assert.equal((await receive(chunk)).complete,false,'identical chunk retry');
  }
  const complete=await receive(chunks[0]); assert.equal(complete.complete,true); assert.deepEqual(complete.body,body);
  const other=upload({serverId:'other'}).map(c=>({...c,serverId:'other'}));
  assert.deepEqual((await receive(other[0])).body,{serverId:'other'});
});
test('corruption, conflicting chunks, wrong server and decompression bombs fail closed',async()=>{
  const receive=createQuestUploadReceiver(), body={serverId:'main',value:'normal'};
  await assert.rejects(()=>receive({...upload(body)[0],digest:'0'.repeat(64)}),/CHECKSUM/);
  await assert.rejects(()=>receive(upload(body,4096,Buffer.from('not-gzip'))[0]),/COMPRESSED/);
  await assert.rejects(()=>receive({...upload(body)[0],serverId:'wrong'}),/COMPRESSED/);
  const chunks=upload({serverId:'main',value:randomUUID().repeat(100)},8);
  await receive(chunks[0]); await assert.rejects(()=>receive({...chunks[0],digest:'0'.repeat(64)}),/CONFLICT/);
  const bomb=upload({serverId:'main',value:'x'.repeat(16*1024*1024)});
  for(const chunk of bomb.slice(0,-1)) await receive(chunk);
  await assert.rejects(()=>receive(bomb.at(-1)),/COMPRESSED/);
});
test('expired transfers cannot accidentally complete with their remaining fragments',async()=>{
  let clock=0; const receive=createQuestUploadReceiver(()=>clock), chunks=upload({serverId:'main',value:'small'},8);
  await receive(chunks[0]); clock=120001;
  for(const chunk of chunks.slice(1)) assert.equal((await receive(chunk)).complete,false);
  assert.equal((await receive(chunks[0])).complete,true);
});
