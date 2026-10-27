import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import type {DexEntry} from './public-dex.js';
import {formMotion} from './dex-runtime.js';
const base=new URL('../dex-info/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('sources.json',base),'utf8')) as {checkedAt:string;species:string[]};
const cache=new Map<string,Record<string,any>>();
export async function dexInfo(entry:DexEntry){
 if(!manifest.species.includes(entry.species))return null;
 let forms=cache.get(entry.species);
 if(!forms){forms=JSON.parse(gunzipSync(await readFile(new URL(entry.species+'.json.gz',base)),{maxOutputLength:4*1024*1024}).toString());if(cache.size>=32)cache.delete(cache.keys().next().value!);cache.set(entry.species,forms!);}
 const aspects=formMotion(entry.id)?.aspects?.filter((a:string)=>a.startsWith('cobblestar_'))??[];
 const regional=aspects.length?Object.values(forms!).find(f=>aspects.every((a:string)=>f.aspects.includes(a))):null;
 const data=entry.id==='star-greninja-ash'?forms!.ash:regional??forms!.base;
 if(!data)return null;
 const cosmetic=entry.collection==='Star'||entry.collection==='Alliance';
 return {...data,checkedAt:manifest.checkedAt,collection:entry.collection,appearance:entry.form,
  ...(cosmetic?{spawns:[],acquisition:'Cette apparence est une collection CobbleStar. Elle ne s’obtient pas par une rencontre sauvage classique. Consulte les collections et les machines à jetons pour les offres publiées.',baseLocationId:'native-'+entry.species}:{}),
  ...(data.labels.includes('admin_only')?{spawns:[],acquisition:'Création réservée à l’administration. Elle ne fait pas partie des Pokémon capturables par les joueurs.'}:{}),
  locationNote:'Conditions extraites des packs installés, vérifiées le '+manifest.checkedAt.split('-').reverse().join('/')+'. Les apparitions placées manuellement et les événements temporaires ne sont pas recensés ici. Les catégories de rareté ne sont pas des pourcentages de capture.'};
}
