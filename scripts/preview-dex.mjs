// Loopback-only real public assets, without database access or mutation endpoints.
import Fastify from '../api/node_modules/fastify/fastify.js';
import staticFiles from '../api/node_modules/@fastify/static/index.js';
import helmet from '../api/node_modules/@fastify/helmet/index.js';
import {resolve} from 'node:path';
import {registerPublicSite} from '../api/dist/public-site.js';
import {siteSecurity} from '../api/dist/site-security.js';
import {createPublicDex,registerPublicDex} from '../api/dist/public-dex.js';
import {dexRuntimeIndex,runtimeAsset,formMotion} from '../api/dist/dex-runtime.js';
const published=await fetch('https://cobblestar-mc.fr/api/pokedex').then(r=>r.json());
const rows=new Map(dexRuntimeIndex.map(r=>[r.species,r]));
// Prefer the official model in this isolated preview; production checks server metadata.
for(const r of dexRuntimeIndex)if(!r.source)rows.set(r.species,r);
const nativeAsset=async s=>runtimeAsset(rows.get(s));
const dex=createPublicDex({list:async()=>published.entries.filter(e=>e.collection==='Star'&&e.id.endsWith('-base')).map(e=>({species:e.species,revision:1,hasAsh:published.entries.some(a=>a.id==='star-'+e.species+'-ash')})),asset:async s=>{const r=await fetch('https://cobblestar-mc.fr/api/pokedex/star-'+s+'-base/asset');return r.ok?(await r.json()).asset:null;},names:async()=>new Map([...rows].map(([s,r])=>[s,r.name])),nativeSpecies:async()=>published.entries.filter(e=>e.collection==='Classiques').map(e=>({species:e.species,preview:rows.has(e.species)})),nativeKit:async()=>{throw Error('unused');},nativeAsset,motion:async(id,s)=>formMotion(id)??(await nativeAsset(s)).motion});
const app=Fastify();await app.register(helmet,siteSecurity);
registerPublicDex(app,dex);
const content=async kind=>fetch('https://cobblestar-mc.fr/api/'+kind).then(r=>r.json());
app.get('/api/wiki',()=>content('wiki'));
registerPublicSite(app,{getWiki:()=>content('wiki'),getNews:()=>content('news'),getDex:dex.list,getDexInfo:dex.info});
await app.register(staticFiles,{root:resolve('out')});
await app.listen({host:'127.0.0.1',port:8794});
console.log('Pokédex preview: http://127.0.0.1:8794/wiki/pokedex/');
