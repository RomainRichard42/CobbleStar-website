import type {RowDataPacket} from 'mysql2/promise';
import {pool} from './db.js';
import {createPublicDex} from './public-dex.js';
import {starTemplates,nativeStarKit,sameSkeleton} from './star-library.js';
import {addonIndex} from './star-addon-templates.js';
import type {NativeModel} from './star-assets.js';
import type {StarModel} from './star-assets.js';
export const publicDex=createPublicDex({
 list:async()=>{const [rows]=await pool.query<RowDataPacket[]>("SELECT species,published_revision,JSON_CONTAINS_PATH(published_json,'one','$.ash') AS has_ash FROM star_models WHERE published_json IS NOT NULL ORDER BY species");return rows.map(r=>({species:r.species,revision:r.published_revision,hasAsh:Boolean(r.has_ash)}));},
 asset:async(species)=>{const [rows]=await pool.execute<RowDataPacket[]>('SELECT published_json FROM star_models WHERE species=? AND published_json IS NOT NULL',[species]);const value=rows[0]?.published_json;return value?(typeof value==='string'?JSON.parse(value):value) as StarModel:null;},
 names:async()=>new Map([...(addonIndex().skipped??[]).map(s=>[s.species,s.name||s.species] as [string,string]),...(await starTemplates()).species.map(s=>[s.species,s.name] as [string,string])]),
 nativeSpecies:async()=>{const [rows]=await pool.query<RowDataPacket[]>('SELECT catalog_json FROM star_catalog WHERE id=1');const value=rows[0]?.catalog_json;const catalog:NativeModel[]=value?(typeof value==='string'?JSON.parse(value):value):[];const templates=(await starTemplates()).species;return catalog.map(n=>{const t=templates.find(t=>t.species===n.species);return {species:n.species,preview:Boolean(t&&sameSkeleton(t,n))};});},
 nativeKit:nativeStarKit,
});
