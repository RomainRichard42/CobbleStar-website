import {dexInfo} from '../api/dist/dex-info.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from '../api/node_modules/fastify/fastify.js';
import staticFiles from '../api/node_modules/@fastify/static/index.js';
import helmet from '../api/node_modules/@fastify/helmet/index.js';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {registerPublicSite,isPublicPage} from '../api/dist/public-site.js';
import {siteSecurity} from '../api/dist/site-security.js';
let wiki={content:JSON.parse(await readFile('wiki.default.json','utf8')),version:1,updatedAt:null};
let news={content:JSON.parse(await readFile('news.default.json','utf8')),version:1,updatedAt:null};
let dexEntries=[{id:'native-pikachu',species:'pikachu',name:'Pikachu',collection:'Classiques',form:'Classique',assetUrl:'/api/pokedex/native-pikachu/asset'}];
const app=Fastify();await app.register(helmet,siteSecurity);
registerPublicSite(app,{getWiki:async()=>wiki,getNews:async()=>news,getDexInfo:async(id)=>dexInfo({id,species:'pikachu',name:'Pikachu',collection:'Classiques',form:'Classique'}),getDex:async()=>dexEntries});
app.get('/api/test',async()=>({api:true}));
await app.register(staticFiles,{root:resolve('out')});
const base=await app.listen({host:'127.0.0.1',port:0});
test.after(()=>app.close());
const get=async path=>{const response=await fetch(base+path,{redirect:'manual'});return {response,html:await response.text()};};
test('public routing preserves account, shop, admin and API routes',async()=>{
  for(const p of ['/compte/','/boutique/','/vote/','/api/test','/wiki/admin/','/wiki/admin/access/','/actualites/admin/','/admin/discord/','/_next/static/chunk.js'])assert.equal(isPublicPage(p),false,p);
  const {response,html}=await get('/api/test');assert.equal(response.status,200);assert.deepEqual(JSON.parse(html),{api:true});
  for(const p of ['/compte/','/admin/discord/','/wiki/admin/']){const r=await get(p);assert.equal(r.response.status,200,p);assert.match(r.response.headers.get('x-robots-tag'),/noindex/);assert.equal(r.response.headers.get('x-cobblestar-renderer'),null);}
});

test('Pokédex renders public names in Astro and stays discoverable from the wiki and sitemap',async()=>{
 const page=await get('/wiki/pokedex/');assert.equal(page.response.status,200);assert.match(page.html,/Pikachu/);assert.match(page.html,/data-asset="\/api\/pokedex\/native-pikachu\/asset"/);assert.match(page.html,/id="dex-dialog"/);assert.match(page.html,/rel="canonical" href="https:\/\/cobblestar-mc.fr\/wiki\/pokedex\/"/);assert.ok(!(page.response.headers.get('x-robots-tag')||'').includes('noindex'));
 assert.match((await get('/wiki/')).html,/href="\/wiki\/pokedex\/"/);assert.match((await get('/sitemap.xml')).html,/<loc>https:\/\/cobblestar-mc.fr\/wiki\/pokedex\/<\/loc>/);
 const shop=await get('/boutique/');assert.match(shop.html,/id="tab-jetons"/);for(const token of ['nova','pulsar','quasar']){assert.match(shop.html,new RegExp('/shop/tokens/'+token+'\\.png'));assert.equal((await get('/shop/tokens/'+token+'.png')).response.status,200);}assert.match(shop.html,/href="\/wiki\/caisses\/#demo-machines"/);
});

test('homepage groups guide headings with their copy and keeps the FAQ separate',async()=>{
 const {html,response}=await get('/');assert.equal(response.status,200);
 const body=html.match(/<div class="home-server-guide-body">([\s\S]*?)<\/div>\s*<aside class="home-server-faq"/);
 assert.ok(body,'guide and FAQ have independent containers');
 for(const text of ['Un serveur Cobblemon français','Quel dresseur veux-tu devenir','Ce qu’il faut pour rejoindre','server-paths','/wiki/pokedex/','/installer-cobblemon/'])assert.ok(body[1].includes(text),text);
 const faq=html.match(/<aside class="home-server-faq"[\s\S]*?<\/aside>/)?.[0]||'';
 assert.ok(faq.includes('Avant de nous rejoindre.'));
 assert.ok(faq.includes('<details>'));
 assert.ok(!body[1].includes('<details>'));
 assert.match(html,/\/media\/logo-cercle-5-128\.webp/);
 for(const asset of ['/media/logo-cercle-5-128.webp','/media/logo-cercle-5-480.webp','/media/logo-cercle-5-96.png','/media/logo-cercle-5-180.png'])assert.equal((await get(asset)).response.status,200,asset);
});

