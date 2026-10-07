import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync,inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {png,buildStarPack} from '../dist/star-assets.js';

function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),b=Buffer.alloc(12+data.length);b.writeUInt32BE(data.length);t.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([t,data])),8+data.length);return b;}
function skin(width=64,height=64){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width*4+1)*height,0))),chunk('IEND',Buffer.alloc(0))]);}
function unpack(zip){const files=new Map();let at=0;while(zip.readUInt32LE(at)===0x04034b50){const len=zip.readUInt16LE(at+26),start=at+30+len+zip.readUInt16LE(at+28),size=zip.readUInt32LE(at+18);files.set(zip.toString('utf8',at+30,at+30+len),inflateRawSync(zip.subarray(start,start+size)));at=start+size;}return files;}
test('NPC skins validate dimensions, pixel stream and checksum; shared assets survive',()=>{
 const bytes=skin(),hash=createHash('sha256').update(bytes).digest('hex');
 assert.deepEqual(png(bytes.toString('base64'),64,64),bytes);
 assert.throws(()=>png(skin(64,32).toString('base64'),64,64));
 const bad=Buffer.from(bytes);bad[40]^=1;assert.throws(()=>png(bad.toString('base64'),64,64));
 assert.throws(()=>png('not a png',64,64));
 assert.throws(()=>buildStarPack([],[],[{hash:'../../escape',png:bytes}]));
 const base=unpack(buildStarPack([],[])),pack=buildStarPack([],[],[{hash,png:bytes}]),files=unpack(pack);
 for(const [path,value] of base)assert.deepEqual(files.get(path),value,path);
 assert.deepEqual(files.get(`assets/cobblestar_planets/textures/entity/quest_npc/upload/${hash}.png`),bytes);
 assert.deepEqual(buildStarPack([],[],[{hash,png:bytes}]),pack);
});
test('NPC upload requires writer + origin, rebuilds only published assets, rolls back on failure',async()=>{
 Object.assign(process.env,{NODE_ENV:'test',PUBLIC_API_URL:'http://localhost:3000',SITE_ORIGIN:'http://localhost:3000',DB_HOST:'127.0.0.1',DB_NAME:'test',DB_USER:'test',DB_PASSWORD:'test',COOKIE_SECRET:'a'.repeat(40),MINECRAFT_SERVER_KEY:'b'.repeat(40),GAME_ADMIN_DISCORD_IDS:'123',GAME_ADMIN_READ_DISCORD_IDS:'456'});
 const [{default:Fastify},{registerStarStudio},{pool}]=await Promise.all([import('fastify'),import('../dist/star-studio.js'),import('../dist/db.js')]);
 const original={query:pool.query,getConnection:pool.getConnection};let calls=[],fail=false;
 pool.query=async()=>[[{catalog_json:'[]'}],[]];
 pool.getConnection=async()=>({beginTransaction:async()=>calls.push(['begin']),query:async sql=>{calls.push([sql]);return[sql.includes('star_models')?[{published_json:null,draft_json:'invalid unpublished draft'}]:[],[]];},execute:async(sql,args)=>{calls.push([sql,args]);if(fail&&sql.startsWith('UPDATE'))throw Error('WRITE_FAILED');return[[],[]];},commit:async()=>calls.push(['commit']),rollback:async()=>calls.push(['rollback']),release:()=>{}});
 const app=Fastify();registerStarStudio(app,{session:async r=>r.headers.authorization?{id:'actor',discord_id:r.headers.authorization==='admin'?'123':'456'}:null,server:()=>false});
 const request=(authorization,origin='http://localhost:3000',texture=skin().toString('base64'))=>app.inject({method:'POST',url:'/api/admin/npc-skins',headers:{...(authorization?{authorization}:{}),origin},payload:{texture}});
 try{
  assert.equal((await request()).statusCode,401);assert.equal((await request('reader')).statusCode,403);assert.equal((await request('admin','https://evil.test')).statusCode,403);
  assert.equal((await request('admin',undefined,'bad')).statusCode,400);assert.equal(calls.length,0);
  const response=await request('admin');assert.equal(response.statusCode,200);assert.match(response.json().skin,/upload\/[a-f0-9]{64}\.png$/);
  const pack=calls.find(([s])=>s.startsWith('INSERT IGNORE INTO star_packs'))[1][1];
  assert.ok(unpack(pack).has('assets/'+response.json().skin.replace(':','/')));
  assert.ok(calls.some(([s])=>s==='commit'));assert.ok(!calls.some(([s])=>s.startsWith('UPDATE star_models')));
  calls=[];fail=true;assert.equal((await request('admin')).statusCode,500);assert.ok(calls.some(([s])=>s==='rollback'));assert.ok(!calls.some(([s])=>s==='commit'));
 }finally{pool.query=original.query;pool.getConnection=original.getConnection;await app.close();await pool.end();}
});
