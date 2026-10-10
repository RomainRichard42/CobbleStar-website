import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {buildStarPack} from '../dist/star-assets.js';

function unzip(zip){
 let at=0;const files=new Map();while(zip.readUInt32LE(at)===0x04034b50){
  const size=zip.readUInt32LE(at+18),nl=zip.readUInt16LE(at+26),extra=zip.readUInt16LE(at+28),start=at+30+nl+extra;
  files.set(zip.toString('utf8',at+30,at+30+nl),inflateRawSync(zip.subarray(start,start+size)));at=start+size;
 }assert.equal(zip.readUInt32LE(at),0x02014b50);return files;
}
test('Regional storm/tide models and animated effects ship in mandatory pack without Star publication',()=>{
 const files=unzip(buildStarPack([],[])),prefix='assets/cobblestar_planets/';
 for(const s of ['charizard','feraligatr']){
  const id=s+'_asteria',gp=prefix+`bedrock/pokemon/models/regional/${id}.geo.json`,g=JSON.parse(files.get(gp))['minecraft:geometry'][0];
  assert.deepEqual(files.get(gp),readFileSync(new URL('../regional-starters/'+gp,import.meta.url)));
  const names=new Set(g.bones.map(b=>b.name));assert.equal(names.size,g.bones.length);for(const b of g.bones)if(b.parent)assert.ok(names.has(b.parent));
  const r=JSON.parse(files.get(prefix+`bedrock/pokemon/resolvers/regional/${id}.json`));
  for(const v of r.variations){
   assert.ok(v.aspects.includes('cobblestar_asteria')&&!v.aspects.includes('star'));assert.equal(v.poser,'cobblemon:'+s);assert.equal(v.model,'cobblestar_planets:'+id+'.geo');
   const textures=[v.texture,...v.layers.flatMap(l=>typeof l.texture==='string'?[l.texture]:l.texture.frames)];
   for(const t of textures){const p='assets/'+t.replace(':','/'),png=files.get(p);assert.ok(png,p);assert.deepEqual(png,readFileSync(new URL('../regional-starters/'+p,import.meta.url)));assert.equal(png.readUInt32BE(16),g.description.texture_width);assert.equal(png.readUInt32BE(20),g.description.texture_height);}
  }
 }
});
