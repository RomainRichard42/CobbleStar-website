import test from 'node:test';
import assert from 'node:assert/strict';
import {stampWikiPublication} from '../dist/wiki-publication.js';
const date='2026-10-26T21:00:00.000Z',next='2026-11-02T10:00:00.000Z';
const a={id:'daycare',published:true,title:'Pension',order:0,blocks:[{kind:'paragraph',text:'Texte original'}],modifiedAt:date};
test('only changed published content receives a new modification date',()=>{
 const previous={articles:[a,{...a,id:'legacy',modifiedAt:undefined}]};
 const result=stampWikiPublication({articles:[{...a,order:5,modifiedAt:next},{...a,id:'legacy',modifiedAt:next},{...a,id:'new',modifiedAt:'2099-01-01T00:00:00Z'}]},previous,next);
 assert.equal(result[0].modifiedAt,date);assert.equal(result[1].modifiedAt,undefined);assert.equal(result[2].modifiedAt,next);
 const changed=stampWikiPublication({articles:[{...a,blocks:[{kind:'paragraph',text:'Texte corrigé'}]}]},previous,next);
 assert.equal(changed[0].modifiedAt,next);
});
test('hidden drafts do not acquire publication dates and newly visible articles do',()=>{
 const draft={...a,published:false,modifiedAt:next};
 assert.equal(stampWikiPublication({articles:[draft]},{articles:[]},next)[0].modifiedAt,undefined);
 assert.equal(stampWikiPublication({articles:[a]},{articles:[draft]},next)[0].modifiedAt,next);
});
