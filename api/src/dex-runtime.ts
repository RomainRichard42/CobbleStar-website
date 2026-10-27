import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import type {NativeModel} from './star-assets.js';
type Row=NativeModel&{assetKey:string;name:string};
const base=new URL('../dex-runtime/',import.meta.url);
export const dexRuntimeIndex=(JSON.parse(readFileSync(new URL('index.json',base),'utf8')) as {species:Row[]}).species;
const signature=(m:NativeModel)=>JSON.stringify(m.bones.map(b=>[b.name,b.parent??'']).sort((a,b)=>a[0]!.localeCompare(b[0]!)));
// Read-only viewing may resolve a declared provider even when editing is disabled
// due to competing addons. Exact provider, version, hashes and skeleton still match.
export function runtimeRow(n:NativeModel){
 return dexRuntimeIndex.find(t=>t.species===n.species&&t.poser===n.poser&&signature(t)===signature(n)&&
  (!t.source&&!n.source||t.source&&n.source&&(['id','version','modelHash','poserHash'] as const).every(k=>t.source![k]===n.source![k])));
}
const cache=new Map<string,any>();
export async function runtimeAsset(row:Row){
 if(!dexRuntimeIndex.includes(row))throw new Error('UNKNOWN_DEX_SOURCE');
 if(cache.has(row.assetKey)){const value=cache.get(row.assetKey);cache.delete(row.assetKey);cache.set(row.assetKey,value);return value;}
 const value=JSON.parse(gunzipSync(await readFile(new URL(row.assetKey+'.json.gz',base)),{maxOutputLength:16*1024*1024}).toString());
 if(cache.size>=24)cache.delete(cache.keys().next().value!);cache.set(row.assetKey,value);return value;
}
const motions=JSON.parse(gunzipSync(readFileSync(new URL('motions.json.gz',base))).toString());
export function formMotion(id:string){return motions[id];}
