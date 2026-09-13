import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { validateStar, buildStarPack } from '../dist/star-assets.js';
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
test('Deterministic pack preserves previous species and only adds Star resolver',()=>{const a=fixture(),b={...fixture(),species:'eevee'},cat=[native,{...native,species:'eevee',poser:'cobblemon:eevee'}];const zip=buildStarPack([a,b],cat);assert.deepEqual(zip,buildStarPack([b,a],cat));const files=unpack(zip);assert.equal(files.size,9);assert.ok(files.has('licenses/Cobblemon.txt'));assert.equal(JSON.parse(files.get('pack.mcmeta')).pack.pack_format,34);for(const id of ['dragonite','eevee']){const r=JSON.parse(files.get(`assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_${id}.json`));assert.deepEqual(r.variations[0].aspects,['cobblestar-star']);assert.equal(r.variations[0].poser,'cobblemon:'+id);assert.equal(r.order,10000);}});
test('Optional emissive texture becomes a dedicated luminous layer',()=>{const files=unpack(buildStarPack([{...fixture(),emissive:texture}],[native]));const r=JSON.parse(files.get('assets/cobblestar_planets/bedrock/pokemon/resolvers/star/star_dragonite.json'));assert.equal(r.variations[0].layers[0].emissive,true);assert.ok(files.has('assets/cobblestar_planets/textures/pokemon/star/star_dragonite_glow.png'));});

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
