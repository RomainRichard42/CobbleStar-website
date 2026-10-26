import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {join} from 'node:path';
const wiki=JSON.parse(await readFile('wiki.default.json','utf8'));
const sources=JSON.parse(await readFile('docs/wiki-sources.json','utf8'));
test('published wiki has valid identities, preserved links, assets and documented sources',async()=>{
 const ids=new Set(),branches=new Set(wiki.branches.map(b=>b.id));
 for(const old of ['welcome','capture','daycare','quests','ranked'])assert.ok(wiki.articles.some(a=>a.id===old));
 for(const a of wiki.articles){assert.ok(!ids.has(a.id),a.id);ids.add(a.id);assert.match(a.id,/^[a-z0-9_-]{1,64}$/);assert.ok(branches.has(a.branchId),a.id);assert.ok(a.title.length<=96);assert.ok(a.summary.length<=300);assert.ok(a.hero.alt.length<=160);assert.ok(a.blocks.length<=120);assert.ok(sources[a.id]?.length,a.id);await access(join('public',a.hero.asset));}
});
test('player command examples exclude administrative and obsolete activity routes',()=>{
 const commands=wiki.articles.flatMap(a=>a.blocks.filter(b=>b.kind==='command').map(b=>b.command));
 for(const cmd of commands)assert.doesNotMatch(cmd,/^\/(?:.*admin|raid\b|ranked (?:queue|rewards|simulate)|epreuve\b|arene\b|startertest|donjon)/,cmd);
 const daycare=JSON.stringify(wiki.articles.find(a=>a.id==='daycare'));
 assert.match(daycare,/\/pension/);assert.doesNotMatch(daycare,/règles de reproduction de DayCare\+/);
});
