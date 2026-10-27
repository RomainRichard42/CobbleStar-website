import type {RowDataPacket} from 'mysql2/promise';
import {pool} from './db.js';
import {createPublicDex} from './public-dex.js';
import {starTemplates,nativeStarKit} from './star-library.js';
import {dexRuntimeIndex,runtimeRow,runtimeAsset,formMotion} from './dex-runtime.js';
import {addonIndex} from './star-addon-templates.js';
import type {NativeModel} from './star-assets.js';
import type {StarModel} from './star-assets.js';
let catalogCache:{until:number;value:Promise<NativeModel[]>}|undefined;
async function catalog():Promise<NativeModel[]>{
 if(catalogCache&&catalogCache.until>Date.now())return catalogCache.value;
 const value=(async()=>{const [rows]=await pool.query<RowDataPacket[]>('SELECT catalog_json FROM star_catalog WHERE id=1');const value=rows[0]?.catalog_json;return value?(typeof value==='string'?JSON.parse(value):value):[];})().catch(e=>{catalogCache=undefined;throw e;});
 catalogCache={until:Date.now()+60_000,value};return value;
}
async function nativeAsset(species:string){const n=(await catalog()).find(n=>n.species===species),row=n&&runtimeRow(n);return row?runtimeAsset(row):null;}
export const publicDex=createPublicDex({
 list:async()=>{const [rows]=await pool.query<RowDataPacket[]>("SELECT species,published_revision,JSON_CONTAINS_PATH(published_json,'one','$.ash') AS has_ash FROM star_models WHERE published_json IS NOT NULL ORDER BY species");return rows.map(r=>({species:r.species,revision:r.published_revision,hasAsh:Boolean(r.has_ash)}));},
 asset:async(species)=>{const [rows]=await pool.execute<RowDataPacket[]>('SELECT published_json FROM star_models WHERE species=? AND published_json IS NOT NULL',[species]);const value=rows[0]?.published_json;return value?(typeof value==='string'?JSON.parse(value):value) as StarModel:null;},
 names:async()=>new Map([...(addonIndex().skipped??[]).map(s=>[s.species,s.name||s.species] as [string,string]),...(await starTemplates()).species.map(s=>[s.species,s.name] as [string,string]),...dexRuntimeIndex.map(s=>[s.species,s.name] as [string,string])]),
 nativeSpecies:async()=>(await catalog()).map(n=>({species:n.species,preview:Boolean(runtimeRow(n))})),
 nativeAsset,
 motion:async(id,species)=>formMotion(id)??(await nativeAsset(species))?.motion,
 nativeKit:nativeStarKit,
});
