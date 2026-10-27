import test from 'node:test';
import assert from 'node:assert/strict';
import {availableWiki} from '../dist/wiki-availability.js';

test('old CMS publications cannot expose the unavailable guide or its commands',()=>{
 const legacy={branches:[{id:'exploration',label:'Mondes & PokéPark'}],articles:[
  {id:'pokepark',published:true,blocks:[{kind:'paragraph',text:'PokéPark'}]},
  {id:'commandes',published:true,modifiedAt:'2026-10-26',blocks:[{kind:'itemGrid',items:[{title:'Aventure',text:'/epreuves, /ligue et /pokepark ouvrent les activités correspondantes. Le Ranked se lance auprès de son responsable.'}]}]},
  {id:'daycare',published:true,modifiedAt:'2026-10-25',blocks:[{kind:'paragraph',text:'La pension reste disponible.'}]},
 ]};
 const before=structuredClone(legacy),result=availableWiki(legacy);
 assert.doesNotMatch(JSON.stringify(result),/pok[eé][ -]?park/i);
 assert.deepEqual(legacy,before,'saved draft must remain recoverable');
 assert.deepEqual(result.articles.find(a=>a.id==='daycare'),before.articles[2]);
 assert.equal(result.articles.find(a=>a.id==='commandes').modifiedAt,'2026-10-27');
 assert.match(JSON.stringify(result),/\/epreuves et \/ligue/);
 assert.deepEqual(availableWiki(result),result,'availability corrections must be idempotent');
});
