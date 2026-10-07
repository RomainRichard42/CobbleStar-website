import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { validateStar, buildStarPack, ashStarPreview } from '../dist/star-assets.js';
function crc(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([name,data])),data.length+8);return out;}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
const texture=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.from([0,255,255,255,255]))),chunk('IEND',Buffer.alloc(0))]).toString('base64');
const native={species:'dragonite',poser:'cobblemon:dragonite',bones:[{name:'root'}]};
const fixture=()=>({species:'dragonite',texture,model:{format_version:'1.12.0','minecraft:geometry':[{description:{identifier:'geometry.dragonite',texture_width:1,texture_height:1},bones:[{name:'root',pivot:[0,0,0],cubes:[{origin:[0,0,0],size:[1,1,1],uv:[0,0]}]}]}]}});
test('Valid geometry, PNG and native bones accepted',()=>assert.equal(validateStar(fixture(),native).species,'dragonite'));
test('Unknown species and path injection refused',()=>{assert.throws(()=>validateStar({...fixture(),species:'../bad'},native));assert.throws(()=>validateStar(fixture(),{...native,species:'eevee'}));});
test('Missing native bones and cyclic hierarchy refused',()=>{const v=fixture();v.model['minecraft:geometry'][0].bones[0].name='other';assert.throws(()=>validateStar(v,native));const cycle=fixture();cycle.model['minecraft:geometry'][0].bones[0].parent='root';assert.throws(()=>validateStar(cycle,native));});
test('Broken PNG refused before publication',()=>{const v=fixture();v.texture=Buffer.from(texture,'base64').subarray(0,33).toString('base64');assert.throws(()=>validateStar(v,native));const broken=Buffer.from(texture,'base64');broken[45]^=1;assert.throws(()=>validateStar({...fixture(),texture:broken.toString('base64')},native));});
function unpack(zip){let at=0;const files=new Map();while(zip.readUInt32LE(at)===0x04034b50){const compressed=zip.readUInt32LE(at+18),nameLength=zip.readUInt16LE(at+26),extra=zip.readUInt16LE(at+28),start=at+30+nameLength+extra;const name=zip.toString('utf8',at+30,at+30+nameLength),bytes=inflateRawSync(zip.subarray(start,start+compressed));assert.equal(crc(bytes),zip.readUInt32LE(at+14));files.set(name,bytes);at=start+compressed;}assert.equal(zip.readUInt32LE(at),0x02014b50);return files;}

test('Allodus cosmetics ship automatically, merging translations and audio without shipping executable battle data',()=>{
 const files=unpack(buildStarPack([],[]));
 const manifest=JSON.parse(readFileSync(new URL('../allodus-assets/manifest.json',import.meta.url)));
 assert.equal(manifest.files.length,11);
 for(const path of manifest.files){
  assert.ok(path.startsWith('assets/cobblestar_planets/'));
  if(path.includes('/allodus/lang/')||path.endsWith('/allodus/sounds.json'))continue;
  assert.deepEqual(files.get(path),readFileSync(new URL('../allodus-assets/'+path,import.meta.url)),path);
 }
 const resolver=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/allodus/0_allodus_base.json'));
 assert.equal(resolver.species,'cobblestar_planets:allodus');
 assert.equal(resolver.variations[0].layers[0].emissive,true);
 const burst=JSON.parse(files.get('assets/cobblestar_planets/bedrock/particles/allodus/allodus_burst.particle.json')).particle_effect;
 const particleTexture='assets/'+burst.description.basic_render_parameters.texture.replace('textures/particles/','textures/particle/').replace(':','/')+'.png';
 assert.deepEqual(files.get(particleTexture),files.get('assets/cobblestar_planets/textures/particles/allodus_star.png'));
 assert.equal(burst.components['minecraft:emitter_rate_instant'].num_particles,32);
 for(const lang of ['fr_fr','en_us']){
  const strings=JSON.parse(files.get(`assets/cobblestar_planets/lang/${lang}.json`));
  assert.equal(strings['cobblemon.species.allodus.name'],'Allodus');
  assert.equal(strings['cobblestar_planets.species.allodus.name'],'Allodus');
  assert.ok(strings['cobblemon.move.cobblestarjudgment']);
 }
 const sounds=JSON.parse(files.get('assets/cobblestar_planets/sounds.json'));
 for(const id of ['allodus.appear','allodus.cry','allodus.judgment','star.appearance.high'])assert.ok(sounds[id]);
 assert.ok(![...files.keys()].some(path=>path.startsWith('data/')&&/allodus|cobblestarjudgment|cobblestaromnitype/.test(path)));
});

