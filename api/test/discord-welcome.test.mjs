import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {ChannelType,PermissionFlagsBits as P} from 'discord.js';
import {DiscordWelcome,renderWelcomeCard,welcomeMessage,welcomeNonce,welcomeEventId,safeAvatarUrl,avatarBytes,welcomeName} from '../dist/discord-welcome.js';
const guildId='1540002066469101629',memberId='1562050620045660212',channelId='1556587837065793606';
const card={guildId,memberId,channelId,name:'LhShiroe',avatar:'https://cdn.discordapp.com/embed/avatars/0.png',joinedAt:Date.now()};

test('only bounded Discord CDN avatar requests are allowed; no arbitrary URL or redirect',async()=>{
  for(const url of ['http://cdn.discordapp.com/embed/avatars/0.png','https://cdn.discordapp.com.attacker.test/avatars/123/a.png','https://localhost/a.png','https://cdn.discordapp.com:8443/embed/avatars/0.png','https://cdn.discordapp.com/attachments/private/a.png'])assert.equal(safeAvatarUrl(url),null);
  assert.ok(safeAvatarUrl(card.avatar));assert.ok(safeAvatarUrl('https://cdn.discordapp.com/guilds/123/users/456/avatars/abcdef.png?size=256'));
  let called=false;assert.equal(await avatarBytes('http://127.0.0.1/secret',async()=>{called=true;}),undefined);assert.equal(called,false);
  assert.equal(await avatarBytes(card.avatar,async(_url,options)=>{assert.equal(options.redirect,'error');return new Response('too large',{headers:{'content-type':'image/png','content-length':'2000000'}});}),undefined);
});
test('banner keeps the supplied art and transparent corners; names cannot inject markup',async()=>{
  const avatar=await sharp({create:{width:64,height:64,channels:4,background:'#66bbff'}}).png().toBuffer();
  for(const name of ['LhShiroe','<span foreground="red">@everyone</span>','Évoli & Salamèche ✨','W'.repeat(64)]){
    const output=await renderWelcomeCard(name,avatar);const info=await sharp(output).metadata();assert.equal(info.width,1100);assert.equal(info.height,500);
    const original=await readFile(new URL('../discord-welcome-assets/background.png',import.meta.url));
    const region={left:600,top:0,width:500,height:500};
    assert.deepEqual(await sharp(output).extract(region).raw().toBuffer(),await sharp(original).extract(region).raw().toBuffer());
  }
  assert.equal(welcomeName('\n\u202e'), 'Dresseur');assert.ok((await renderWelcomeCard('Sans avatar')).length>1000);
});
test('only the joining player is mentioned, with a stable nonce and attached card',()=>{
  const payload=welcomeMessage(card,Buffer.from('png'));assert.deepEqual(payload.allowedMentions.users,[memberId]);assert.deepEqual(payload.allowedMentions.parse,[]);assert.deepEqual(payload.allowedMentions.roles,[]);
  assert.equal(payload.files[0].name,'bienvenue-cobblestar.png');assert.equal(payload.enforceNonce,true);assert.equal(payload.nonce.length,24);
  const id=welcomeEventId(guildId,memberId,card.joinedAt);assert.equal(welcomeNonce(id),payload.nonce);assert.notEqual(welcomeNonce(id),welcomeNonce(welcomeEventId(guildId,memberId,card.joinedAt+1)));
});
test('new arrivals are queued once, existing members are not scanned, bots and disabled welcomes are ignored',async()=>{
  const rows=new Map();let enabled=true;
  const service=new DiscordWelcome(async()=>{throw Error('should not enumerate members');},{execute:async(sql,args)=>{assert.match(sql,/INSERT IGNORE/);rows.set(args[0],args);}},async()=>({enabled,channelId}));
  const member={id:memberId,guild:{id:guildId},user:{bot:false},displayName:'LhShiroe',joinedTimestamp:card.joinedAt,displayAvatarURL:()=>card.avatar};
  await service.enqueue(member);await service.enqueue(member);assert.equal(rows.size,1);assert.equal([...rows.values()][0][1],'welcome');
  await service.enqueue({...member,user:{bot:true},id:'123456789012345678'});enabled=false;await service.enqueue({...member,id:'123456789012345679'});assert.equal(rows.size,1);
});
test('delivery uses only configured channel, checks permissions and lets failures be retried',async()=>{
  const sent=[];let permitted=true,left=false;
  const channel={type:ChannelType.GuildText,permissionsFor:()=>({has:bits=>{assert.ok(bits.includes(P.AttachFiles));return permitted;}}),send:async value=>sent.push(value)};
  const guild={id:guildId,channels:{fetch:async id=>{assert.equal(id,channelId);return channel;}},members:{fetchMe:async()=>({id:'bot'}),fetch:async id=>{assert.equal(id,memberId);if(left)throw {code:10007};return{};}}};
  const service=new DiscordWelcome(async()=>guild,{execute:async()=>{}},async()=>({enabled:true,channelId}),async()=>Buffer.from('png'));
  const health=await service.check();assert.equal(health.channelId,channelId);assert.ok(health.cardBytes>1000);assert.equal(sent.length,0);
  await service.deliver(JSON.stringify(card));assert.equal(sent.length,1);
  permitted=false;await assert.rejects(()=>service.deliver(card),/permissions/);assert.equal(sent.length,1);
  permitted=true;left=true;await service.deliver(card);assert.equal(sent.length,1);
  await service.deliver({...card,joinedAt:Date.now()-25*3600_000});assert.equal(sent.length,1);
});
