import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source=await readFile(new URL('../app/lib/discord-account-flow.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {rememberDiscordAppIntent,takeDiscordAppIntent}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
function storage(){const values=new Map();return {setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k)};}

test('the blue button choice opens the app only after a verified successful login, once',()=>{
 const state=storage();rememberDiscordAppIntent(state,1_000);
 assert.equal(takeDiscordAppIntent('connected',true,state,2_000),true);
 assert.equal(takeDiscordAppIntent('connected',true,state,2_001),false);
});
test('a connected query without a button choice never opens Discord',()=>{
 assert.equal(takeDiscordAppIntent('connected',true,storage(),2_000),false);
});
test('failed, denied and unsuccessful guild joins cancel the app choice',()=>{
 for(const result of ['failed','denied','guild-failed','unavailable',null]){
  const state=storage();rememberDiscordAppIntent(state,1_000);
  assert.equal(takeDiscordAppIntent(result,true,state,2_000),false,result);
  assert.equal(takeDiscordAppIntent('connected',true,state,2_001),false,'cancelled choices cannot be replayed');
 }
});
test('a successful-looking URL without an authenticated account cannot launch Discord',()=>{
 const state=storage();rememberDiscordAppIntent(state,1_000);
 assert.equal(takeDiscordAppIntent('connected',false,state,2_000),false);
});
test('expired and future button choices are discarded',()=>{
 for(const now of [999,601_001]){
  const state=storage();rememberDiscordAppIntent(state,1_000);
  assert.equal(takeDiscordAppIntent('connected',true,state,now),false);
 }
});
