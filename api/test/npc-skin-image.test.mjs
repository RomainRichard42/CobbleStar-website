import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizeNpcSkin} from '../dist/npc-skin-image.js';
test('valid indexed/interlaced Alex skin normalizes to RGBA and keeps slim arms',async()=>{
 const raw=Buffer.alloc(64*64*4);for(const [x,y] of [[44,22],[36,54]]){const at=(y*64+x)*4;raw[at]=100;raw[at+1]=155;raw[at+2]=240;raw[at+3]=255;}
 const source=await sharp(raw,{raw:{width:64,height:64,channels:4}}).png({palette:true,progressive:true}).toBuffer();
 const result=await normalizeNpcSkin(source.toString('base64'));assert.equal(result.model,'slim');const meta=await sharp(result.png).metadata();assert.equal(meta.width,64);assert.equal(meta.height,64);assert.equal(meta.isPalette,false);assert.deepEqual(await sharp(result.png).raw().toBuffer(),await sharp(source).ensureAlpha().raw().toBuffer());
 assert.equal((await normalizeNpcSkin(source.toString('base64'),'wide')).model,'wide');
 raw[(20*64+54)*4+3]=255;const wide=await sharp(raw,{raw:{width:64,height:64,channels:4}}).png().toBuffer();assert.equal((await normalizeNpcSkin(wide.toString('base64'))).model,'wide');
});
test('bad PNGs, wrong dimensions and a forged image type are rejected',async()=>{
 await assert.rejects(normalizeNpcSkin('invalid'));const bad=await sharp({create:{width:64,height:32,channels:4,background:'#ffffff'}}).png().toBuffer();await assert.rejects(normalizeNpcSkin(bad.toString('base64')));
 const gif=await sharp({create:{width:64,height:64,channels:4,background:'#ffffff'}}).gif().toBuffer();await assert.rejects(normalizeNpcSkin(gif.toString('base64')));
});
