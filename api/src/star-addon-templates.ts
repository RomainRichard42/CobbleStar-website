import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {z} from 'zod';

export const addonSource=z.object({id:z.string().regex(/^[a-z0-9_.-]{1,128}$/),name:z.string().max(200),version:z.string().max(128),modelHash:z.string().regex(/^[a-f0-9]{64}$/),poserHash:z.string().regex(/^[a-f0-9]{64}$/),conflict:z.boolean().optional()}).strict();
export type AddonSource=z.infer<typeof addonSource>;
export type AddonRow={species:string;name:string;poser:string;bones:{name:string;parent?:string}[];source:AddonSource;license:string};
type AddonIndex={species:AddonRow[];skipped?:{species:string;name?:string;reason:string}[]};
let index:AddonIndex|undefined;
export function addonIndex():AddonIndex {
 if(index)return index;
 try {index=JSON.parse(readFileSync(new URL('../star-addon-templates/index.json',import.meta.url),'utf8'));}
 catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;index={species:[]};}
 return index!;
}
export function sameSource(a?:AddonSource,b?:AddonSource):boolean {
 return !a&&!b||!!a&&!!b&&!a.conflict&&!b.conflict&&a.id===b.id&&a.version===b.version&&a.modelHash===b.modelHash&&a.poserHash===b.poserHash;
}
/** Trusted local exporter output only. This is NOT an uploaded ZIP parser. */
export function addonKit(species:string):Buffer|undefined {
 if(!addonIndex().species.some(t=>t.species===species))return undefined;
 if(!/^[a-z0-9_]{1,80}$/.test(species))throw new Error('INVALID_SPECIES');
 return readFileSync(new URL(`../star-addon-templates/${species}.zip`,import.meta.url));
}
function unpack(zip:Buffer):Map<string,Buffer>{
 const entries=new Map<string,Buffer>();let at=0,total=0;
 while(at+30<=zip.length&&zip.readUInt32LE(at)===0x04034b50){
  const length=zip.readUInt16LE(at+26),size=zip.readUInt32LE(at+18),start=at+30+length+zip.readUInt16LE(at+28),end=start+size;
  if(end>zip.length||zip.readUInt16LE(at+8)!==8)throw new Error('ADDON_KIT_INVALID');
  const path=zip.toString('utf8',at+30,at+30+length),data=inflateRawSync(zip.subarray(start,end),{maxOutputLength:8*1024*1024});
  total+=data.length;if(total>24*1024*1024||entries.has(path))throw new Error('ADDON_KIT_INVALID');
  entries.set(path,data);at=end;
 }
 return entries;
}
const loaded=new Map<string,ReturnType<typeof readTemplate>>();
function readTemplate(species:string){
 const row=addonIndex().species.find(t=>t.species===species),zip=addonKit(species);
 if(!row||!zip)return undefined;
 const entries=unpack(zip),descriptor=JSON.parse(entries.get('addon.json')!.toString());
 if(descriptor.species!==species||!sameSource(row.source,descriptor.source))throw new Error('ADDON_KIT_SOURCE_MISMATCH');
 const files=new Map<string,Buffer>();
 for(const [path,data] of entries)if(path.startsWith('runtime/')){
  const target=path.slice(8);
  if(!target.startsWith('assets/cobblestar_planets/')||target.includes('..')||!/^assets\/[a-z0-9_./-]+\.(json|png)$/.test(target))throw new Error('ADDON_KIT_PATH_INVALID');
  files.set(target,data);
 }
 return {row,entries,files,poser:descriptor.poser as string,layers:(descriptor.layers??[]) as {name:string;texture:unknown;emissive?:boolean;translucent?:boolean}[],glowLayer:descriptor.glowLayer as string|undefined};
}
export function addonTemplate(species:string){if(!loaded.has(species))loaded.set(species,readTemplate(species));return loaded.get(species);}
