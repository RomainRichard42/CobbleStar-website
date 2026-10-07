import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {buildStarPack,png} from '../dist/star-assets.js';

function unpack(zip){const files=new Map();let at=0;while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),len=zip.readUInt16LE(at+26),start=at+30+len+zip.readUInt16LE(at+28);files.set(zip.toString('utf8',at+30,at+30+len),inflateRawSync(zip.subarray(start,start+size)));at=start+size;}return files;}
const root='assets/cobblestar_planets/';

test('Alliance is shipped in the mandatory pack, even without published Star species',()=>{
 const files=unpack(buildStarPack([],[]));
 const manifest=JSON.parse(readFileSync(new URL('../referral-cosmetics/manifest.json',import.meta.url)));
 for(const path of manifest.files){assert.ok(files.has(path),path);assert.deepEqual(files.get(path),readFileSync(new URL('../referral-cosmetics/'+path,import.meta.url)));}
 for(const name of ['dragonite_alliance','dragonite_alliance_glow'])assert.ok(png(files.get(root+'textures/pokemon/referral/'+name+'.png').toString('base64'),256,128));
 assert.ok(files.has('licenses/Dragonite-Alliance-NOTICE.txt'));
 assert.ok(files.has('licenses/Cobblemon.txt'));
});

test('Alliance is opt-in and uses the native rig, never changes ordinary spawns or Star rarity',()=>{
 const files=unpack(buildStarPack([],[]));
 const resolver=JSON.parse(files.get(root+'bedrock/pokemon/resolvers/referral/dragonite_alliance.json'));
 assert.equal(resolver.species,'cobblemon:dragonite');
 assert.ok(resolver.order<10000,'Star resolver remains higher priority');
 assert.equal(resolver.variations.length,1);
 const variant=resolver.variations[0];
 assert.deepEqual(variant.aspects,['cobblestar-alliance']);
 assert.equal(variant.model,'cobblemon:dragonite.geo');
 assert.equal(variant.poser,'cobblemon:dragonite');
 assert.equal(variant.layers[0].emissive,true);
 for(const path of [variant.texture,...variant.layers.map(l=>l.texture)])assert.ok(files.has('assets/'+path.replace(':','/')));
 const names=[...files.keys()];
 assert.ok(names.every(n=>!n.startsWith('assets/cobblemon/')),'Do not override any native resource');
 assert.ok(names.every(n=>!n.includes('/resolvers/star/')),'Cosmetic must not enroll Dragonite in Star catalogue');
 assert.ok(names.every(n=>!n.includes('/models/referral/')&&!n.includes('/animations/referral/')&&!n.includes('/posers/referral/')),'Use native runtime rig without pose overrides');
});

test('Kinetic deployment includes the mandatory cosmetic sources',()=>{
 const packager=readFileSync(new URL('../../scripts/package-kinetic.mjs',import.meta.url),'utf8');
 assert.match(packager,/"api\/referral-cosmetics\/manifest\.json"/);
 assert.match(packager,/cp\(join\(projectDir, "api", "referral-cosmetics"\), join\(deployDir, "referral-cosmetics"\)/);
});
