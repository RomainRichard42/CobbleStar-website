import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dexInfo} from '../dist/dex-info.js';
import {createPublicDex,registerPublicDex} from '../dist/public-dex.js';
import Fastify from 'fastify';
const entry=(species,id='native-'+species,collection='Classiques')=>({species,id,collection,name:species,form:'Classique',assetUrl:''});
test('regional forms use their server types, learnset and evolution, not vanilla values',async()=>{
 const normal=await dexInfo(entry('charmander')),regional=await dexInfo(entry('charmander','charmander-asteria-base','Astéria'));
 assert.deepEqual(normal.types,['fire']);assert.deepEqual(regional.types,['fire','electric']);assert.ok(regional.moves.some(m=>m.id==='thundershock'&&m.method==='10'));assert.ok(regional.evolutions[0].form.includes('asteria'));assert.equal(regional.spawns.length,0);
});
test('legendary overrides disable vanilla spawns and expose real event conditions',async()=>{
 const moltres=await dexInfo(entry('moltres'));assert.equal(moltres.spawns.length,1);assert.equal(moltres.spawns[0].kind,'Événement légendaire CobbleStar');assert.equal(moltres.spawns[0].level,'70');assert.ok(moltres.spawns[0].exclusions.some(c=>c.label==='Zone protégée du spawn'));assert.ok(moltres.spawns[0].exclusions.some(c=>c.value.includes('battle zone')));assert.ok(moltres.spawns[0].conditions.some(c=>c.value==='Jour'));assert.ok(moltres.spawns[0].conditions.some(c=>c.value==='Temps clair'));assert.equal((await dexInfo(entry('dialga'))).spawns.length,0);
});
test('cosmetic Star and admin-only creations do not promise wild acquisition',async()=>{
 assert.equal((await dexInfo(entry('dragonite','star-dragonite-base','Star'))).spawns.length,0);assert.match((await dexInfo(entry('allodus','allodus-custom-base','Créations CobbleStar'))).acquisition,/administration/);
});
test('all catalogued species and bundled forms have typed stats and learnsets',async()=>{
 const rows=JSON.parse(readFileSync(new URL('../dex-runtime/index.json',import.meta.url))).species;const forms=JSON.parse(readFileSync(new URL('../dex.catalog.json',import.meta.url))).entries;
 for(const e of [...rows.map(r=>entry(r.species)),...forms]){if(e.species==='cobblestar_egg')continue;const d=await dexInfo(e);assert.ok(d,e.id);assert.ok(d.types.length,e.id);assert.equal(Object.keys(d.stats).length,6,e.id);assert.ok(d.moves.length,e.id);assert.ok(d.height>0&&d.weight>0,e.id);}
});
test('information endpoint rejects unpublished IDs and traversal',async()=>{
 const dex=createPublicDex({list:async()=>[],asset:async()=>null,names:async()=>new Map(),nativeSpecies:async()=>[{species:'pikachu',preview:true}],nativeKit:async()=>Buffer.alloc(0)});const app=Fastify();registerPublicDex(app,dex);
 assert.equal((await app.inject('/api/pokedex/native-pikachu/info')).statusCode,200);
 for(const id of ['star-dragonite-base','native-moltres','not-published','..%2F..%2F.env']){const r=await app.inject('/api/pokedex/'+id+'/info');assert.equal(r.statusCode,404);assert.equal(r.headers['cache-control'],'no-store');}await app.close();
});
