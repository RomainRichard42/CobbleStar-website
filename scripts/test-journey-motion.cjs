const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {runInNewContext}=require('node:vm');
const context={module:{exports:{}}};
runInNewContext(readFileSync(require.resolve('../public/astral/motion.js'),'utf8'),context);
const {readingOffsets,introScroll}=context.module.exports;

test('long sections have overlapping reading stops without a tiny last jump',()=>{
  for(const usable of [240,512,552,800]) for(const height of [640,1100,1128,2400]){
    const offsets=Array.from(readingOffsets(height,usable));
    if(height-usable<120){assert.deepEqual(offsets,[]);continue;}
    assert.equal(offsets.at(-1),height-usable);
    let previous=0;
    for(const offset of offsets){assert.ok(offset-previous>=120);assert.ok(offset-previous<=usable);previous=offset;}
  }
  assert.deepEqual(Array.from(readingOffsets(1128,552)),[288,576]);
});
test('first gesture completes the star before moving to the video',()=>{
  assert.equal(introScroll(0,0,790,1359),0);
  assert.equal(introScroll(1750,0,790,1359),790);
  assert.equal(introScroll(2550,0,790,1359),1359);
});
