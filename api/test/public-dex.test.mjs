import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {readFileSync} from 'node:fs';
import {createPublicDex,registerPublicDex} from '../dist/public-dex.js';
import {nativeStarKit} from '../dist/star-library.js';
const files=new URL('../../public/downloads/pokemon-star/dragonite/',import.meta.url);
const published={species:'dragonite',model:JSON.parse(readFileSync(new URL('dragonite.geo.json',files))),texture:readFileSync(new URL('dragonite.png',files)).toString('base64')};
const source={list:async()=>[{species:'dragonite',revision:2,hasAsh:false}],asset:async s=>s==='dragonite'?{...published,actor_id:'private',draft_json:'secret'}:null,names:async()=>new Map([['dragonite','Dracolosse'],['pikachu','Pikachu']]),nativeSpecies:async()=>[{species:'pikachu',preview:true},{species:'missing_template',preview:false}],nativeKit:nativeStarKit};
test('public dex exposes only published Star and compatible native species',async()=>{
 const dex=createPublicDex(source),entries=await dex.list();
 assert.ok(entries.some(e=>e.id==='native-pikachu'));assert.equal(entries.find(e=>e.species==='missing_template').assetUrl,'');assert.equal(await dex.asset('native-missing_template'),null);
 assert.ok(entries.some(e=>e.id==='star-dragonite-base'));assert.ok(!JSON.stringify(entries).includes('private'));
 assert.equal(await dex.asset('star-unpublished-base'),null);assert.equal(await dex.asset('star-dragonite-ash'),null);assert.equal(await dex.asset('../../.env'),null);assert.equal(await dex.asset('native-unlisted'),null);
 assert.deepEqual(Object.keys(await dex.asset('star-dragonite-base')).sort(),['model','species','texture']);
 const normal=await dex.asset('native-pikachu');assert.equal(normal.species,'pikachu');assert.ok(normal.model['minecraft:geometry'][0].bones.length);
 const app=Fastify();registerPublicDex(app,dex);const response=await app.inject('/api/pokedex/star-unpublished-base/asset');assert.equal(response.statusCode,404);assert.equal(response.headers['cache-control'],'no-store');await app.close();
});
test('all bundled forms resolve to actual geometry and PNG textures',async()=>{
 const dex=createPublicDex(source),entries=await dex.list();
 for(const e of entries.filter(e=>!['Star','Classiques'].includes(e.collection))){const a=await dex.asset(e.id);assert.ok(a.model['minecraft:geometry'][0].bones.length,e.id);const b=Buffer.from(a.texture,'base64');assert.equal(b.subarray(1,4).toString(),'PNG',e.id);const d=a.model['minecraft:geometry'][0].description;assert.equal(b.readUInt32BE(16)/d.texture_width,b.readUInt32BE(20)/d.texture_height,e.id);if(a.emissive)assert.equal(Buffer.from(a.emissive,'base64').subarray(1,4).toString(),'PNG');}
 assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
});
