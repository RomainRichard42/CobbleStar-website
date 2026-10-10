import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {buildStarPack,png} from '../dist/star-assets.js';
import {appendMascotAssets} from '../dist/mascot-assets.js';
const root='assets/cobblestar_planets/';
function unpack(zip){const files=new Map();let at=0;while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),len=zip.readUInt16LE(at+26),start=at+30+len+zip.readUInt16LE(at+28);files.set(zip.toString('utf8',at+30,at+30+len),inflateRawSync(zip.subarray(start,start+size)));at=start+size;}assert.equal(zip.readUInt32LE(at),0x02014b50);return files;}
const files=unpack(buildStarPack([],[]));
for(const id of ['astreval','basteros','ludilux'])test(id+': approved native model, shaders and articulated animations in mandatory pack',()=>{
 const json=p=>JSON.parse(files.get(root+p));
 const geo=json(`bedrock/pokemon/models/mascots/${id}/${id}.geo.json`)['minecraft:geometry'][0];
 const animation=json(`bedrock/pokemon/animations/mascots/${id}/${id}.animation.json`).animations;
 const poser=json(`bedrock/pokemon/posers/mascots/${id}/${id}.json`),resolver=json(`bedrock/pokemon/resolvers/mascots/${id}/0_${id}_base.json`);
 const bones=new Set(geo.bones.map(b=>b.name));assert.equal(bones.size,geo.bones.length);assert.equal(poser.rootBone,id);assert.ok(bones.size>=25);
 for(const a of Object.values(animation))for(const [bone,channels]of Object.entries(a.bones)){
  assert.ok(bones.has(bone),bone);for(const value of Object.values(channels))if(!Array.isArray(value)&&typeof value==='object')for(const time of Object.keys(value))assert.ok(Number(time)<=a.animation_length,time);
 }
 for(const [,group,clip]of JSON.stringify(poser).matchAll(/q\.bedrock(?:_stateful|_primary)?\('([^']+)', '([^']+)'/g))assert.ok(animation[`animation.${group}.${clip}`],clip);
 assert.equal(resolver.species,'cobblestar_planets:'+id);assert.equal(resolver.variations.length,2);
 for(const v of resolver.variations){assert.ok(!v.aspects.includes('star'));assert.equal(v.poser,'cobblestar_planets:'+id);for(const t of [v.texture,...v.layers.map(l=>l.texture)])assert.ok(png(files.get('assets/'+t.replace(':','/')).toString('base64'),512,512));}
 assert.ok(animation[`animation.${id}.walk`]);assert.ok(animation[`animation.${id}.special`]);
 if(id==='astreval'){const wings=animation['animation.astreval.special'].bones;assert.ok(wings.left_wing.rotation['.35'][2]>0);assert.ok(wings.right_wing.rotation['.35'][2]<0);}
 assert.ok(JSON.parse(files.get(root+'lang/fr_fr.json'))['cobblestar_planets.species.'+id+'.name']);assert.ok(JSON.parse(files.get(root+'sounds.json'))[id+'.cry']);
});
test('Mascot append preserves old resources and rejects duplicate overwrites',()=>{
 const map=new Map([[root+'lang/fr_fr.json',Buffer.from('{"existing":"conservé"}')],[root+'sounds.json',Buffer.from('{"old.event":{"sounds":[]}}')]]);
 appendMascotAssets(map);assert.equal(JSON.parse(map.get(root+'lang/fr_fr.json')).existing,'conservé');assert.ok(JSON.parse(map.get(root+'sounds.json'))['old.event']);assert.throws(()=>appendMascotAssets(map),/COLLISION/);
});
test('Mandatory mascot resources contain no server stats, rewards or natural spawn files',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../mascot-assets/manifest.json',import.meta.url)));assert.equal(new Set(manifest.files).size,27);
 assert.ok(manifest.files.every(p=>p.startsWith(root)&&!p.includes('/species/')&&!p.includes('/moves/')&&!p.endsWith('.js')));
 assert.ok([...files.keys()].every(p=>!p.startsWith('data/')));assert.ok(files.has('licenses/CobbleStar-Mascots-NOTICE.txt'));
 for(const p of manifest.files)if(!p.includes('/mascots/lang/')&&!p.endsWith('/mascots/sounds.json'))assert.deepEqual(files.get(p),readFileSync(new URL('../mascot-assets/'+p,import.meta.url)));
});
