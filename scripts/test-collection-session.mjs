import test from 'node:test';
import assert from 'node:assert/strict';
import {CollectionSession} from '../public-site/src/scripts/atlas/session.js';
global.window = new EventTarget();
global.document = Object.assign(new EventTarget(), {hidden:false});
const data = {userId:'one',linked:true,state:'ready',observedAt:1000,owned:[],preferences:[]};
const goal = {species:'dragonite',favorite:true,wanted:true,target:1,shiny:false,star:true,stage:'active',note:'Une cible'};
const response = (body,status=200) => new Response(JSON.stringify(body),{status});

test('collection goals are acknowledged by the server before changing local state', async t => {
 const calls=[];const session=new CollectionSession(()=>{},async(url,options)=>{calls.push(options);return response(options.method?{userId:'one',preference:goal}:data);});t.after(()=>session.dispose());
 await session.reload();assert.deepEqual(session.data.preferences,[]);
 assert.equal(await session.save(goal),true);assert.deepEqual(session.data.preferences,[goal]);
 assert.equal(calls[0].cache,'no-store');assert.equal(calls[1].headers['X-Collection-Account'],'one');
 assert.deepEqual(JSON.parse(calls[1].body),goal);
});

test('expired sessions clear owned Pokemon and preferences',async t=>{
 let expired=false;const session=new CollectionSession(()=>{},async()=>response(expired?{}:data,expired?401:200));t.after(()=>session.dispose());
 await session.reload();expired=true;await session.reload();assert.equal(session.data,null);assert.equal(await session.save(goal),false);
});

test('a late save response cannot restore the previous account',async t=>{
 let finish;let other=false;const changes=[];
 const session=new CollectionSession(d=>changes.push(d),async(url,options)=>options.method?new Promise(resolve=>{finish=resolve;}):response({...data,userId:other?'two':'one'}));t.after(()=>session.dispose());
 await session.reload();const pending=session.save(goal);other=true;window.dispatchEvent(new Event('cobblestar:account-changed'));
 assert.equal(session.data,null);finish(response({userId:'one',preference:goal}));assert.equal(await pending,false);
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(session.data.userId,'two');assert.deepEqual(session.data.preferences,[]);
});

test('failed saves preserve the last acknowledged goals',async t=>{
 const session=new CollectionSession(()=>{},async(url,options)=>response(options.method?{}:data,options.method?500:200));t.after(()=>session.dispose());
 await session.reload();await assert.rejects(session.save(goal),/Enregistrement impossible/);assert.deepEqual(session.data.preferences,[]);assert.equal(session.busy,false);
});