test('All four approved arcade cabinets ship through the mandatory pack without replacing balls or loot',()=>{
 const files=unpack(buildStarPack([],[]));
 const manifest=JSON.parse(readFileSync(new URL('../arcade-assets/manifest.json',import.meta.url)));
 assert.equal(manifest.version,1);assert.equal(manifest.files.length,9);
 for(const path of manifest.files)assert.deepEqual(files.get(path),readFileSync(new URL('../arcade-assets/'+path,import.meta.url)),path);
 for(const id of ['vote','nova','pulsar','quasar']){
  const model=JSON.parse(files.get(`assets/cobblestar_planets/models/cosmic/crate_${id}.json`));
  assert.equal(model.design,'capture-station-v2');assert.equal(model.gashapon,true);
  assert.ok(!model.faces.some(f=>/dragonite|feraligatr|gengar|jirachi|antenna|header mount/.test(f.name)));
  assert.deepEqual(model.tokenSlot,[7,15.354545454545454,2.7]);
  assert.equal(model.tokenYaw,90);
  assert.ok(model.faces.some(f=>f.part==='delivery'));assert.ok(model.faces.some(f=>f.emissive));
  assert.ok(model.faces.some(f=>f.name==='original logo cercle 5'));
  assert.ok(model.faces.some(f=>f.name==='capture button white'));
  assert.ok(model.faces.some(f=>f.name==='capture name '+id.toUpperCase()&&f.emissive));
 }
 assert.ok(!manifest.files.some(path=>/ball_|key_|loot|species|resolver/.test(path)));
 assert.ok(files.has('assets/cobblestar_planets/gallery/models/sga_slab.json'));
 assert.ok(JSON.parse(files.get('assets/cobblestar_planets/sounds.json'))['star.appearance.high']);
});

