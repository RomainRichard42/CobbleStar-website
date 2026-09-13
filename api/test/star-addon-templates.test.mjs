import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateRawSync} from 'node:zlib';
import {addonIndex,addonTemplate,sameSource} from '../dist/star-addon-templates.js';
import {buildStarPack,validateStar} from '../dist/star-assets.js';
import {starTemplates,nativeStarKit,sameSkeleton,editableStarKit} from '../dist/star-library.js';

function unpack(zip){let at=0;const files=new Map();while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),length=zip.readUInt16LE(at+26),start=at+30+length+zip.readUInt16LE(at+28);files.set(zip.toString('utf8',at+30,at+30+length),inflateRawSync(zip.subarray(start,start+size)));at=start+size;}return files;}
function fixture(species='ironvaliant'){
 const template=addonTemplate(species);assert.ok(template,`Bundled kit missing: ${species}`);
 return {template,native:template.row,asset:{species,model:JSON.parse(template.entries.get(`${species}.geo.json`)),texture:template.entries.get(`${species}.png`).toString('base64'),emissive:template.entries.get(`${species}_glow.png`).toString('base64')}};
}
test('Iron Valiant is listed with addon source and a complete downloadable editing kit',async()=>{
 const row=(await starTemplates()).species.find(t=>t.species==='ironvaliant');assert.ok(row);assert.equal(row.name,'Garde-de-Fer');assert.ok(row.source.id.includes('complete'));
 const files=unpack(await nativeStarKit('ironvaliant'));
 for(const path of ['ironvaliant.geo.json','ironvaliant.png','ironvaliant_glow.png','reference/poser.json','licenses/Addon.txt'])assert.ok(files.has(path));
 assert.ok([...files.keys()].some(p=>p.startsWith('reference/animations/')));
});
test('Addon version, rig and poser hashes must match server before save and publish',()=>{
 const {asset,native}=fixture(),saved=validateStar(asset,native);assert.deepEqual(saved.templateSource,native.source);
 for(const change of [{version:'unknown'},{modelHash:'0'.repeat(64)},{poserHash:'0'.repeat(64)},{conflict:true}]){
  const modified={...native,source:{...native.source,...change}};
  assert.ok(!sameSkeleton(native,modified));assert.ok(!sameSource(native.source,modified.source));
  assert.throws(()=>validateStar(asset,modified),/ADDON_KIT_SERVER_VERSION_MISMATCH/);
 }
 assert.throws(()=>buildStarPack([{...asset,templateSource:{...native.source,version:'old'}}],[native]),/ADDON_KIT_SERVER_VERSION_MISMATCH/);
 assert.throws(()=>validateStar(saved,{...native,source:undefined}),/ADDON_KIT_SERVER_VERSION_MISMATCH/);
 assert.throws(()=>validateStar({...asset,species:'unknownaddon'},{...native,species:'unknownaddon'}),/ADDON_KIT_REQUIRED/);
});
test('Published Iron Valiant contains private model, poser, all animations and replaces native glow',()=>{
 const {asset,native,template}=fixture(),files=unpack(buildStarPack([asset],[native]));
 const resolver=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_ironvaliant.json')).variations[0];
 assert.deepEqual(resolver.aspects,['cobblestar-star']);assert.equal(resolver.model,'cobblestar_planets:star_ironvaliant.geo');assert.equal(resolver.poser,template.poser);
 assert.equal(resolver.layers.filter(l=>l.name==='emissive').length,1);
 assert.equal(resolver.layers.find(l=>l.name==='emissive').texture,'cobblestar_planets:textures/pokemon/star/star_ironvaliant_glow.png');
 assert.ok([...files.keys()].every(p=>!p.startsWith('assets/cobblemon/')));
 const poser=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/posers/star/cobblestar_star_ironvaliant_poser.json'));
 assert.ok(asset.model['minecraft:geometry'][0].bones.some(b=>b.name===poser.rootBone));
 const text=JSON.stringify(poser);assert.ok(!text.includes("'ironvaliant'"));
 const group=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/animations/star/cobblestar_star_ironvaliant_ironvaliant.animation.json'));
 for(const m of text.matchAll(/q\.bedrock(?:_[a-z_]+)?\('([^']+)',\s*'([^']+)'/g))assert.ok(group.animations[`animation.${m[1]}.${m[2]}`],`Missing animation ${m[2]}`);
 assert.ok(files.has('licenses/addons/ironvaliant/Addon.txt'));
});
test('Every installed addon kit builds deterministically without replacing official resources',()=>{
 for(const row of addonIndex().species){
  const {asset,native}=fixture(row.species),a=buildStarPack([asset],[native]),b=buildStarPack([asset],[native]);
  assert.deepEqual(a,b,row.species);assert.ok([...unpack(a).keys()].every(p=>!p.startsWith('assets/cobblemon/')),row.species);
 }
});
test('Saved addon variant keeps source and reference files in downloadable kit',async()=>{
 const {asset,native}=fixture(),saved=validateStar(asset,native),files=unpack(await editableStarKit(saved,1,'draft'));
 assert.deepEqual(JSON.parse(files.get('source.json')),native.source);assert.ok(files.has('licenses/Addon.txt'));assert.ok(files.has('reference/poser.json'));
 assert.equal(files.get('ironvaliant.png').toString('base64'),asset.texture);
});
