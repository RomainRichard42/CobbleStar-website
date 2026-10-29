import test from 'node:test';
import assert from 'node:assert/strict';
import {modelDepthRange} from '../public-site/src/scripts/model-depth.ts';

test('model depth keeps the complete model visible across supported zoom levels',()=>{
 for(const radius of [1,12,50,500])for(const zoom of [1.1,3,10]){
  const distance=radius*zoom,{near,far}=modelDepthRange(radius,distance);
  assert.ok(near>0&&near<distance-radius);
  assert.ok(far>distance+radius);
 }
});

test('thin skin overlays remain distinguishable even with a 16-bit depth buffer',()=>{
 const radius=12,distance=radius*3,{near,far}=modelDepthRange(radius,distance);
 const depth=z=>far/(far-near)-far*near/((far-near)*z);
 const steps=(depth(distance)-depth(distance-.01))*65535;
 assert.ok(steps>1,`0.01-unit overlays must span a depth step, got ${steps}`);
});