test('compact Pokédex retains every crawlable form link beyond the first visual batch',async()=>{
 const original=dexEntries;
 try {
  dexEntries=Array.from({length:60},(_,i)=>({id:`star-pikachu-${i}`,species:'pikachu',name:i===59?'Pikachu <Rare>':'Pikachu',collection:'Star',form:`Forme ${i}`,assetUrl:`/api/pokedex/star-pikachu-${i}/asset?v=3`}));
  const {html,response}=await get('/wiki/pokedex/');
  assert.equal(response.status,200);
  assert.equal((html.match(/class="dex-profile-link"/g)||[]).length,60);
  for(let i=0;i<60;i++)assert.ok(html.includes(`href="/wiki/pokedex/pikachu/?forme=star-pikachu-${i}"`));
  assert.match(html,/Pikachu &lt;Rare&gt;/);assert.match(html,/Star · Forme 59/);
  assert.equal((html.match(/class="dex-portrait"/g)||[]).length,1,'only the reusable template contains a portrait');
  assert.doesNotMatch(html,/<canvas/);
 } finally {dexEntries=original;}
});

test('crate showcase keeps the guide indexable and loads only public display assets',async()=>{
 const {html}=await get('/wiki/caisses/');assert.match(html,/id="demo-machines"/);assert.match(html,/Aucun jeton dépensé/);assert.match(html,/id="section-13"/);
 assert.equal((html.match(/data-machine="/g)||[]).length,4);assert.equal((html.match(/data-crate-step="/g)||[]).length,6);
 for(const id of ['vote','nova','pulsar','quasar']){assert.equal((await get('/crates/'+id+'.webp')).response.status,200);const {html:raw}=await get('/crates/'+id+'.json');const model=JSON.parse(raw);assert.ok(model.crate.faces.length>900);assert.ok(model.ball.faces.length>100);assert.ok(model.crate.faces.every(f=>f.p.flat().every(Number.isFinite)));assert.ok(!('rewards' in model));}
 const motion=JSON.parse((await get('/crates/motion.json')).html);assert.equal(motion.rate,32);assert.ok(motion.frames.every(f=>f.balls.flat().every(Number.isFinite)));assert.ok(motion.frames.some(f=>f.grip===1));assert.ok(motion.frames.some(f=>f.lid===1));
 assert.match((await get('/sitemap.xml')).html,/<loc>https:\/\/cobblestar-mc.fr\/wiki\/caisses\/<\/loc><lastmod>2026-10-31T11:15:00Z<\/lastmod>/);
 assert.doesNotMatch(html,/<link[^>]+href="\/crates\/(?:motion|nova)\.json/);
});

test('Atlas has its own noindex page with public catalogue only and replaces the embedded tracker',async()=>{
 const page=await get('/collection/');assert.equal(page.response.status,200);
 assert.match(page.response.headers.get('cache-control'),/no-store/);
 assert.match(page.response.headers.get('x-robots-tag'),/noindex/);
 assert.match(page.html,/id="collection-catalog"/);assert.match(page.html,/Pikachu/);
 assert.doesNotMatch(page.html,/données de démo|Aster|Relevé de démonstration|userId|snapshot_json/);
 const dex=await get('/wiki/pokedex/');assert.match(dex.html,/href="\/collection\/"/);
 assert.doesNotMatch(dex.html,/id="collection-goal-dialog"/);
});
test('public pages have meaningful HTML, unique metadata and no React runtime',async()=>{
  const paths=['/','/rejoindre/','/minecraft-pokemon/','/installer-cobblemon/','/telecharger/','/wiki/','/actualites/','/roadmap/','/confidentialite/',...wiki.content.articles.filter(a=>a.published).map(a=>`/wiki/${a.id}/`),...news.content.articles.filter(a=>a.published).map(a=>`/actualites/${a.slug}/`)];
  const titles=new Set();
  for(const path of paths){const {response,html}=await get(path);assert.equal(response.status,200,path+' '+html.slice(0,200));assert.equal(response.headers.get('x-cobblestar-renderer'),'Astro');assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,path);assert.ok(html.includes(`rel="canonical" href="https://cobblestar-mc.fr${path}"`),path);const title=html.match(/<title>(.*?)<\/title>/s)?.[1];assert.ok(title);assert.ok(!titles.has(title),title);titles.add(title);assert.match(html,/<meta name="description" content="[^"]{20,}/);assert.ok(!html.includes('/_next/'),path);assert.match(response.headers.get('content-security-policy'),/script-src/);assert.ok(!html.includes('astro-island'),path);for(const script of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))JSON.parse(script[1]);}
});
test('publishing immediately creates real article URLs, drafts stay private and text is escaped',async()=>{
  const original=structuredClone(wiki);
  const sample=structuredClone(wiki.content.articles[0]);sample.id='test-publication';sample.title='Guide fraîchement publié';sample.blocks=[{kind:'paragraph',text:'Texte nouveau <script>alert(1)</script>'}];
  wiki.content.articles.push({...sample,published:false});assert.equal((await get('/wiki/test-publication/')).response.status,404);
  wiki.content.articles.at(-1).published=true;const r=await get('/wiki/test-publication/');assert.equal(r.response.status,200);assert.ok(r.html.includes('Guide fraîchement publié'));assert.ok(r.html.includes('&lt;script&gt;'));assert.ok(!r.html.includes('<script>alert(1)</script>'));
  wiki.content.branches.find(b=>b.id===sample.branchId).visible=false;assert.equal((await get('/wiki/test-publication/')).response.status,404);wiki=original;
  const missing=await get('/actualites/does-not-exist/');assert.equal(missing.response.status,404);assert.ok(missing.html.includes('noindex,follow'));
});

