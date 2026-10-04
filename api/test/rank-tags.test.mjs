import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {appendRankTags} from '../dist/rank-tags.js';
import {buildStarPack} from '../dist/star-assets.js';
const manifest=JSON.parse(readFileSync(new URL('../rank-tags/manifest.json',import.meta.url)));
const defaultPath='assets/minecraft/font/default.json';
function unpack(zip){const files=new Map();let at=0;while(zip.readUInt32LE(at)===0x04034b50){const length=zip.readUInt16LE(at+26),start=at+30+length+zip.readUInt16LE(at+28),size=zip.readUInt32LE(at+18),name=zip.toString('utf8',at+30,at+30+length);assert.ok(!files.has(name));files.set(name,inflateRawSync(zip.subarray(start,start+size)));at=start+size;}return files;}
const codes={admin:'E001',modo:'E002',guide:'E003',recrue:'E004',eclaireur:'E005',aventurier:'E006',prodige:'E007',veteran:'E008',gardien:'E009',elite:'E010',mercenaire:'E011',etoile:'E012',cosmiquea:'E013',cosmiqueb:'E014',galactiquea:'E015',galactiqueb:'E016',ranger:'E017'};

test('All 17 supplied badges retain their bytes and PDF glyphs, including missing Ranger',()=>{
 const files=unpack(buildStarPack([],[]));
 assert.equal(manifest.tags.length,17);
 const font=JSON.parse(files.get('assets/cobblestar_planets/font/ranks.json'));
 assert.equal(font.providers.length,17);
 assert.equal(files.size>manifest.files.length,true,'existing shared resources remain');
 for(const tag of manifest.tags){
  assert.equal(tag.codepoint,codes[tag.id]);assert.equal(tag.glyph.codePointAt(0),parseInt(codes[tag.id],16));
  const data=files.get(tag.file);assert.ok(data,tag.file);
  assert.equal(createHash('sha256').update(data).digest('hex'),tag.sha256);
  assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),tag.width);assert.equal(data.readUInt32BE(20),22);
  const provider=font.providers.find(p=>p.chars[0]===tag.glyph);assert.ok(provider,tag.id);
  assert.deepEqual(provider,{type:'bitmap',file:`cobblestar_planets:ranks/${tag.id}.png`,ascent:9,height:11,chars:[tag.glyph]});
  assert.equal(provider.height/tag.height,0.5,'all original 22px badges render at half size, not 8/22');
  assert.ok(files.has('assets/'+provider.file.replace(':','/textures/')));
 }
 assert.deepEqual(JSON.parse(files.get(defaultPath)),{providers:[{type:'reference',id:'cobblestar_planets:ranks'}]});
 assert.match(files.get('licenses/RankTags-NOTICE.txt').toString(),/LarkAvery/);
 assert.ok(![...files.keys()].some(p=>/permission|luckperms/.test(p)),'no permission or rank assignment');
});

test('Existing default-font providers and other assets are retained, only PUA badges are added',()=>{
 const existing={providers:[{type:'reference',id:'minecraft:include/default'},{type:'bitmap',file:'other:badge.png',height:8,ascent:8,chars:['\ue100']}],customMetadata:'preserve'};
 const original=Buffer.from('unchanged');const files=new Map([[defaultPath,Buffer.from(JSON.stringify(existing))],['assets/example/keep.bin',original]]);
 appendRankTags(files);
 const merged=JSON.parse(files.get(defaultPath));assert.deepEqual(merged.providers.slice(0,2),existing.providers);assert.equal(merged.customMetadata,'preserve');
 assert.equal(merged.providers.at(-1).id,'cobblestar_planets:ranks');assert.equal(files.get('assets/example/keep.bin'),original);
 assert.ok(manifest.tags.every(t=>t.glyph.codePointAt(0)>=0xe000));
});

test('Asset collisions, malformed fonts and overlapping default glyphs fail without overwriting',()=>{
 const fonts=[{providers:[{type:'bitmap',chars:['\ue017']}]},{providers:[{type:'reference',id:'cobblestar_planets:ranks'}]},{providers:{}}];
 for(const font of fonts){const bytes=Buffer.from(JSON.stringify(font)),files=new Map([[defaultPath,bytes]]);assert.throws(()=>appendRankTags(files));assert.equal(files.size,1);assert.equal(files.get(defaultPath),bytes);}
 const path=manifest.tags[0].file,bytes=Buffer.from('prior');const files=new Map([[path,bytes]]);assert.throws(()=>appendRankTags(files),/COLLISION/);assert.equal(files.size,1);assert.equal(files.get(path),bytes);
});

test('The pack remains deterministic and Kinetic deployment includes the rank assets',()=>{
 assert.deepEqual(buildStarPack([],[]),buildStarPack([],[]));
 const packager=readFileSync(new URL('../../scripts/package-kinetic.mjs',import.meta.url),'utf8');
 assert.match(packager,/"api\/rank-tags\/manifest\.json"/);
 assert.match(packager,/cp\(join\(projectDir, "api", "rank-tags"\), join\(deployDir, "rank-tags"\)/);
 const importer=readFileSync(new URL('../../scripts/import-rank-tags.ps1',import.meta.url),'utf8');
 assert.match(importer,/ascent=9;height=11/,'re-import must not restore the undersized 8px font');
});

test('Both dedicated chat font and vanilla TAB font use the same larger badges',()=>{
 const files=unpack(buildStarPack([],[]));
 const reference=JSON.parse(files.get(defaultPath)).providers.find(p=>p.type==='reference'&&p.id==='cobblestar_planets:ranks');
 assert.ok(reference,'TAB/default font must point to the same font used explicitly by chat');
 const font=JSON.parse(files.get('assets/cobblestar_planets/font/ranks.json'));
 assert.ok(font.providers.every(p=>p.height===11&&p.ascent===9));
 const oldFont={...font,providers:font.providers.map(p=>({...p,height:8,ascent:8}))};
 assert.notEqual(createHash('sha1').update(JSON.stringify(font)).digest('hex'),createHash('sha1').update(JSON.stringify(oldFont)).digest('hex'),'font change must invalidate the previous asset bytes');
});
