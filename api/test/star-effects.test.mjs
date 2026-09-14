import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {buildStarPack} from '../dist/star-assets.js';
function unpack(zip){const files=new Map();let at=0;while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),len=zip.readUInt16LE(at+26),start=at+30+len+zip.readUInt16LE(at+28);files.set(zip.toString('utf8',at+30,at+30+len),inflateRawSync(zip.subarray(start,start+size)));at=start+size;}return files;}
test('Even an empty Star catalogue gets shared FX and resolvable sound/texture dependencies',()=>{
 const zip=buildStarPack([],[]);assert.deepEqual(zip,buildStarPack([],[]));
 const files=unpack(zip),root='assets/cobblestar_planets/';
 const manifest=JSON.parse(readFileSync(new URL('../star-effects/manifest.json',import.meta.url)));
 for(const path of manifest.files)assert.ok(files.has(path),path);
 const sounds=JSON.parse(files.get(root+'sounds.json'));
 for(const name of ['low','mid','high']){
  const sound=sounds['star.appearance.'+name];
  assert.equal(sound.sounds[0].type,'event');assert.equal(sound.sounds[0].name,'minecraft:block.note_block.chime');
  assert.ok(sound.sounds[0].volume>0);assert.ok(sound.sounds[0].pitch>0);
 }
 const effects=new Map();
 for(const [name,bytes] of files)if(name.endsWith('.particle.json')){
  const effect=JSON.parse(bytes).particle_effect;effects.set(effect.description.identifier,effect);
  const texture=effect.description.basic_render_parameters.texture.replace('textures/particles/','textures/particle/');
  assert.ok(files.has('assets/'+texture.replace(':','/')+'.png'),texture);
  assert.ok(effect.components['minecraft:emitter_lifetime_once']);assert.ok(effect.components['minecraft:emitter_rate_instant'].num_particles<=16);
 }
 for(const effect of effects.values())for(const event of Object.values(effect.events??{})){
  if(event.particle_effect)assert.ok(effects.has(event.particle_effect.effect));
  if(event.sound_effect)assert.ok(sounds[event.sound_effect.event_name.split(':')[1]]);
 }
 const fx=effects.get('cobblestar_planets:star_appearance');
 assert.deepEqual(fx.components['minecraft:emitter_lifetime_events'].timeline,{'0.20':'note_mid','0.40':['note_high','burst']});
 assert.ok([...files.keys()].every(n=>!n.includes('resolvers/')));
});
