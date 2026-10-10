import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {buildStarPack} from '../dist/star-assets.js';
const species=['chikorita','bayleef','meganium'];
const prefix='assets/cobblestar_planets/';
function unzip(zip){
 let at=0;const files=new Map();
 while(zip.readUInt32LE(at)===0x04034b50){
  const compressed=zip.readUInt32LE(at+18),nameLength=zip.readUInt16LE(at+26),extra=zip.readUInt16LE(at+28),start=at+30+nameLength+extra;
  const name=zip.toString('utf8',at+30,at+30+nameLength);
  files.set(name,inflateRawSync(zip.subarray(start,start+compressed)));at=start+compressed;
 }
 assert.equal(zip.readUInt32LE(at),0x02014b50);return files;
}
test('Blossom starter family ships in mandatory pack without any Star publication',()=>{
 const files=unzip(buildStarPack([],[]));
 for(const s of species){
  const name=s+'_asteria',modelPath=prefix+`bedrock/pokemon/models/regional/${name}.geo.json`;
  assert.deepEqual(files.get(modelPath),readFileSync(new URL('../regional-starters/'+modelPath,import.meta.url)));
  const model=JSON.parse(files.get(modelPath))['minecraft:geometry'][0];
  assert.equal(model.description.identifier,`geometry.${name}`);
  const names=new Set(model.bones.map(b=>b.name));assert.equal(names.size,model.bones.length);
  for(const b of model.bones)if(b.parent)assert.ok(names.has(b.parent));
  for(const suffix of ['','_shiny','_alpha','_glow','_glow_shiny']){
   const path=prefix+`textures/pokemon/regional/${name}${suffix}.png`,png=files.get(path);
   assert.deepEqual(png,readFileSync(new URL('../regional-starters/'+path,import.meta.url)));
   assert.equal(png.readUInt32BE(16),model.description.texture_width);
   assert.equal(png.readUInt32BE(20),model.description.texture_height);
  }
  const resolver=JSON.parse(files.get(prefix+`bedrock/pokemon/resolvers/regional/${name}.json`));
  assert.equal(resolver.species,'cobblemon:'+s);
  for(const v of resolver.variations){
   assert.ok(v.aspects.includes('cobblestar_asteria'));assert.ok(!v.aspects.includes('star'));
   assert.equal(v.model,`cobblestar_planets:${name}.geo`);assert.equal(v.poser,'cobblemon:'+s);
  }
 }
});
test('Blossom models contain reference silhouettes rather than former regional ornaments',()=>{
 const files=unzip(buildStarPack([],[]));
 const bone=(s,b)=>JSON.parse(files.get(prefix+`bedrock/pokemon/models/regional/${s}_asteria.geo.json`))['minecraft:geometry'][0].bones.find(n=>n.name===b);
 assert.ok(bone('chikorita','leaf2').cubes.length>=13);
 assert.ok(bone('chikorita','leaf2').cubes.every(c=>c.rotation[0]===40));
 assert.equal(bone('bayleef','head_leaf4').cubes.length,0);
 assert.ok(bone('bayleef','torso').cubes.length>5);
 for(const side of ['left','right']){
  assert.ok(bone('meganium','antenna_'+side).cubes.length>=16);
  for(let i=2;i<=7;i++)assert.equal(bone('meganium','antenna_'+side+i).cubes.length,0);
 }
});