test('Articulated NPC rig and 34 presets ship even without any published Star species',()=>{
 const files=unpack(buildStarPack([],[]));
 const rig=JSON.parse(files.get('assets/cobblestar_planets/models/entity/quest_npc_rig.json'));
 assert.equal(rig.version,1);assert.deepEqual(rig.limbs.map(l=>l.part),['left_arm','right_arm','left_leg','right_leg']);
 const library=JSON.parse(files.get('assets/cobblestar_planets/npc_studio/presets.json'));
 assert.equal(library.entries.length,34);assert.equal(library.entries.filter(p=>p.category==='POSE').length,17);
 assert.equal(library.entries.filter(p=>p.category==='ANIMATION').length,17);
 assert.equal(library.entries.find(p=>p.id==='release_pokemon').effect,'RELEASE_POKEMON');
 assert.equal(library.entries.find(p=>p.id==='kneel').frames[0].rotations.left_knee[0],90);
 for(const path of ['models/entity/quest_npc_rig.json','npc_studio/presets.json'])assert.deepEqual(files.get('assets/cobblestar_planets/'+path),readFileSync(new URL('../npc-studio-assets/assets/cobblestar_planets/'+path,import.meta.url)));
});
test('Deterministic pack preserves shared cosmetics and only adds the requested Star species',()=>{
 const a=fixture(),b={...fixture(),species:'eevee'},cat=[native,{...native,species:'eevee',poser:'cobblemon:eevee'}];
 const zip=buildStarPack([a,b],cat);assert.deepEqual(zip,buildStarPack([b,a],cat));
 const files=unpack(zip),shared=unpack(buildStarPack([],[]));
 // Two fixture species add exactly model + texture + resolver each. All shared
 // assets (including referral cosmetics) must remain byte-identical.
 assert.equal(files.size,shared.size+6);
 for(const [path,bytes] of shared)assert.deepEqual(files.get(path),bytes,path);
 assert.ok(files.has('licenses/Cobblemon.txt'));assert.equal(JSON.parse(files.get('pack.mcmeta')).pack.pack_format,34);
 for(const id of ['dragonite','eevee']){
  const r=JSON.parse(files.get(`assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_${id}.json`));
  assert.deepEqual(r.variations[0].aspects,['cobblestar-star']);assert.equal(r.variations[0].poser,'cobblemon:'+id);assert.equal(r.order,10000);
 }
});
test('Gallery and SGA assets are mandatory even without published Star species',()=>{
 const files=unpack(buildStarPack([],[]));
 const manifest=JSON.parse(readFileSync(new URL('../gallery-assets/manifest.json',import.meta.url)));
 for(const path of manifest.files)assert.deepEqual(files.get(path),readFileSync(new URL('../gallery-assets/'+path,import.meta.url)),path);
 const sounds=JSON.parse(files.get('assets/cobblestar_planets/sounds.json'));
 assert.ok(sounds['gallery.sga_scan']);assert.ok(sounds['gallery.sga_reveal']);assert.ok(sounds['star.appearance.high']);
 const base=JSON.parse(files.get('assets/cobblestar_planets/models/item/card_base.json'));
 assert.equal(base.parent,'builtin/entity');assert.ok(base.display.firstperson_righthand);
 for(const id of ['hologram_projector','card_stand','card_vitrine','card_wall_frame','sga_grader']){
  const variants=JSON.parse(files.get(`assets/cobblestar_planets/blockstates/${id}.json`)).variants;
  assert.equal(Object.keys(variants).length,4);assert.equal(variants['facing=east'].y,90);
 }
});
test('Card fronts and reduced hand sizes survive mandatory pack delivery',()=>{
 const files=unpack(buildStarPack([]));
 const card=JSON.parse(files.get('assets/cobblestar_planets/models/item/card_base.json'));
 assert.deepEqual(card.display.gui.rotation,[0,180,0]);
 for(const hand of ['firstperson_righthand','firstperson_lefthand','thirdperson_righthand','thirdperson_lefthand'])assert.ok(card.display[hand].scale.every(s=>s>0&&s<=.38));
 for(const planet of ['asteria','nebelia']){
  const booster=JSON.parse(files.get(`assets/cobblestar_planets/models/item/booster_${planet}.json`));
  for(const hand of ['firstperson_righthand','firstperson_lefthand','thirdperson_righthand','thirdperson_lefthand'])assert.ok(booster.display[hand].scale.every(s=>s>0&&s<=.55));
 }
});

test('Held display furniture has small explicit transforms on both hands in the mandatory pack',()=>{
 const files=unpack(buildStarPack([],[]));
 for(const item of ['card_stand','card_vitrine','card_wall_frame','sga_grader','hologram_projector','card_cabinet']){
  const display=JSON.parse(files.get(`assets/cobblestar_planets/models/item/${item}.json`)).display;
  const limit=item==='card_cabinet'?.12:.38;
  for(const hand of ['firstperson_righthand','firstperson_lefthand','thirdperson_righthand','thirdperson_lefthand'])assert.ok(display[hand].scale.every(s=>s>0&&s<=limit),`${item} / ${hand}`);
 }
});

