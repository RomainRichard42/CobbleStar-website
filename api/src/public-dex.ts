import type {FastifyInstance} from 'fastify';
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {ashStarPreview,type StarModel} from './star-assets.js';

export type DexEntry={id:string;species:string;name:string;collection:string;form:string;assetUrl:string};
type Bundled=Omit<DexEntry,'assetUrl'>&{model:string;texture:string;emissive?:string};
const bundled=(JSON.parse(readFileSync(new URL('../dex.catalog.json',import.meta.url),'utf8')) as {entries:Bundled[]}).entries;
export type DexSource={list:()=>Promise<{species:string;revision:number;hasAsh:boolean}[]>;asset:(species:string)=>Promise<StarModel|null>;names:()=>Promise<Map<string,string>>;nativeSpecies:()=>Promise<{species:string;preview:boolean}[]>;nativeKit:(species:string)=>Promise<Buffer>};
export function createPublicDex(source:DexSource){
 const url=(id:string)=>`/api/pokedex/${id}/asset`;
 const shipped=bundled.map(({id,species,name,collection,form})=>({id,species,name,collection,form,assetUrl:url(id)}));
 let cached:{until:number;entries:DexEntry[]}|undefined;
 let pending:Promise<DexEntry[]>|undefined;
 const list=async()=>{
  if(cached&&Date.now()<cached.until)return cached.entries;
  return pending??=(async()=>{
   const [rows,names,native]=await Promise.all([source.list(),source.names(),source.nativeSpecies()]);
   const entries=[...rows.flatMap(row=>['base',...(row.hasAsh&&row.species==='greninja'?['ash']:[])].map(form=>({id:`star-${row.species}-${form}`,species:row.species,name:names.get(row.species)||row.species,collection:'Star',form:form==='ash'?'Sachanobi Star':'Star',assetUrl:url(`star-${row.species}-${form}`)+`?v=${row.revision}`}))),...shipped,...native.map(({species,preview})=>({id:`native-${species}`,species,name:names.get(species)||species,collection:'Classiques',form:'Classique',assetUrl:preview?url(`native-${species}`):''}))];
   cached={until:Date.now()+60_000,entries};return entries;
  })().finally(()=>{pending=undefined;});
 };
 const asset=async(id:string)=>{
  const item=bundled.find(e=>e.id===id);
  if(item){
   const read=(path:string)=>readFileSync(new URL('../'+path,import.meta.url));
   return {species:item.species,model:JSON.parse(read(item.model).toString()),texture:read(item.texture).toString('base64'),...(item.emissive?{emissive:read(item.emissive).toString('base64')}:{} )};
  }
  const normal=/^native-([a-z0-9_]{1,80})$/.exec(id);
  if(normal){
   if(!(await list()).some(e=>e.id===id&&e.assetUrl))return null;
   const species=normal[1]!,zip=await source.nativeKit(species),files=new Map<string,Buffer>();let offset=0;
   while(offset+30<=zip.length&&zip.readUInt32LE(offset)===0x04034b50){const length=zip.readUInt32LE(offset+18),nl=zip.readUInt16LE(offset+26),start=offset+30+nl+zip.readUInt16LE(offset+28);const name=zip.toString('utf8',offset+30,offset+30+nl);if([species+'.geo.json',species+'.png',species+'_glow.png'].includes(name))files.set(name,zip.readUInt16LE(offset+8)===8?inflateRawSync(zip.subarray(start,start+length),{maxOutputLength:8*1024*1024}):zip.subarray(start,start+length));offset=start+length;}
   if(!files.has(species+'.geo.json')||!files.has(species+'.png'))throw new Error('NATIVE_DEX_ASSET_MISSING');
   return {species,model:JSON.parse(files.get(species+'.geo.json')!.toString()),texture:files.get(species+'.png')!.toString('base64'),...(files.has(species+'_glow.png')?{emissive:files.get(species+'_glow.png')!.toString('base64')}:{} )};
  }
  const match=/^star-([a-z0-9_]{1,80})-(base|ash)$/.exec(id);if(!match)return null;
  const published=await source.asset(match[1]!);if(!published)return null;
  if(match[2]==='ash')return published.species==='greninja'&&published.ash?ashStarPreview(published):null;
  // Explicit projection: no drafts, authors, player data or upload metadata.
  return {species:published.species,model:published.model,texture:published.texture,...(published.emissive?{emissive:published.emissive}:{} )};
 };
 return {list,asset};
}
export function registerPublicDex(app:FastifyInstance,dex:ReturnType<typeof createPublicDex>){
 app.get('/api/pokedex',async(_r,reply)=>reply.header('Cache-Control','public,max-age=60').send({entries:await dex.list()}));
 app.get('/api/pokedex/:id/asset',{config:{rateLimit:{max:180,timeWindow:'1 minute'}}},async(r,reply)=>{
  const {id}=r.params as {id:string};
  const asset=await dex.asset(id);
  if(!asset)return reply.header('Cache-Control','no-store').code(404).send({error:'FORM_NOT_PUBLISHED'});
  return reply.header('Cache-Control','public,max-age=60').send({asset});
 });
}
