import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {buildStarPack} from '../dist/star-assets.js';
function unzip(zip){
 let at=0;const files=new Map();while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),nl=zip.readUInt16LE(at+26),extra=zip.readUInt16LE(at+28),start=at+30+nl+extra;files.set(zip.toString('utf8',at+30,at+30+nl),inflateRawSync(zip.subarray(start,start+size)));at=start+size;}assert.equal(zip.readUInt32LE(at),0x02014b50);return files;
}
test('All nine V5 regional stages ship in the mandatory pack without publishing a Star draft',()=>{
 const files=unzip(buildStarPack([],[])),prefix='assets/cobblestar_planets/';
 for(const [region,trio] of [['nebelia',['sprigatito','floragato','meowscarada']],['asteria',['mudkip','marshtomp','swampert']],['nebelia',['litten','torracat','incineroar']]])for(const s of trio){
  const id=s+'_'+region,gp=prefix+`bedrock/pokemon/models/regional/${id}.geo.json`,g=JSON.parse(files.get(gp))['minecraft:geometry'][0];
  assert.deepEqual(files.get(gp),readFileSync(new URL('../regional-starters/'+gp,import.meta.url)));
  const r=JSON.parse(files.get(prefix+`bedrock/pokemon/resolvers/regional/${id}.json`));assert.equal(r.variations.length,4);
  for(const v of r.variations){assert.equal(v.poser,'cobblemon:'+s);assert.equal(v.model,'cobblestar_planets:'+id+'.geo');assert.ok(v.aspects.includes('cobblestar_'+region)&&!v.aspects.includes('star'));
   for(const t of [v.texture,...v.layers.map(l=>l.texture)]){const p='assets/'+t.replace(':','/'),png=files.get(p);assert.deepEqual(png,readFileSync(new URL('../regional-starters/'+p,import.meta.url)));assert.equal(png.readUInt32BE(16),g.description.texture_width);assert.equal(png.readUInt32BE(20),g.description.texture_height);}
  }
 }
 for(const s of ['mudkip','marshtomp','swampert'])assert.ok(files.has(prefix+`bedrock/pokemon/models/regional/${s}_nebelia.geo.json`),'Legacy individuals keep their original models');
});