test('unavailable activity stays absent even when an older CMS document advertises it',async()=>{
 const previous=structuredClone(wiki);
 try {
  wiki.content.articles.push({...structuredClone(wiki.content.articles[0]),id:'pokepark',title:'PokéPark',published:true});
  const library=await get('/wiki/'),map=await get('/sitemap.xml'),retired=await get('/wiki/pokepark/');
  assert.doesNotMatch(library.html,/pok[eé][ -]?park/i);
  assert.doesNotMatch(map.html,/pokepark/);
  assert.equal(retired.response.status,404);
  assert.match(retired.html,/noindex,follow/);
  const install=await get('/installer-cobblemon/');
  assert.equal(install.response.status,200);
  assert.match(install.html,/Minecraft Java/);
  assert.match(install.html,/modrinth.com\/modpack\/cobblemon-fabric/);
  assert.match(install.html,/n’est pas encore ouvert/);
 } finally { wiki=previous; }
});
test('sitemap, RSS and redirects stay canonical without indexing private pages',async()=>{
  const map=await get('/sitemap.xml');assert.equal(map.response.status,200);assert.ok(map.html.includes('/wiki/'));assert.ok(!map.html.includes('/admin/'));assert.ok(!map.html.includes('<loc>https://cobblestar-mc.fr/compte/</loc>'));assert.ok(map.html.includes('/rejoindre/</loc><lastmod>2026-10-26</lastmod>'));for(const article of wiki.content.articles){if(article.modifiedAt&&article.id!=='caisses'){const changed=['welcome','capture'].includes(article.id)?'2026-11-01':article.modifiedAt;assert.ok(map.html.includes('/wiki/'+article.id+'/</loc><lastmod>'+changed+'</lastmod>'));}}assert.ok(map.html.includes('/actualites/'+news.content.articles[0].slug+'/'));
  const rss=await get('/actualites/rss.xml');assert.equal(rss.response.status,200);assert.ok(rss.html.includes('<rss version="2.0">'));
  for(const [from,to] of [['/wiki','/wiki/'],['/wiki/index.html','/wiki/'],['/rejoindre','/rejoindre/']]){const r=await get(from);assert.equal(r.response.status,308);assert.equal(r.response.headers.get('location'),to);}
  assert.ok((await get('/robots.txt')).html.includes('Sitemap: https://cobblestar-mc.fr/sitemap.xml'));
  const www=await app.inject({url:'/wiki?source=discord',headers:{host:'www.cobblestar-mc.fr'}});
  assert.equal(www.statusCode,308);assert.equal(www.headers.location,'https://cobblestar-mc.fr/wiki/?source=discord');
  const api=await app.inject({url:'/api/test',headers:{host:'www.cobblestar-mc.fr'}});assert.equal(api.statusCode,200);
});
test('Google site identity and social article metadata match the public document',async()=>{
  const home=await get('/');const data=[...home.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m=>JSON.parse(m[1]));
  const websites=data.filter(d=>d['@type']==='WebSite');assert.equal(websites.length,1);assert.equal(websites[0].name,'CobbleStar');assert.equal(websites[0].url,'https://cobblestar-mc.fr/');
  assert.match(home.html,/sizes="96x96" href="\/media\/logo-cercle-5-96.png"/);
  const article=await get('/actualites/'+news.content.articles[0].slug+'/');assert.ok(article.html.includes('property="og:type" content="article"'));assert.ok(article.html.includes('property="article:published_time" content="'+news.content.articles[0].publishedAt+'"'));
});

