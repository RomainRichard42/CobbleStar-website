import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {buildStarPack,png} from '../dist/star-assets.js';
import {appendEventPokemonAssets} from '../dist/event-pokemon-assets.js';
const prefix='assets/cobblestar_planets/',id='dragonite_eclipse';
function unpack(zip){const files=new Map();let at=0;while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),len=zip.readUInt16LE(at+26),start=at+30+len+zip.readUInt16LE(at+28);files.set(zip.toString('utf8',at+30,at+30+len),inflateRawSync(zip.subarray(start,start+size)));at=start+size;}assert.equal(zip.readUInt32LE(at),0x02014b50);return files;}
const files=unpack(buildStarPack([],[]));
const json=p=>JSON.parse(files.get(prefix+p));
test('Approved Eclipse resources ship in the mandatory pack without enrolling a Star',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../event-pokemon-assets/manifest.json',import.meta.url)));
 assert.equal(manifest.version,1);assert.equal(new Set(manifest.files).size,14);
 for(const p of manifest.files){
  if(p.includes('/lang/')||p.includes('/events/sounds.json'))continue;
  assert.deepEqual(files.get(p),readFileSync(new URL('../event-pokemon-assets/'+p,import.meta.url)),p);
 }
 assert.ok(files.has('licenses/Dragonite-Eclipse-NOTICE.txt'));
 assert.ok([...files.keys()].every(p=>!p.startsWith('data/')&&!p.startsWith('assets/cobblemon/')));
 assert.ok(![...files.keys()].some(p=>p.includes('/resolvers/star/')));
 const r=json(`bedrock/pokemon/resolvers/events/${id}.json`),g=json(`bedrock/pokemon/models/events/${id}.geo.json`)['minecraft:geometry'][0];
 assert.equal(r.species,'cobblemon:dragonite');assert.equal(r.variations.length,4);
 for(const v of r.variations){
  assert.ok(v.aspects.includes('cobblestar_eclipse'));assert.ok(!v.aspects.includes('star'));
  assert.equal(v.model,'cobblestar_planets:'+id+'.geo');assert.equal(v.poser,'cobblestar_planets:'+id);
  assert.equal(v.layers.some(l=>l.name==='alpha_eyes'),v.aspects.includes('alpha_eyes'));
  for(const t of [v.texture,...v.layers.map(l=>l.texture)]){const b=files.get('assets/'+t.replace(':','/'));assert.ok(b,t);assert.ok(png(b.toString('base64'),g.description.texture_width,g.description.texture_height));}
 }
});
test('Private event poser resolves every private animation; native species remain untouched',()=>{
 const a=json(`bedrock/pokemon/animations/events/${id}.animation.json`).animations;
 const p=json(`bedrock/pokemon/posers/events/${id}.json`);
 assert.equal(p.rootBone,'dragonite');assert.ok(p.animations.eclipse_appear);
 for(const [,group,clip] of JSON.stringify(p).matchAll(/q\.bedrock(?:_stateful)?\('([^']+)', '([^']+)'/g))if(group===id)assert.ok(a[`animation.${group}.${clip}`],clip);
 for(const pose of Object.values(p.poses))assert.ok(pose.animations.includes(`q.bedrock('${id}', 'eclipse_idle')`));
 for(const key of ['ground_idle','ground_walk','battle_idle','air_idle','air_glide','sleep','cry','eclipse_idle','appear'])assert.ok(a[`animation.${id}.${key}`],key);
});
test('Appearance merges sound/lang entries without erasing gallery or admin creature aliases',()=>{
 const sounds=json('sounds.json');assert.ok(sounds['eclipse.appear']);assert.ok(Object.keys(sounds).some(k=>k.startsWith('allodus.')));
 for(const l of ['fr_fr','en_us'])assert.ok(json(`lang/${l}.json`)['cobblemon.species.dragonite-eclipse.name']);
 const particle=json('bedrock/particles/events/eclipse_appearance.particle.json').particle_effect;
 assert.equal(particle.description.identifier,'cobblestar_planets:eclipse_appearance');
 assert.equal(particle.events.arrival_sound.sound_effect.event_name,'cobblestar_planets:eclipse.appear');
 const mist=files.get(prefix+'textures/particles/events/eclipse_mist.png');assert.deepEqual(mist,files.get(prefix+'textures/particle/events/eclipse_mist.png'));assert.ok(png(mist.toString('base64'),32,32));
});
test('Existing language entries survive event append; collisions fail explicitly',()=>{
 const original=new Map([[prefix+'lang/fr_fr.json',Buffer.from('{"example":"conservé"}')]]);appendEventPokemonAssets(original);
 assert.equal(JSON.parse(original.get(prefix+'lang/fr_fr.json')).example,'conservé');
 assert.throws(()=>appendEventPokemonAssets(original),/COLLISION/);
});
test('Kinetic deployment includes the event asset tree',()=>{
 const script=readFileSync(new URL('../../scripts/package-kinetic.mjs',import.meta.url),'utf8');
 assert.match(script,/"api\/event-pokemon-assets\/manifest\.json"/);
 assert.match(script,/cp\(join\(projectDir, "api", "event-pokemon-assets"\), join\(deployDir, "event-pokemon-assets"\)/);
});
