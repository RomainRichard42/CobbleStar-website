import test from 'node:test';
import assert from 'node:assert/strict';
import {gtsMessage} from '../dist/discord-gts-message.js';
import {bridgeSchema} from '../dist/discord-policy.js';

const listing={mode:'sale',type:'pokemon',name:'Piplup · Normal · Niv.1',seller:'LarkAvery_',count:1,price:100,endsAt:1793000000000};
test('Old queued announcements become embeds without technical IDs or attachments',()=>{
  const payload=gtsMessage({text:'[main] 2026-10-13T23:24:38.947Z\nNouvelle annonce GTS · Piplup · Normal · Niv.1 ×1\nVendeur : LarkAvery_ · Prix total : 100 Cobblecoins\nAnnonce : secret-listing-id'});
  assert.match(payload.embeds[0].description,/Piplup/);
  assert.doesNotMatch(JSON.stringify(payload),/secret-listing-id|\[main\]|2026-10-13/);
  assert.equal(payload.content,undefined);assert.equal(payload.files,undefined);
});
test('Sales and auctions use distinct icons and Discord local/relative timestamps',()=>{
  const sale=gtsMessage({text:'unused',listing}).embeds[0];
  assert.match(sale.title,/💰/);assert.match(sale.description,/🔴/);
  assert.match(gtsMessage({text:'',listing},{pokemon:'<:cs_pokemon:123456789012345678>'}).embeds[0].description,/<:cs_pokemon:123456789012345678>/);
  const auction=gtsMessage({text:'unused',listing:{...listing,mode:'auction',type:'item'}}).embeds[0];
  assert.match(auction.title,/🔨/);assert.match(auction.description,/📦/);
  assert.equal(auction.fields[2].value,'<t:1793000000:F>\n<t:1793000000:R>');
});
test('Player text cannot inject mentions or formatting and unknown legacy formats hide IDs',()=>{
  const payload=gtsMessage({text:'',listing:{...listing,name:'**fake** <@123456789012345678> @everyone',seller:'bad\nname'}});
  assert.deepEqual(payload.allowedMentions,{parse:[]});
  assert.doesNotMatch(payload.embeds[0].description,/<@|@everyone/);
  assert.match(payload.embeds[0].description,/\\\*/);
  assert.doesNotMatch(JSON.stringify(gtsMessage({text:'Unexpected format\nAnnonce : secret-id'})),/secret-id/);
});
test('Ingest requires real auction deadlines and rejects malformed or misplaced listing metadata',()=>{
  const event={id:'gts-1',kind:'gts',text:'Annonce',occurredAt:Date.now(),listing};
  const valid=e=>bridgeSchema.safeParse({serverId:'main',events:[e]}).success;
  assert.ok(valid(event));
  assert.equal(valid({...event,kind:'chat'}),false);
  assert.equal(valid({...event,listing:{...listing,mode:'auction',endsAt:undefined}}),false);
  assert.equal(valid({...event,listing:{...listing,price:-1}}),false);
  assert.equal(valid({...event,listing:{...listing,webhook:'https://example.com'}}),false);
});