test('Astral covers public and player pages while admin keeps its own shell',async()=>{
  for(const path of ['/','/wiki/','/wiki/welcome/','/actualites/','/rejoindre/','/roadmap/','/minecraft-pokemon/','/telecharger/','/confidentialite/','/boutique/','/compte/','/vote/']){
    const {response,html}=await get(path);assert.equal(response.status,200,path);assert.match(html,/class="astral-header site-header"/,path);assert.match(html,/\/astral\/assets\/stars-button-v3.webp/,path);
  }
  for(const path of ['/admin/','/admin/discord/','/wiki/admin/','/actualites/admin/']){
    const {html}=await get(path);assert.ok(!html.includes('class="astral-header site-header"'),path);
  }
  const home=await get('/');assert.ok(!home.html.includes('local-gameplay'));assert.match(home.html,/\/astral\/journey\.js\?v=[a-z0-9-]+/);assert.ok(home.html.includes('prefers')||home.html.includes('motion.js'));assert.ok(home.html.includes('Ouverture à venir'));
  assert.ok(!home.html.includes('id="step-prev"'));assert.ok(!home.html.includes('id="step-next"'));
  const image=await get('/astral/assets/stars-320-v3.webp');assert.equal(image.response.status,200);assert.match(image.response.headers.get('content-type'),/image\/webp/);
});

test('shop publishes game catalogue prices and wiki headings have working outline targets',async()=>{
  const catalog=JSON.parse(await readFile('api/shop.catalog.json','utf8'));
  const shop=await get('/boutique/');
  for(const rank of catalog.products.filter(p=>p.category==='ranks')){
    assert.ok(shop.html.includes(rank.name.split(' · ')[0]));
    assert.ok(shop.html.includes(rank.starsPrice.toLocaleString('fr-FR')));
  }
  assert.ok(shop.html.includes('Filtrer le catalogue'));
  const page=await get('/wiki/welcome/');
  const targets=[...page.html.matchAll(/href="#(section-\d+)"/g)].map(m=>m[1]);
  assert.ok(targets.length>0);
  for(const target of targets)assert.ok(page.html.includes(`id="${target}"`),target);
});

test('every published guide is indexed, linked and has valid outline and related targets',async()=>{
  const library=await get('/wiki/'), sitemap=await get('/sitemap.xml');
  const paths=new Set(wiki.content.articles.filter(a=>a.published).map(a=>`/wiki/${a.id}/`));
  const destinations=new Set([...paths,'/wiki/pokedex/']);
  assert.equal((await get('/wiki/pokedex/')).response.status,200);
  for(const path of paths){
    assert.ok(library.html.includes(`href="${path}"`),path);
    assert.ok(sitemap.html.includes(`https://cobblestar-mc.fr${path}</loc>`),path);
    const {html}=await get(path);
    for(const [,target] of html.matchAll(/href="#(section-\d+)"/g))assert.ok(html.includes(`id="${target}"`),path+'#'+target);
    for(const [,link] of html.matchAll(/href="(\/wiki\/[^/#"]+\/)"/g))assert.ok(destinations.has(link),path+' → '+link);
  }
  assert.match(library.html,/data-search="[^"]*\/pension/);
  assert.match(library.html,/data-search="[^"]*stock est plein/);
});