test('Six cabinet tiles and approved boosters ship through the mandatory shared pack',()=>{
 const files=unpack(buildStarPack([],[]));
 const variants=JSON.parse(files.get('assets/cobblestar_planets/blockstates/card_cabinet.json')).variants;
 assert.equal(Object.keys(variants).length,24);
 for(const facing of ['north','east','south','west'])for(let part=0;part<6;part++){
  assert.equal(variants[`facing=${facing},part=${part}`].model,`cobblestar_planets:block/card_cabinet_${part}`);
  const model=JSON.parse(files.get(`assets/cobblestar_planets/models/block/card_cabinet_${part}.json`));
  assert.ok(model.elements.length>0);for(const box of model.elements)for(let axis=0;axis<3;axis++)assert.ok(box.from[axis]>=0&&box.to[axis]<=16&&box.from[axis]<box.to[axis]);
 }
 assert.equal(JSON.parse(files.get('assets/cobblestar_planets/models/item/card_cabinet.json')).parent,'builtin/entity');
 for(const planet of ['asteria','nebelia']){
  assert.equal(JSON.parse(files.get(`assets/cobblestar_planets/models/item/booster_${planet}.json`)).textures.layer0,`cobblestar_planets:item/booster_${planet}_v2`);
  const png=files.get(`assets/cobblestar_planets/textures/item/booster_${planet}_v2.png`);
  assert.equal(png.readUInt32BE(12),0x49484452);assert.ok(png.readUInt32BE(16)>=256&&png.readUInt32BE(20)>=400);
 }
 const sounds=JSON.parse(files.get('assets/cobblestar_planets/sounds.json'));
 for(const id of ['booster.tear','booster.slide','booster.rise','booster.reveal'])assert.ok(sounds[id]?.sounds.length);
 assert.ok(sounds['star.appearance.high']);assert.ok([...files.keys()].every(path=>!path.startsWith('data/')));
});
test('Shared pack includes both regional starter trios without changing native starter textures',()=>{
 const files=unpack(buildStarPack([],[]));
 for(const [region,species] of [['asteria','chikorita'],['asteria','charmander'],['asteria','mudkip'],['nebelia','sprigatito'],['nebelia','litten'],['nebelia','piplup']]){
  const path=`assets/cobblestar_planets/bedrock/pokemon/resolvers/regional/${species}_${region}.json`;
  const resolver=JSON.parse(files.get(path));
  assert.equal(resolver.species,`cobblemon:${species}`);
  assert.deepEqual(resolver.variations[0].aspects,[`cobblestar_${region}`]);
  assert.deepEqual(resolver.variations[1].aspects,[`cobblestar_${region}`,'shiny']);
  const texture=files.get('assets/'+resolver.variations[0].texture.replace(':','/'));
  assert.ok(texture.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')));
  const modelName=resolver.variations[0].model.split(':')[1];
  const model=JSON.parse(files.get(`assets/cobblestar_planets/bedrock/pokemon/models/regional/${modelName}.json`));
  assert.equal(model['minecraft:geometry'][0].description.texture_width,texture.readUInt32BE(16));
  assert.equal(model['minecraft:geometry'][0].description.texture_height,texture.readUInt32BE(20));
 }
 assert.ok([...files.keys()].every(path=>!path.startsWith('assets/cobblemon/')));
});
test('Regional pack ships 30 species including legacy forms and three distinct female rigs',()=>{
 const files=unpack(buildStarPack([],[]));
 const geometries=[...files.keys()].filter(p=>p.includes('/models/regional/')&&p.endsWith('.geo.json'));
 assert.equal(geometries.length,33);
 for(const species of ['torchic','combusken','blaziken']){
  const r=JSON.parse(files.get(`assets/cobblestar_planets/bedrock/pokemon/resolvers/regional/${species}_nebelia.json`));
  const female=r.variations.find(v=>v.aspects.includes('female')&&!v.aspects.includes('shiny'));
  assert.equal(female.model,`cobblestar_planets:${species}_nebelia_female.geo`);
  assert.equal(female.poser,`cobblemon:${species}`);
 }
});
test('Optional emissive texture becomes a dedicated luminous layer',()=>{const files=unpack(buildStarPack([{...fixture(),emissive:texture}],[native]));const r=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_dragonite.json'));assert.equal(r.variations[0].layers[0].emissive,true);assert.ok(files.has('assets/cobblestar_planets/textures/pokemon/star/star_dragonite_glow.png'));});

test('Sachanobi is an optional Greninja form, preserves the base and native animated shuriken',()=>{
 const blank=readFileSync(new URL('../star-layers/ashgreninja/blank.png',import.meta.url)).toString('base64');
 const base={...fixture(),species:'greninja',emissive:texture},cat={...native,species:'greninja',poser:'cobblemon:greninja'};
 const asset={...base,ash:{texture:blank,emissive:blank}};
 assert.throws(()=>validateStar({...fixture(),ash:asset.ash},native),/ASH_REQUIRES_GRENINJA/);
 assert.throws(()=>validateStar({...base,ash:{texture}},cat),/PNG_DIMENSIONS/);
 assert.throws(()=>validateStar({...base,ash:{...asset.ash,model:{}}},cat));
 const files=unpack(buildStarPack([asset],[cat])),plain=unpack(buildStarPack([base],[cat]));
 for(const [name,data] of plain)assert.deepEqual(files.get(name),data);
 const r=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_ashgreninja.json')),v=r.variations[0];
 assert.equal(r.order,10001);assert.equal(r.species,'cobblemon:greninja');assert.deepEqual(v.aspects,['ash','cobblestar-star']);
 assert.equal(v.model,'cobblemon:ashgreninja.geo');assert.equal(v.poser,'cobblemon:ashgreninja');
 assert.equal(v.layers[0].name,'backshuriken');assert.equal(v.layers[0].texture.frames.length,4);assert.equal(v.layers[0].texture.fps,10);
 assert.equal(v.layers[1].name,'star_glow');assert.equal(v.layers[1].emissive,true);
 for(const aspects of [[],['ash'],['cobblestar-star'],['ash','cobblestar-star'],['ash','shiny','cobblestar-star']])assert.equal(v.aspects.every(a=>aspects.includes(a)),aspects.includes('ash')&&aspects.includes('cobblestar-star'));
 const preview=ashStarPreview(asset);assert.equal(preview.model['minecraft:geometry'][0].description.texture_width,130);assert.equal(preview.texture,blank);
 const noGlow=unpack(buildStarPack([{...base,ash:{texture:blank}}],[cat]));
 assert.equal(noGlow.get('assets/cobblestar_planets/textures/pokemon/star/star_ashgreninja_glow.png').toString('base64'),blank);
 assert.ok([...files.keys()].every(p=>!p.startsWith('data/')&&!p.startsWith('assets/cobblemon/')));
});

test('Chimchar Star glow replaces the orange native emissive layer only for Star',()=>{
 const cat={...native,species:'chimchar',poser:'cobblemon:chimchar'};
 const asset={...fixture(),species:'chimchar',emissive:texture};
 const files=unpack(buildStarPack([asset],[cat]));
 const r=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_chimchar.json'));
 assert.deepEqual(r.variations[0].aspects,['cobblestar-star']);
 assert.equal(r.variations[0].layers.length,1);
 assert.deepEqual(r.variations[0].layers[0],{name:'emissive',texture:'cobblestar_planets:textures/pokemon/star/star_chimchar_glow.png',emissive:true,translucent:true});
 assert.ok([...files.keys()].every(p=>!p.startsWith('assets/cobblemon/')));
 const without={...asset};delete without.emissive;
 const plain=unpack(buildStarPack([without],[cat]));
 assert.deepEqual(JSON.parse(plain.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_chimchar.json')).variations[0].layers,[]);
});

test('Charmander Star replaces native flame by four blue animated frames without overriding normal assets',()=>{
 const asset={...fixture(),species:'charmander',emissive:texture};
 const files=unpack(buildStarPack([asset],[{...native,species:'charmander',poser:'cobblemon:charmander'}]));
 const r=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_charmander.json'));
 assert.deepEqual(r.variations[0].aspects,['cobblestar-star']);
 const flame=r.variations[0].layers.filter(l=>l.name==='flame');assert.equal(flame.length,1);
 assert.equal(flame[0].emissive,true);assert.equal(flame[0].translucent,true);
 assert.equal(flame[0].texture.fps,10);assert.equal(flame[0].texture.loop,true);
 assert.equal(flame[0].texture.frames.length,4);
 const frames=flame[0].texture.frames.map(path=>files.get('assets/'+path.replace(':','/')));
 assert.ok(frames.every(f=>f&&f.readUInt32BE(16)===64&&f.readUInt32BE(20)===64));
 assert.equal(new Set(frames.map(f=>f.toString('base64'))).size,4);
 assert.ok([...files.keys()].every(path=>!path.startsWith('assets/cobblemon/')));
 assert.ok(r.variations[0].layers.some(l=>l.name==='star_glow'));
});

test('Shipped Dragonite Star preset is importable with native animations and emissive marks',()=>{
 const file=name=>readFileSync(new URL(`../../public/downloads/pokemon-star/dragonite/${name}`,import.meta.url));
 const model=JSON.parse(file('dragonite.geo.json')),geometry=model['minecraft:geometry'][0];
 const nativeDragonite={species:'dragonite',poser:'cobblemon:dragonite',bones:geometry.bones.map(({name,parent})=>({name,...(parent?{parent}:{})}))};
 assert.equal(geometry.description.texture_width,256);assert.equal(geometry.description.texture_height,128);
 assert.ok(geometry.bones.some(b=>b.name==='antenna_left2'&&b.parent==='antenna_left'&&b.cubes.length===4));
 const asset={species:'dragonite',model,texture:file('dragonite.png').toString('base64'),emissive:file('dragonite_glow.png').toString('base64')};
 const files=unpack(buildStarPack([asset],[nativeDragonite]));
 const resolver=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_dragonite.json'));
 assert.equal(resolver.variations[0].poser,'cobblemon:dragonite');assert.equal(resolver.variations[0].layers[0].emissive,true);
 assert.ok(files.get('licenses/Cobblemon.txt').length>1000);
});

function nativeKingambit(){
 const kit=unpack(readFileSync(new URL('../star-templates/kingambit.zip',import.meta.url)));
 const model=JSON.parse(kit.get('kingambit.geo.json'));
 return {
  asset:{species:'kingambit',model,texture:kit.get('kingambit.png').toString('base64'),emissive:kit.get('kingambit_glow.png').toString('base64')},
  native:{species:'kingambit',poser:'cobblemon:kingambit',bones:model['minecraft:geometry'][0].bones.map(({name,parent})=>({name,...(parent?{parent}:{})}))}
 };
}
test('Kingambit recolor isolates its official geometry, poser AND global animation group from addons',()=>{
 const {asset,native}=nativeKingambit();
 // Identifier-only changes are not geometry edits.
 asset.model['minecraft:geometry'][0].description.identifier='geometry.my_star_export';
 const files=unpack(buildStarPack([asset],[native]));
 const r=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_kingambit.json'));
 assert.equal(r.variations[0].model,'cobblestar_planets:star_kingambit.geo');
 assert.equal(r.variations[0].poser,'cobblestar_planets:cobblestar_kingambit_official');
 assert.deepEqual(r.variations[0].aspects,['cobblestar-star']);
 assert.equal(r.variations[0].texture,'cobblestar_planets:textures/pokemon/star/star_kingambit.png');
 assert.equal(r.variations[0].layers[0].emissive,true);
 assert.ok(files.has('assets/cobblestar_planets/bedrock/pokemon/models/star/star_kingambit.geo.json'));
 assert.ok(![...files.keys()].some(p=>p.startsWith('assets/cobblemon/')));
});
test('Isolated Kingambit retains the exact original poses and animation keyframes',()=>{
 const {asset,native}=nativeKingambit(),files=unpack(buildStarPack([asset],[native]));
 const kit=unpack(readFileSync(new URL('../star-templates/kingambit.zip',import.meta.url)));
 const poser=files.get('assets/cobblestar_planets/bedrock/pokemon/posers/star/cobblestar_kingambit_official.json').toString();
 const animations=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/animations/star/cobblestar_kingambit_official.animation.json'));
 const original=JSON.parse(kit.get('reference/animations/0983_kingambit/kingambit.animation.json'));
 assert.deepEqual(JSON.parse(poser.replaceAll("'cobblestar_kingambit_official'","'kingambit'")),JSON.parse(kit.get('reference/posers/0983_kingambit/kingambit.json')));
 assert.equal(JSON.parse(poser).rootBone,'kingambit');
 const names=new Set(asset.model['minecraft:geometry'][0].bones.map(b=>b.name));
 assert.equal(Object.keys(animations.animations).length,Object.keys(original.animations).length);
 for(const [key,value] of Object.entries(original.animations)){
  assert.deepEqual(animations.animations[key.replace('animation.kingambit.','animation.cobblestar_kingambit_official.')],value);
 }
 // Both idle and random blinking must resolve inside the private group.
 for(const match of poser.matchAll(/q\.bedrock(?:_quirk)?\('([^']+)',\s*'([^']+)'\)/g)){
  assert.equal(match[1],'cobblestar_kingambit_official');
  const active=animations.animations[`animation.${match[1]}.${match[2]}`];
  assert.ok(active);
  // Only playable animations: the original file also contains unused authoring tests.
  for(const bone of Object.keys(active.bones??{}))assert.ok(names.has(bone),`Active animation targets missing bone ${bone}`);
 }
 assert.ok(!poser.includes("'kingambit'"));
});
test('Addon-owned native IDs cannot substitute any Kingambit Star rig resource',()=>{
 const {asset,native}=nativeKingambit();
 // A server addon may report another skeleton. The trusted, bundled official rig is still accepted.
 const addonCatalog={...native,bones:[{name:'kingambit'},{name:'leg_left0',parent:'kingambit'}]};
 const files=unpack(buildStarPack([asset],[addonCatalog]));
 const r=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_kingambit.json')).variations[0];
 // Same resolution keys as Cobblemon: model/poser are namespace+basename,
 // animation groups are basename ONLY (not namespace).
 const models=new Map([['cobblemon:kingambit.geo','addon model']]);
 const posers=new Map([['cobblemon:kingambit','addon poser']]);
 const groups=new Map([['kingambit','addon animations']]);
 for(const [path,data] of files){
  const stem=path.split('/').at(-1),namespace=path.split('/')[1];
  if(path.includes('/models/'))models.set(`${namespace}:${stem.replace(/\.json$/,'')}`,JSON.parse(data));
  if(path.includes('/posers/'))posers.set(`${namespace}:${stem.replace(/\.json$/,'')}`,JSON.parse(data));
  if(path.includes('/animations/'))groups.set(stem.replace(/\.animation\.json$/,''),JSON.parse(data));
 }
 assert.deepEqual(models.get(r.model)['minecraft:geometry'][0].bones,asset.model['minecraft:geometry'][0].bones);
 assert.equal(posers.get(r.poser).rootBone,'kingambit');
 assert.ok(groups.get('cobblestar_kingambit_official').animations['animation.cobblestar_kingambit_official.ground_idle']);
 assert.equal(models.get('cobblemon:kingambit.geo'),'addon model');
 assert.equal(groups.get('kingambit'),'addon animations');
 const incompatible=structuredClone(asset);
 incompatible.model['minecraft:geometry'][0].bones=addonCatalog.bones;
 assert.throws(()=>validateStar(incompatible,addonCatalog),/PRESERVE_NATIVE_BONES_AND_PARENTS/);
});
test('Actual Kingambit geometry or pivot edits are preserved, not replaced by the native model',()=>{
 for(const edit of ['cube','pivot']){
  const {asset,native}=nativeKingambit();
  const bone=asset.model['minecraft:geometry'][0].bones.find(b=>b.cubes?.length);
  if(edit==='cube')bone.cubes[0].size[0]+=0.5;else bone.pivot[0]+=0.5;
  const files=unpack(buildStarPack([asset],[native]));
  const r=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_kingambit.json'));
  assert.equal(r.variations[0].model,'cobblestar_planets:star_kingambit.geo');
  const saved=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/models/star/star_kingambit.geo.json'));
  assert.deepEqual(saved['minecraft:geometry'][0].bones,asset.model['minecraft:geometry'][0].bones);
 }
});
