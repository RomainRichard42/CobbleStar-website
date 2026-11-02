import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {withServerResources} from '../dist/server-resource-pack.js';
import {buildStarPack} from '../dist/star-assets.js';

function unpack(zip){let at=0;const files=new Map();while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),length=zip.readUInt16LE(at+26),start=at+30+length+zip.readUInt16LE(at+28),name=zip.toString('utf8',at+30,at+30+length);assert.ok(!files.has(name));files.set(name,inflateRawSync(zip.subarray(start,start+size)));at=start+size;}return files;}

test('Single mandatory publication preserves every base asset and all existing shared cosmetics',()=>{
 const base=withServerResources(new Map()),files=unpack(buildStarPack([],[]));
 assert.equal(base.size,10043);
 for(const [path,data] of base){
  if(path==='assets/minecraft/font/default.json')continue;
  assert.deepEqual(files.get(path),data,path);
 }
 assert.ok([...base.keys()].filter(p=>p.startsWith('assets/xaerominimap/')).length>7000,'real E19 minimap icons');
 assert.ok([...base.keys()].filter(p=>p.startsWith('assets/minecraft/textures/gui/')).length>100,'real PackPack GUI');
 for(const folder of ['gallery-assets','rank-tags','npc-studio-assets']){
  const root=new URL(`../${folder}/`,import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root)));
  for(const path of manifest.files)assert.deepEqual(files.get(path),readFileSync(new URL(path,root)),path);
 }
 assert.ok([...files.keys()].every(p=>!p.startsWith('data/')));
 assert.equal(JSON.parse(files.get('pack.mcmeta')).pack.pack_format,34);
 const metadata=JSON.parse(readFileSync(new URL('../server-resource-pack/manifest.json',import.meta.url)));
 assert.equal(metadata.inputs.length,3);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../server-resource-pack/base.zip',import.meta.url))).digest('hex'),metadata.sha256);
});

test('Current publication wins collisions; fonts keep lower glyphs and language keys',()=>{
 const path='assets/minecraft/font/default.json';
 const generated=new Map([[path,Buffer.from(JSON.stringify({providers:[{type:'reference',id:'cobblestar_planets:ranks'}]}))],
 ['assets/cobblemon/textures/gui/summary/icon_shiny.png',Buffer.from('current')]]);
 const merged=withServerResources(generated),providers=JSON.parse(merged.get(path)).providers;
 assert.equal(providers[0].id,'cobblestar_planets:ranks');assert.equal(providers.length,3);
 assert.equal(merged.get('assets/cobblemon/textures/gui/summary/icon_shiny.png').toString(),'current');
 assert.equal(generated.size,2,'input map is not modified');
});

test('Kinetic packages the base archive together with its verification manifest',()=>{
 const packager=readFileSync(new URL('../../scripts/package-kinetic.mjs',import.meta.url),'utf8');
 assert.ok(packager.includes('"api/server-resource-pack/base.zip"'));
 assert.ok(packager.includes('"api/server-resource-pack/manifest.json"'));
});
