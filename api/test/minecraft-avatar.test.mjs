import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import sharp from 'sharp';
import { createMinecraftAvatarStore, registerMinecraftAvatars, renderMinecraftFace } from '../dist/minecraft-avatar.js';

const uuid = 'b05c027333ef4bf684887a2f3d6afa29';
const hash = 'c'.repeat(64);
const textureUrl = `https://textures.minecraft.net/texture/${hash}`;
function profile(options = {}) {
  return { id: uuid, properties: [{ name: 'textures', value: Buffer.from(JSON.stringify({
    profileId: uuid, textures: { SKIN: { url: textureUrl } }, ...options,
  })).toString('base64') }] };
}
async function skin() {
  const pixels = Buffer.alloc(64 * 64 * 4);
  for (let y=8; y<16; y++) for (let x=8; x<16; x++) {
    const offset=(y*64+x)*4;
    pixels.set([255,0,0,255],offset);
  }
  pixels.set([0,0,255,255],(8*64+40)*4);
  return sharp(pixels,{raw:{width:64,height:64,channels:4}}).png().toBuffer();
}

test('the face uses Minecraft texture coordinates, hat transparency and crisp scaling', async () => {
  const face = await renderMinecraftFace(await skin());
  const {data,info} = await sharp(face).raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,64); assert.equal(info.height,64);
  assert.deepEqual([...data.subarray(0,4)],[0,0,255,255]);
  assert.deepEqual([...data.subarray(8*4,8*4+4)],[255,0,0,255]);
  await assert.rejects(renderMinecraftFace(await sharp({create:{width:128,height:128,channels:4,background:'red'}}).png().toBuffer()));
});

test('official profile and texture are checked, fetched once and cached across header requests', async () => {
  const calls=[]; const png=await skin();
  const avatars=createMinecraftAvatarStore({fetch:async(url,options)=>{
    calls.push(url); assert.equal(options.redirect,'error'); assert.ok(options.signal);
    return url.includes('sessionserver') ? Response.json(profile()) : new Response(png);
  }});
  const [first,second]=await Promise.all([avatars.get(uuid),avatars.get(uuid)]);
  assert.deepEqual(first,second); assert.ok(first);
  assert.deepEqual(await avatars.get(uuid),first);
  assert.deepEqual(calls,[`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`,textureUrl]);
});

test('HTTP 200 without a verified skin fails instead of presenting a generic Steve', async () => {
  let calls=0;
  const avatars=createMinecraftAvatarStore({fetch:async()=>{calls++;return Response.json({id:uuid,properties:[]});}});
  assert.equal(await avatars.get(uuid),undefined);
  assert.equal(await avatars.get(uuid),undefined);
  assert.equal(calls,1,'failure backoff prevents repeated Mojang requests on every page');
});

test('wrong identities, external texture URLs, redirects and oversized responses are rejected', async () => {
  for (const invalid of [
    {...profile(),id:'a'.repeat(32)},
    profile({profileId:'a'.repeat(32)}),
    profile({textures:{SKIN:{url:'https://attacker.example/skin.png'}}}),
    profile({textures:{SKIN:{url:`https://textures.minecraft.net.attacker.example/texture/${hash}`}}}),
  ]) {
    let calls=0;
    const avatars=createMinecraftAvatarStore({fetch:async()=>{calls++;return Response.json(invalid);}});
    assert.equal(await avatars.get(uuid),undefined); assert.equal(calls,1);
  }
  for (const response of [new Response(null,{status:302,headers:{location:'https://attacker.example'}}),new Response('x'.repeat(32769))]) {
    const avatars=createMinecraftAvatarStore({fetch:async()=>response});
    assert.equal(await avatars.get(uuid),undefined);
  }
});

test('a previously verified skin survives a short outage but expires after a day', async () => {
  let clock=1_000_000, online=true; const png=await skin();
  const avatars=createMinecraftAvatarStore({now:()=>clock,fetch:async url=>{
    if(!online) throw new Error('Timeout');
    return url.includes('sessionserver')?Response.json(profile()):new Response(png);
  }});
  const good=await avatars.get(uuid); assert.ok(good);
  clock+=31*60_000; online=false;
  assert.deepEqual(await avatars.get(uuid),good);
  clock+=24*60*60_000;
  assert.equal(await avatars.get(uuid),undefined);
});

test('avatar endpoint requires the authenticated linked identity and enables Discord fallback on failure',async()=>{
  const app=Fastify(); let player=null, image=Buffer.from('test-image'), requested=[];
  registerMinecraftAvatars(app,{session:async()=>player},{get:async value=>{requested.push(value);return image;}});
  try {
    assert.equal((await app.inject(`/api/me/avatar?uuid=${uuid}`)).statusCode,401);
    player={minecraft_uuid:uuid,minecraft_linked_at:null};
    assert.equal((await app.inject(`/api/me/avatar?uuid=${uuid}`)).statusCode,409);
    player.minecraft_linked_at=new Date();
    assert.equal((await app.inject(`/api/me/avatar?uuid=${'a'.repeat(32)}`)).statusCode,400);
    assert.deepEqual(requested,[]);
    const ok=await app.inject(`/api/me/avatar?uuid=${uuid}`);
    assert.equal(ok.statusCode,200); assert.equal(ok.headers['content-type'],'image/png');
    assert.equal(ok.headers['cache-control'],'private, max-age=300');
    image=undefined;
    const unavailable=await app.inject(`/api/me/avatar?uuid=${uuid}`);
    assert.equal(unavailable.statusCode,503);
    assert.equal(unavailable.headers['cache-control'],'private, no-store');
    assert.equal(unavailable.headers['retry-after'],'60');
  } finally {await app.close();}
});
