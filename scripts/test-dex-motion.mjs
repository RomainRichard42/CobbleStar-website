import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {motionEvaluator} from '../public-site/src/scripts/bedrock-motion.ts';
import {animateModel} from '../public-site/src/scripts/bedrock-motion.ts';
import {meshModel} from '../public-site/src/scripts/bedrock-model.ts';
import * as THREE from 'three';
import {dexRuntimeIndex,runtimeRow,runtimeAsset} from '../api/dist/dex-runtime.js';
import {sameSkeleton} from '../api/dist/star-library.js';
test('native preview resolves exact provider even with an editing conflict',()=>{
 const addon=dexRuntimeIndex.find(r=>r.source);
 assert.equal(runtimeRow({...addon,source:{...addon.source,conflict:true}}),addon);
 assert.equal(sameSkeleton(addon,{...addon,source:{...addon.source,conflict:true}}),false);
 assert.equal(runtimeRow({...addon,source:{...addon.source,modelHash:'0'.repeat(64)}}),undefined);
 assert.equal(runtimeRow({...addon,bones:[]}),undefined);
});
test('Molang degrees, keyframe interpolation and pre/post values',()=>{
 const e=motionEvaluator();
 assert.deepEqual(e.channel(['math.sin(q.anim_time*90)',0,0],1),[1,0,0]);
 assert.deepEqual(e.channel({'0':[0,2,4],'2':[4,6,8]},1),[2,4,6]);
 assert.deepEqual(e.channel({'0':{pre:[0,0,0],post:[2,2,2]},'2':{pre:[4,4,4],post:[8,8,8]}},1),[3,3,3]);
 assert.deepEqual(e.channel({'0':{post:[0,0,0],lerp_mode:'catmullrom'},'2':[4,4,4]},1),[2,2,2]);
 assert.deepEqual(e.channel(0,1),[0,0,0]);
});
test('all native and custom animation channels evaluate to finite vectors',async()=>{
 const forms=JSON.parse(gunzipSync(readFileSync(new URL('../api/dex-runtime/motions.json.gz',import.meta.url))));
 const motions=Object.entries(forms);
 for(const row of dexRuntimeIndex){const asset=await runtimeAsset(row);assert.ok(asset.texture&&asset.model&&asset.motion,row.assetKey);motions.push([row.assetKey,asset.motion]);}
 for(const [id,m] of motions){const e=motionEvaluator(m.aspects);for(const clip of m.clips)for(const [bone,channels] of Object.entries(clip.bones))for(const [channel,value] of Object.entries(channels)){if(!['position','rotation','scale'].includes(channel))continue;for(const t of [0,.13,.5,1.7,4.5,19])assert.ok(e.channel(value,t).every(Number.isFinite),id+' '+bone+' '+channel);}}
 console.log('Validated motion sets:',motions.length);
});
test('all exported models assemble and animate without invalid transforms',async()=>{
 const material=new THREE.MeshBasicMaterial();
 for(const row of dexRuntimeIndex){
  const asset=await runtimeAsset(row),root=meshModel(asset,material),animate=animateModel(root,asset.motion);
  for(const t of [0,1]){animate(t);root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),row.assetKey+' '+o.name));}
  const box=new THREE.Box3().setFromObject(root);assert.ok(!box.isEmpty()&&box.max.y-box.min.y>0,row.assetKey);
  root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 }
 material.dispose();
});
