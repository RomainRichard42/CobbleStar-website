// Offline, administrator-controlled import. Never accepts a client-supplied pack.
// node scripts/export-star-addon-templates.mjs <addon.jar> --permission-confirmed [--species ironvaliant]
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {basename} from 'node:path';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
import {zipAssets,validateStar} from '../api/dist/star-assets.js';

const sha=data=>createHash('sha256').update(data).digest('hex');
export function readJar(bytes){
 const files=new Map();let end=bytes.length-22;
 while(end>=Math.max(0,bytes.length-65557)&&bytes.readUInt32LE(end)!==0x06054b50)end--;
 if(end<0)throw new Error('INVALID_JAR');
 let at=bytes.readUInt32LE(end+16);
 for(let i=0;i<bytes.readUInt16LE(end+10);i++){
  if(bytes.readUInt32LE(at)!==0x02014b50)throw new Error('INVALID_JAR_DIRECTORY');
  const n=bytes.readUInt16LE(at+28),path=bytes.toString('utf8',at+46,at+46+n),size=bytes.readUInt32LE(at+20),local=bytes.readUInt32LE(at+42),method=bytes.readUInt16LE(at+10);
  at+=46+n+bytes.readUInt16LE(at+30)+bytes.readUInt16LE(at+32);
  if(path.endsWith('/'))continue;
  if(files.has(path))throw new Error('DUPLICATE_JAR_ENTRY');
  files.set(path,()=>{
   const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
   if(start+size>bytes.length||![0,8].includes(method))throw new Error('INVALID_JAR_ENTRY');
   return method===8?inflateRawSync(bytes.subarray(start,start+size),{maxOutputLength:8*1024*1024}):bytes.subarray(start,start+size);
  });
 }
 return files;
}
function json(files,path){const get=files.get(path);if(!get)throw new Error(`MISSING_ASSET: ${path}`);return JSON.parse(get().toString());}
function resource(path){if(!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(path)||path.includes('..'))throw new Error('INVALID_RESOURCE_PATH');return 'assets/'+path.replace(':','/');}
function indexResources(files,kind,suffix){
 const result=new Map();
 for(const path of files.keys())if(path.includes(`/bedrock/pokemon/${kind}/`)&&path.endsWith(suffix)){
  const id=kind==='animations'?basename(path,suffix):path.split('/')[1]+':'+basename(path,'.json');
  // Only block species that actually depend on this ambiguous resource.
  result.set(id,result.has(id)?null:path);
 }
 return result;
}
export async function buildAddonKit(files,meta,resolver,name){
 const species=resolver.species.slice(10),base=resolver.variations.find(v=>v.aspects?.length===0&&v.model&&v.poser&&typeof v.texture==='string');
 if(!base)throw new Error('NO_COMPLETE_BASE_VARIATION');
 const models=indexResources(files,'models','.geo.json'),posers=indexResources(files,'posers','.json'),groups=indexResources(files,'animations','.animation.json');
 const modelPath=models.get(base.model),poserPath=posers.get(base.poser);
 if(!modelPath||!poserPath)throw new Error('MODEL_AND_POSER_MUST_BELONG_TO_SAME_ADDON');
 const modelBytes=files.get(modelPath)(),poserBytes=files.get(poserPath)(),model=JSON.parse(modelBytes),geometry=model['minecraft:geometry'][0];
 const source={id:meta.id,name:meta.name??meta.id,version:String(meta.version),modelHash:sha(modelBytes),poserHash:sha(poserBytes)};
 const texture=await sharp(files.get(resource(base.texture))?.()).ensureAlpha().png({palette:false,progressive:false}).toBuffer();
 const bones=geometry.bones.map(({name,parent})=>({name,...(parent?{parent}:{})}));
 // Validate with the proposed native skeleton before installing its trusted kit.
 validateStar({species,model,texture:texture.toString('base64')},{species,poser:base.poser,bones});
 const runtime='runtime/assets/cobblestar_planets/',kit=new Map([[`${species}.geo.json`,modelBytes],[`${species}.png`,texture],['reference/resolver.json',Buffer.from(JSON.stringify(resolver,null,2))],['reference/poser.json',poserBytes]]);
 const pose=JSON.parse(poserBytes),originalPose=JSON.stringify(pose),renames=new Map(),clips=new Map(),warnings=[];
 for(const match of originalPose.matchAll(/q\.bedrock(?:_[a-z_]+)?\(\s*'([a-z0-9_.-]+)'/g))renames.set(match[1],`cobblestar_star_${species}_${match[1]}`);
 for(const match of originalPose.matchAll(/(?<![.\w])bedrock\(\s*([a-z0-9_.-]+)\s*,/g))renames.set(match[1],`cobblestar_star_${species}_${match[1]}`);
 // No guessed runtime fallback: missing animation dependencies block this kit, not the full library.
 for(const [group,id] of renames){
  const path=groups.get(group);if(!path)throw new Error(`ANIMATION_GROUP_MISSING: ${group}`);
  const raw=files.get(path)(),animation=JSON.parse(raw);
  clips.set(group,new Set(Object.keys(animation.animations)));
  animation.animations=Object.fromEntries(Object.entries(animation.animations).map(([key,value])=>{
   // Keep unrelated/unused authoring clips inside this private group unchanged.
   return [key.replace(`animation.${group}.`,`animation.${id}.`),value];
  }));
  kit.set(`reference/animations/${group}.animation.json`,raw);
  kit.set(runtime+`bedrock/pokemon/animations/star/${id}.animation.json`,Buffer.from(JSON.stringify(animation)));
 }
 if(!renames.size)throw new Error('NO_BEDROCK_ANIMATION_GROUP');
 const missingRefs=text=>{
  const refs=[...text.matchAll(/q\.bedrock(?:_[a-z_]+)?\(\s*'([a-z0-9_.-]+)'\s*,\s*'([a-z0-9_.-]+)'/g),...text.matchAll(/(?<![.\w])bedrock\(\s*([a-z0-9_.-]+)\s*,\s*([a-z0-9_.-]+)\s*\)/g)];
  return refs.filter(m=>!clips.get(m[1])?.has(`animation.${m[1]}.${m[2]}`)).map(m=>m[1]+'.'+m[2]);
 };
 // Some addon posers declare generic combat actions absent from their own animation file.
 // Leave those optional actions to Cobblemon's fallback instead of creating broken references.
 for(const [key,value] of Object.entries(pose.animations??{}))if(missingRefs(JSON.stringify(value)).length){delete pose.animations[key];warnings.push(`Optional action ${key} absent in source; native fallback retained.`);}
 for(const value of Object.values(pose.poses??{})){
  if(value.quirks)value.quirks=value.quirks.filter(q=>{const missing=missingRefs(JSON.stringify(q));if(missing.length)warnings.push(`Absent optional quirk: ${missing.join(', ')}`);return !missing.length;});
  const missing=missingRefs(JSON.stringify(value));if(missing.length)throw new Error(`REQUIRED_ANIMATION_MISSING: ${missing.join(', ')}`);
 }
 const replaceValue=value=>typeof value==='string'?value.replace(/(q\.bedrock(?:_[a-z_]+)?\(\s*')([a-z0-9_.-]+)(')/g,(_,a,g,b)=>a+renames.get(g)+b).replace(/(?<![.\w])(bedrock\(\s*)([a-z0-9_.-]+)(\s*,)/g,(_,a,g,b)=>a+renames.get(g)+b):Array.isArray(value)?value.map(replaceValue):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceValue(v)])):value;
 const isolated=replaceValue(pose),poserId=`cobblestar_star_${species}_poser`;
 // Loader otherwise infers root from filename; the isolated filename is deliberately different.
 isolated.rootBone??=geometry.bones.find(b=>b.name===base.poser.split(':')[1])?.name??geometry.bones.find(b=>!b.parent)?.name;
 if(!isolated.rootBone)throw new Error('NO_ROOT_BONE');
 kit.set(runtime+`bedrock/pokemon/posers/star/${poserId}.json`,Buffer.from(JSON.stringify(isolated)));
 const layers=structuredClone(base.layers??[]);let textureIndex=0,glowLayer;
 let glow=await sharp({create:{width:geometry.description.texture_width,height:geometry.description.texture_height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toBuffer();
 const staticGlow=layers.filter(l=>l.emissive&&typeof l.texture==='string');
 if(staticGlow.length===1){
  const raw=files.get(resource(staticGlow[0].texture))?.();if(!raw)throw new Error('LAYER_TEXTURE_MISSING');
  const info=await sharp(raw).metadata();
  if(info.width===geometry.description.texture_width&&info.height===geometry.description.texture_height){glow=await sharp(raw).ensureAlpha().png({palette:false}).toBuffer();glowLayer=staticGlow[0].name;}
 }
 async function layerTexture(ref){
  const path=resource(ref),get=files.get(path);if(!get)throw new Error(`LAYER_TEXTURE_MISSING: ${ref}`);
  const id=`textures/pokemon/star/addons/${species}/layer_${textureIndex++}.png`,raw=get();
  const info=await sharp(raw).metadata();if(info.width>1024||info.height>1024)throw new Error('LAYER_TOO_LARGE');
  kit.set(runtime+id,raw);kit.set('reference/'+id,raw);return 'cobblestar_planets:'+id;
 }
 for(const layer of layers){
  if(typeof layer.texture==='string')layer.texture=await layerTexture(layer.texture);
  else if(Array.isArray(layer.texture?.frames))layer.texture.frames=await Promise.all(layer.texture.frames.map(layerTexture));
  else throw new Error('LAYER_FORMAT_UNSUPPORTED');
 }
 kit.set(`${species}_glow.png`,glow);
 const licensePath=[...files.keys()].find(p=>/^licen[sc]e(?:\.txt)?$/i.test(p));
 if(!licensePath)throw new Error('LICENSE_FILE_REQUIRED');
 kit.set('licenses/Addon.txt',files.get(licensePath)());
 const row={species,name:name??species,poser:base.poser,bones,source,license:Array.isArray(meta.license)?meta.license.join(', '):meta.license??'See attached license'};
 kit.set('addon.json',Buffer.from(JSON.stringify({species,source,poser:'cobblestar_planets:'+poserId,layers,glowLayer,warnings})));
 kit.set('README.txt',Buffer.from(`${name??species} - kit Star addon\nSource: ${source.name} ${source.version}\nLicence: ${row.license} (jointe). Autorisation de modification/distribution confirmee par l'administrateur.\n\nOuvrir ${species}.geo.json dans Blockbench et importer ${species}.png.\nGarder les noms et parents des os. Le PNG _glow contient ${glowLayer?'le calque lumineux natif a recolorer':'un calque transparent facultatif'}.\nImporter ces trois fichiers dans Admin > Pokemon Star, enregistrer, puis publier.\nNe pas importer les fichiers reference/runtime comme modele. Ils conservent le poser, les animations et les calques de la meme source.\nLes animations sont isolees par le site lors de la publication.\nCe kit ne cree pas de Star tant que tu n'as pas publie une variante.\n`));
 return {row,zip:zipAssets(kit)};
}

async function main(){
 const args=process.argv.slice(2);
 if(!args.includes('--permission-confirmed'))throw new Error('Confirm modification/distribution permission using --permission-confirmed before exporting addon assets.');
 const jar=readFileSync(args[0]),files=readJar(jar),meta=json(files,'fabric.mod.json');
 if(meta.id==='cobblemon')throw new Error('Use export-star-templates.mjs for official assets');
 const native=JSON.parse(readFileSync(new URL('../api/star-templates/index.json',import.meta.url))),official=new Set(native.species.map(t=>t.species));
 const output=new URL('../api/star-addon-templates/',import.meta.url);mkdirSync(output,{recursive:true});
 const indexPath=new URL('index.json',output),old=existsSync(indexPath)?JSON.parse(readFileSync(indexPath)):{species:[]};
 const only=args.includes('--species')?args[args.indexOf('--species')+1]:undefined;
 // Reimport replaces this provider's rows, not other addons or official templates.
 const rows=new Map(old.species.filter(t=>t.source.id!==meta.id||(only&&t.species!==only)).map(t=>[t.species,t])),skipped=[],seen=new Set();
 let lang={};
 if(args.includes('--cobblemon')){
  const baseFiles=readJar(readFileSync(args[args.indexOf('--cobblemon')+1]));
  Object.assign(lang,json(baseFiles,'assets/cobblemon/lang/fr_fr.json'));
 }
 for(const path of files.keys())if(path.endsWith('/lang/fr_fr.json'))Object.assign(lang,json(files,path));
 for(const path of [...files.keys()].sort()){
  if(!path.includes('/bedrock/pokemon/resolvers/')||!path.endsWith('.json'))continue;
  let species;
  try {
   const resolver=json(files,path);if(resolver.order!==0||!/^cobblemon:[a-z0-9_]{1,80}$/.test(resolver.species))continue;
   species=resolver.species.slice(10);if(official.has(species)||seen.has(species)||only&&only!==species)continue;seen.add(species);
   if(rows.has(species))throw new Error('SPECIES_ALREADY_PROVIDED_BY_ANOTHER_ADDON');
   const result=await buildAddonKit(files,meta,resolver,lang[`cobblemon.species.${species}.name`]);
   const target=new URL(`${species}.zip`,output),temp=new URL(`${species}.zip.tmp`,output);writeFileSync(temp,result.zip);renameSync(temp,target);rows.set(species,result.row);
  }catch(error){skipped.push({species:species??path,name:lang[`cobblemon.species.${species}.name`]??species,reason:error.issues?'MODEL_EXCEEDS_STUDIO_LIMITS':error.message});}
 }
 const index={version:1,species:[...rows.values()].sort((a,b)=>a.species.localeCompare(b.species)),skipped};
 const temp=new URL('index.json.tmp',output);writeFileSync(temp,JSON.stringify(index));renameSync(temp,indexPath);
 console.log(JSON.stringify({provider:meta.name,templates:index.species.length,skippedCount:skipped.length,skipped:skipped.slice(0,10)},null,2));
 if(only&&!rows.has(only))process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