test('article dates and social previews describe the exact published page',async()=>{
 const a=wiki.content.articles.find(a=>a.modifiedAt&&!['caisses','welcome','capture'].includes(a.id)), page=await get('/wiki/'+a.id+'/');
 const schema=[...page.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m=>JSON.parse(m[1]));
 const article=schema.find(x=>x['@type']==='Article');assert.equal(article.dateModified,a.modifiedAt);assert.equal(article.author.url,'https://cobblestar-mc.fr/');assert.ok(page.html.includes('datetime="'+a.modifiedAt+'"'));assert.ok(page.html.includes('property="article:modified_time" content="'+a.modifiedAt+'"'));
 for(const path of ['/boutique/','/vote/']){const {html}=await get(path);assert.ok(html.includes('property="og:url" content="https://cobblestar-mc.fr'+path+'"'));assert.match(html,/<meta name="twitter:title" content="[^"]+/);}
 const library=await get('/wiki/');const list=[...library.html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(m=>JSON.parse(m[1])).find(x=>x['@type']==='ItemList');assert.equal(list.numberOfItems,wiki.content.articles.filter(a=>a.published).length);
 const original=structuredClone(wiki);delete wiki.content.articles[0].modifiedAt;wiki.updatedAt='2099-01-01T00:00:00Z';const old=await get('/wiki/'+wiki.content.articles[0].id+'/');assert.ok(!old.html.includes('2099-01-01'));wiki=original;
});
test('previews stay excluded and static player pages canonicalize without touching API',async()=>{
 const preview=await get('/apercus/astral/');assert.match(preview.response.headers.get('x-robots-tag'),/noindex/);
 for(const path of ['/boutique','/vote','/boutique/index.html']){const r=await app.inject({url:path+'?source=discord',headers:{host:'www.cobblestar-mc.fr'}});assert.equal(r.statusCode,308);assert.equal(r.headers.location,'https://cobblestar-mc.fr'+(path.startsWith('/boutique')?'/boutique/':'/vote/')+'?source=discord');}
 for(const path of ['/boutique/','/vote/'])assert.equal((await get(path)).response.headers.get('x-cobblestar-renderer'),null);
});

 test('species pages expose real information without JavaScript and canonicalise appearances',async()=>{
 const page=await get('/wiki/pokedex/pikachu/');assert.equal(page.response.status,200);assert.ok(page.html.includes('>Pikachu</h1>'));for(const id of ['stats','evolutions','localisation','attaques'])assert.ok(page.html.includes('id="'+id+'"'));assert.match(page.html,/Raichu/);assert.match(page.html,/Tonnerre/);assert.match(page.html,/Électrik/);assert.ok(page.html.includes('rel="canonical" href="https://cobblestar-mc.fr/wiki/pokedex/pikachu/"'));
 const missing=await get('/wiki/pokedex/not-published/');assert.equal(missing.response.status,404);assert.match(missing.html,/noindex/);
 const variant=await get('/wiki/pokedex/pikachu/?forme=private-draft');assert.equal(variant.response.status,302);assert.equal(variant.response.headers.get('location'),'/wiki/pokedex/pikachu/');
 const slash=await get('/wiki/pokedex/pikachu');assert.equal(slash.response.status,308);
 const list=await get('/wiki/pokedex/');assert.ok(list.html.includes('href="/wiki/pokedex/pikachu/"'));const map=await get('/sitemap.xml');assert.ok(map.html.includes('<loc>https://cobblestar-mc.fr/wiki/pokedex/pikachu/</loc>'));assert.ok(!map.html.includes('?forme='));
 });

 test('Pokemon tabs preserve complete crawlable panels and anchor navigation without JavaScript',async()=>{
  const {html}=await get('/wiki/pokedex/pikachu/');
  for(const id of ['apercu','evolutions','localisation','attaques']){
   assert.ok(html.includes('href="#'+id+'"'));
   const panel=html.match(new RegExp('<(?:div|section) id="'+id+'"[^>]*>'));
   assert.ok(panel,id);assert.match(panel[0],/data-pokemon-panel/);assert.doesNotMatch(panel[0],/hidden/);
  }
  assert.match(html,/id="talents"/);assert.match(html,/id="stats"/);
  assert.match(html,/Raichu/);assert.match(html,/Tonnerre/);
  assert.match(html,/id="pokemon-more-moves"[^>]*hidden/);
  assert.doesNotMatch(html,/<details class="dex-move"[^>]*hidden/);
  assert.doesNotMatch(html,/<meta name="robots" content="noindex/);
 });

test('species navigation links canonical neighbours once per species, including catalogue boundaries',async()=>{
 const original=dexEntries;
 try{
  const entry=(species,name,collection='Classiques')=>({id:(collection==='Classiques'?'native-':'star-')+species,species,name,collection,form:'Classique',assetUrl:''});
  dexEntries=[entry('raichu','Raichu'),entry('pikachu','Pikachu','Star'),entry('bulbasaur','Bulbizarre'),entry('pikachu','Pikachu')];
  const {html}=await get('/wiki/pokedex/pikachu/');
  const nav=html.match(/<nav class="pokemon-neighbours"[\s\S]*?<\/nav>/)[0];
  assert.match(nav,/href="\/wiki\/pokedex\/bulbasaur\/"/);
  assert.match(nav,/href="\/wiki\/pokedex\/raichu\/"/);
  assert.doesNotMatch(nav,/forme=|href="\/wiki\/pokedex\/pikachu\/"/);
  assert.equal((nav.match(/data-pokemon-neighbour/g)||[]).length,2);
  assert.match(html,/<form id="pokemon-jump" action="\/wiki\/pokedex\/" method="get"/);
  assert.match(html,/name="pokemon"/);
  const first=await get('/wiki/pokedex/bulbasaur/'),last=await get('/wiki/pokedex/raichu/');
  assert.match(first.html,/Début du Pokédex/);assert.match(last.html,/Fin du Pokédex/);
 }finally{dexEntries=original;}
});

test('live crate catalogue exposes all rewards, accurate odds and a mechanically attached capsule',async()=>{
 const raw=(await get('/crates/catalog.json')).html;assert.doesNotMatch(raw,/"command"\s*:|pokegiveother|give \{player\}|bal \{player\}/);
 const catalog=JSON.parse(raw);assert.equal(catalog.crates.length,4);const counts={vote:31,nova:12,pulsar:18,quasar:25};const {html}=await get('/wiki/caisses/');const icons=new Set();
 for(const crate of catalog.crates){const rewards=crate.tiers.flatMap(t=>t.rewards);assert.equal(rewards.length,counts[crate.id]);assert.ok(Math.abs(crate.tiers.reduce((n,t)=>n+t.chance,0)-100)<1e-8);
  for(const tier of crate.tiers){assert.ok(Math.abs(tier.rewards.reduce((n,r)=>n+r.chance,0)-tier.chance)<1e-8);for(const r of tier.rewards){assert.ok(r.chance>0);assert.ok(html.includes(r.label.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));icons.add(r.icon);}}
  const motion=JSON.parse((await get('/crates/motion-'+crate.id+'.json')).html);assert.ok(motion.selected>=0&&motion.selected<rewards.length);assert.ok(motion.frames.every(f=>f.balls.length===rewards.length&&f.balls.flat().every(Number.isFinite)));
  for(const f of motion.frames.filter(f=>f.t>=112&&f.t<=148)){const ball=f.balls[motion.selected];assert.ok(Math.abs(ball[0]-f.claw[0])<.001);assert.ok(Math.abs(ball[2]-f.claw[2])<.001);assert.ok(Math.abs(f.claw[1]-ball[1]-4.3*motion.scale)<.001);assert.equal(f.grip,1);}
  const held=motion.frames.find(f=>f.t===132).balls[motion.selected],pickup=motion.frames.find(f=>f.t===110).balls[motion.selected];assert.ok(held[1]>pickup[1]+5,'capsule actually rises with the closed claw');
 }
 for(const icon of icons)assert.equal((await get(icon)).response.status,200,icon);
 const model=JSON.parse((await get('/crates/balls/model.json')).html);assert.ok(model.elements.some(e=>e.name==='top_outer'));assert.match(html,/Voir la prise au ralenti/);
});


test('crate rewards link only published species while preserving unavailable species as rewards',async()=>{
 const original=dexEntries;try{dexEntries=[...original,{id:'native-giratina',species:'giratina',name:'Giratina',collection:'Classiques',form:'Classique'}];const {html}=await get('/wiki/caisses/');assert.match(html,/Giratina shiny/);assert.match(html,/Kyogre shiny/);assert.match(html,/href="\/wiki\/pokedex\/giratina\/"/);assert.doesNotMatch(html,/href="\/wiki\/pokedex\/kyogre\/"/);assert.match(html,/Comment lire les probabilités/);assert.match(html,/sans garantir un Pokémon précis/);
 }finally{dexEntries=original;}
});
