import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { starTemplates, sameSkeleton, nativeStarKit, editableStarKit } from '../dist/star-library.js';

function unpack(zip){const files=new Map();let at=0;while(zip.readUInt32LE(at)===0x04034b50){const size=zip.readUInt32LE(at+18),length=zip.readUInt16LE(at+26),start=at+30+length+zip.readUInt16LE(at+28);files.set(zip.toString('utf8',at+30,at+30+length),inflateRawSync(zip.subarray(start,start+size)));at=start+size;}return files;}
const fixture=()=>{const file=name=>readFileSync(new URL(`../../public/downloads/pokemon-star/dragonite/${name}`,import.meta.url));return {species:'dragonite',model:JSON.parse(file('dragonite.geo.json')),texture:file('dragonite.png').toString('base64'),emissive:file('dragonite_glow.png').toString('base64')};};

test('Native editing kit contains actual base geometry, texture, blank glow and instructions',async()=>{
 const index=await starTemplates(),native=index.species.find(t=>t.species==='dragonite');assert.match(index.version,/^1\.8\.0/);assert.equal(native.name,'Dracolosse');assert.ok(index.species.length>800);
 const files=unpack(await nativeStarKit('dragonite'));assert.ok(files.has('dragonite.geo.json'));assert.ok(files.has('dragonite.png'));assert.ok(files.has('dragonite_glow.png'));assert.ok(files.has('README.txt'));assert.ok(files.has('licenses/Cobblemon.txt'));assert.ok([...files.keys()].some(k=>k.startsWith('reference/animations/')));
 const model=JSON.parse(files.get('dragonite.geo.json'));assert.equal(model['minecraft:geometry'][0].description.texture_width,256);
 assert.ok(sameSkeleton(native,{...native,bones:[...native.bones].reverse()}));assert.ok(!sameSkeleton(native,{...native,bones:native.bones.slice(1)}));
 await assert.rejects(()=>nativeStarKit('../secret'),/INVALID_SPECIES/);
});

test('Editable Star ZIP retains exact published model, texture and glow',async()=>{
 const asset=fixture(),files=unpack(await editableStarKit(asset,7,'published'));
 assert.deepEqual(JSON.parse(files.get('dragonite.geo.json')),asset.model);assert.equal(files.get('dragonite.png').toString('base64'),asset.texture);assert.equal(files.get('dragonite_glow.png').toString('base64'),asset.emissive);assert.match(files.get('README.txt').toString(),/révision 7/);
});

test('Editable Greninja kit retains the independently imported Sacha textures',async()=>{
 const texture=readFileSync(new URL('../star-layers/ashgreninja/blank.png',import.meta.url)).toString('base64');
 const asset={...fixture(),species:'greninja',ash:{texture,emissive:texture}};
 const files=unpack(await editableStarKit(asset,3,'draft'));
 assert.deepEqual(JSON.parse(files.get('sachanobi-star.json')),asset.ash);
 assert.deepEqual(JSON.parse(files.get('greninja.geo.json')),asset.model);
});

test('Admin preview and downloads are authenticated and distinguish draft from published',async()=>{
 Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),GAME_ADMIN_READ_DISCORD_IDS:'123'});
 const [{default:Fastify},{registerStarStudio},{pool}]=await Promise.all([import('fastify'),import('../dist/star-studio.js'),import('../dist/db.js')]);
 const originalQuery=pool.query,originalExecute=pool.execute;let reads=0;
 const published=fixture(),draft={...published,emissive:undefined},native=(await starTemplates()).species.find(t=>t.species==='dragonite');
 pool.query=async()=>{reads++;return [[{catalog_json:JSON.stringify([native])}],[]];};
 pool.execute=async()=>{reads++;return [[{draft_json:JSON.stringify(draft),published_json:JSON.stringify(published),revision:8,published_revision:7}],[]];};
 const app=Fastify();registerStarStudio(app,{session:async r=>r.headers.authorization==='reader'?{id:'test',discord_id:'123'}:null,server:()=>false});
 try{
  for(const route of ['asset','kit'])assert.equal((await app.inject(`/api/admin/star/dragonite/${route}`)).statusCode,401);assert.equal(reads,0);
  const get=url=>app.inject({url,headers:{authorization:'reader'}});
  const a=await get('/api/admin/star/dragonite/asset');assert.equal(a.statusCode,200);assert.equal(a.headers['cache-control'],'no-store');assert.equal(a.json().revision,7);assert.equal(a.json().asset.emissive,published.emissive);
  const b=await get('/api/admin/star/dragonite/asset?version=draft');assert.equal(b.json().revision,8);assert.equal(b.json().asset.emissive,undefined);
  for(const source of ['native','published','draft']){const r=await get(`/api/admin/star/dragonite/kit?source=${source}`);assert.equal(r.statusCode,200);assert.match(r.headers['content-type'],/application\/zip/);assert.match(r.headers['content-disposition'],new RegExp(`star-${source}\\.zip`));assert.ok(unpack(r.rawPayload).has('dragonite.png'));}
  assert.equal((await app.inject({method:'PUT',url:'/api/admin/star/dragonite',headers:{authorization:'reader'},payload:{}})).statusCode,403);
  assert.equal((await get('/api/admin/star/dragonite/asset?form=ash')).statusCode,404);
  published.species='greninja';published.ash={texture:readFileSync(new URL('../star-layers/ashgreninja/blank.png',import.meta.url)).toString('base64')};
  assert.equal((await app.inject('/api/admin/star/greninja/asset?form=ash')).statusCode,401);
  const ash=await get('/api/admin/star/greninja/asset?form=ash');assert.equal(ash.statusCode,200);assert.equal(ash.json().asset.model['minecraft:geometry'][0].description.texture_width,130);
  assert.equal((await get('/api/admin/star/greninja/asset?form=ash&version=draft')).statusCode,404);
 }finally{pool.query=originalQuery;pool.execute=originalExecute;await app.close();await pool.end();}
});
