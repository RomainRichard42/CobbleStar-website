import { z } from "zod";
import { deflateRawSync, inflateSync, inflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import {addonSource,addonTemplate,sameSource,type AddonSource} from './star-addon-templates.js';

const vector = z.tuple([z.number().finite().min(-512).max(512), z.number().finite().min(-512).max(512), z.number().finite().min(-512).max(512)]);
const name = z.string().regex(/^[a-zA-Z0-9_.-]{1,80}$/);
// Native Cobblemon 1.8 Cinderace uses -6.75; preserve native shrinking cubes.
const inflation = z.number().finite().min(-8).max(2);
const cube = z.object({ origin: vector, size: vector, uv: z.union([z.tuple([z.number(), z.number()]), z.record(z.string(), z.object({ uv: z.tuple([z.number(), z.number()]), uv_size: z.tuple([z.number(), z.number()]) }))]), pivot: vector.optional(), rotation: vector.optional(), inflate: inflation.optional(), mirror: z.boolean().optional() }).strict();
export const starModel = z.object({
 species: z.string().regex(/^[a-z0-9_]{1,80}$/),
 model: z.object({ format_version: z.string().max(20), "minecraft:geometry": z.array(z.object({
  description: z.object({ identifier: z.string().max(100), texture_width: z.number().int().min(1).max(1024), texture_height: z.number().int().min(1).max(1024), visible_bounds_width: z.number().min(0).max(32).optional(), visible_bounds_height: z.number().min(0).max(32).optional(), visible_bounds_offset: vector.optional() }).strict(),
  bones: z.array(z.object({ name, parent: name.optional(), pivot: vector.optional(), rotation: vector.optional(), mirror: z.boolean().optional(), inflate: inflation.optional(), cubes: z.array(cube).max(1024).optional(), locators: z.record(z.string(), z.union([vector,z.object({ offset: vector, rotation: vector.optional() })])).optional() }).strict()).min(1).max(256),
 }).strict()).length(1) }).strict(),
 texture: z.string().max(3_000_000), emissive: z.string().max(3_000_000).optional(),
 templateSource:addonSource.optional(),
 // Sacha is a form of Greninja, never a separate spawnable species.
 ash: z.object({texture:z.string().max(3_000_000),emissive:z.string().max(3_000_000).optional()}).strict().optional(),
}).strict();
export type StarModel = z.infer<typeof starModel>;
export type NativeModel = { species: string; poser: string; bones: { name: string; parent?: string }[];source?:AddonSource };
export function ashStarPreview(asset:StarModel) {
 if(asset.species!=="greninja"||!asset.ash)throw new Error("ASH_STAR_NOT_CONFIGURED");
 const model=JSON.parse(readFileSync(new URL("../star-layers/ashgreninja/ashgreninja.geo.json",import.meta.url),"utf8"));
 return {species:"greninja",model,...asset.ash};
}
type NativeGeometry = { model: StarModel["model"]; reference: string; poser: string; sources: Map<string,Buffer> };
const nativeGeometries = new Map<string, NativeGeometry | null>();
/** Read only our bundled, exporter-generated native kits; never an uploaded ZIP. */
function nativeGeometry(species: string): NativeGeometry | null {
 if(nativeGeometries.has(species))return nativeGeometries.get(species)!;
 let zip:Buffer;
 try{zip=readFileSync(new URL(`../star-templates/${species}.zip`,import.meta.url));}
 catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;nativeGeometries.set(species,null);return null;}
 const entries=new Map<string,Buffer>();
 let offset=0;
 while(offset+30<=zip.length&&zip.readUInt32LE(offset)===0x04034b50){
  const method=zip.readUInt16LE(offset+8),compressed=zip.readUInt32LE(offset+18),nameLength=zip.readUInt16LE(offset+26);
  const start=offset+30+nameLength+zip.readUInt16LE(offset+28),end=start+compressed;
  if(end>zip.length)throw new Error("NATIVE_TEMPLATE_TRUNCATED");
  const name=zip.toString("utf8",offset+30,offset+30+nameLength);
  if(name===`${species}.geo.json`||name==="reference/resolver.json"||(species==="kingambit"&&["reference/posers/0983_kingambit/kingambit.json","reference/animations/0983_kingambit/kingambit.animation.json"].includes(name))){
   if(![0,8].includes(method))throw new Error("NATIVE_TEMPLATE_COMPRESSION");
   const bytes=method===8?inflateRawSync(zip.subarray(start,end),{maxOutputLength:8*1024*1024}):zip.subarray(start,end);
   if(crc32(bytes)!==zip.readUInt32LE(offset+14))throw new Error("NATIVE_TEMPLATE_CHECKSUM");
   entries.set(name,bytes);
  }
  offset=end;
 }
 const geometry=entries.get(`${species}.geo.json`),resolver=entries.get("reference/resolver.json");
 if(!geometry||!resolver)throw new Error("NATIVE_TEMPLATE_ASSETS_MISSING");
 const definition=JSON.parse(resolver.toString());
 const base=definition.variations.find((v:{aspects?:string[];model?:string;poser?:string})=>v.aspects?.length===0&&v.model&&v.poser);
 if(definition.species!==`cobblemon:${species}`||!base||!/^cobblemon:[a-z0-9_./-]+$/.test(base.model)||!/^cobblemon:[a-z0-9_./-]+$/.test(base.poser))throw new Error("NATIVE_TEMPLATE_REFERENCE_INVALID");
 const result={model:JSON.parse(geometry.toString()),reference:base.model,poser:base.poser,sources:entries};
 nativeGeometries.set(species,result);return result;
}
/** CCC overrides the native Kingambit model AND the global animation group.
 * Keep this official rig self-contained; namespace alone does not isolate animations:
 * Cobblemon indexes those by the basename of the .animation.json file.
 * Only bundled trusted animations are used, never code supplied by an upload.
 */
function isolatedKingambitRig(files:Map<string,Buffer>):string {
 const source=nativeGeometry("kingambit");
 const poser=source?.sources.get("reference/posers/0983_kingambit/kingambit.json");
 const animation=source?.sources.get("reference/animations/0983_kingambit/kingambit.animation.json");
 if(!poser||!animation)throw new Error("KINGAMBIT_OFFICIAL_RIG_MISSING");
 const id="cobblestar_kingambit_official",root="assets/cobblestar_planets/bedrock/pokemon/";
 // Preserve every pose, quirk and numeric animation keyframe. Rename group references only.
 const poseText=poser.toString().replace(/(')kingambit(')/g,`$1${id}$2`);
 const group=JSON.parse(animation.toString());
 group.animations=Object.fromEntries(Object.entries(group.animations).map(([key,value])=>{
  if(!key.startsWith("animation.kingambit."))throw new Error("KINGAMBIT_ANIMATION_PREFIX_INVALID");
  return [key.replace("animation.kingambit.",`animation.${id}.`),value];
 }));
 files.set(root+`posers/star/${id}.json`,Buffer.from(poseText));
 files.set(root+`animations/star/${id}.animation.json`,Buffer.from(JSON.stringify(group)));
 return `cobblestar_planets:${id}`;
}
function nativeRecolorReference(asset: StarModel,native:NativeModel): string | undefined {
 const baseline=nativeGeometry(asset.species);
 if(!baseline||baseline.poser!==native.poser)return undefined;
 const candidate=structuredClone(asset.model);
 // Blockbench may rename the geometry identifier on export without changing any bones.
 candidate["minecraft:geometry"][0]!.description.identifier=baseline.model["minecraft:geometry"][0]!.description.identifier;
 return isDeepStrictEqual(candidate,baseline.model)?baseline.reference:undefined;
}
function png(encoded: string, width: number, height: number) {
 if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("PNG_BASE64_INVALID");
 const bytes = Buffer.from(encoded,"base64");
 if (bytes.length > 2_000_000 || bytes.length < 33 || bytes.subarray(0,8).toString("hex") !== "89504e470d0a1a0a" || bytes.toString("ascii",12,16)!=="IHDR" || bytes.readUInt32BE(16)!==width || bytes.readUInt32BE(20)!==height) throw new Error("PNG_DIMENSIONS_OR_FORMAT_INVALID");
 if(bytes[24]!==8||![2,6].includes(bytes[25]!)||bytes[26]!==0||bytes[27]!==0||bytes[28]!==0)throw new Error("EXPORT_PNG_8BIT_RGB_OR_RGBA_NON_INTERLACED");
 let offset=8,ended=false;const compressed:Buffer[]=[];
 while(offset+12<=bytes.length){const length=bytes.readUInt32BE(offset),end=offset+12+length;if(end>bytes.length)throw new Error("PNG_TRUNCATED");const type=bytes.toString("ascii",offset+4,offset+8);if(crc32(bytes.subarray(offset+4,offset+8+length))!==bytes.readUInt32BE(offset+8+length))throw new Error("PNG_CHECKSUM_INVALID");if(type==="IDAT")compressed.push(bytes.subarray(offset+8,offset+8+length));offset=end;if(type==="IEND"){ended=true;break;}}
 const expected=(width*(bytes[25]===6?4:3)+1)*height;
 if(!ended||offset!==bytes.length||!compressed.length||inflateSync(Buffer.concat(compressed),{maxOutputLength:expected}).length!==expected)throw new Error("PNG_PIXELS_INVALID");
 return bytes;
}
export function validateStar(value: unknown, native: NativeModel): StarModel {
 const asset=starModel.parse(value), geometry=asset.model["minecraft:geometry"][0]!;
 if(native.species!==asset.species || !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(native.poser)||native.poser.includes('..'))throw new Error("UNKNOWN_NATIVE_SPECIES");
 if(native.source){
  const template=addonTemplate(asset.species);
  if(!template)throw new Error('ADDON_KIT_REQUIRED');
  if(!sameSource(template.row.source,native.source)||asset.templateSource&&!sameSource(asset.templateSource,template.row.source))throw new Error('ADDON_KIT_SERVER_VERSION_MISMATCH');
  asset.templateSource=template.row.source;
 }else if(asset.templateSource)throw new Error('ADDON_KIT_SERVER_VERSION_MISMATCH');
 const byName=new Map(geometry.bones.map(b=>[b.name,b]));
 if(byName.size!==geometry.bones.length)throw new Error("DUPLICATE_BONE");
 if(geometry.bones.reduce((n,b)=>n+(b.cubes?.length??0),0)>2048)throw new Error("TOO_MANY_CUBES");
 for(const bone of geometry.bones){const seen=new Set<string>([bone.name]);let parent=bone.parent;while(parent){if(seen.has(parent)||!byName.has(parent))throw new Error("INVALID_BONE_HIERARCHY");seen.add(parent);parent=byName.get(parent)!.parent;}}
 // This species uses a bundled official rig, independent of addon catalog overrides.
 const requiredBones=asset.species==="kingambit"?nativeGeometry("kingambit")?.model["minecraft:geometry"][0]!.bones:native.bones;
 if(!requiredBones)throw new Error("KINGAMBIT_OFFICIAL_RIG_MISSING");
 for(const bone of requiredBones){const candidate=byName.get(bone.name);if(!candidate || (candidate.parent??"")!==(bone.parent??""))throw new Error("PRESERVE_NATIVE_BONES_AND_PARENTS: "+bone.name);}
 png(asset.texture,geometry.description.texture_width,geometry.description.texture_height);
 if(asset.emissive)png(asset.emissive,geometry.description.texture_width,geometry.description.texture_height);
 if(asset.ash){
  if(asset.species!=="greninja")throw new Error("ASH_REQUIRES_GRENINJA");
  png(asset.ash.texture,130,92);if(asset.ash.emissive)png(asset.ash.emissive,130,92);
 }
 return asset;
}
function crc32(bytes: Buffer){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
/** Deterministic, bounded ZIP. Paths are generated here, never taken from uploads. */
export function zipAssets(files: Map<string,Buffer>) {
 const local: Buffer[]=[], central: Buffer[]=[];let offset=0,total=0;
 for(const [path,data] of files){total+=data.length;if(total>64*1024*1024)throw new Error("PACK_EXCEEDS_64_MIB");
  const file=Buffer.from(path), compressed=deflateRawSync(data), crc=crc32(data);
  const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(8,8);head.writeUInt16LE(33,12);head.writeUInt32LE(crc,14);head.writeUInt32LE(compressed.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(file.length,26);
  const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(8,10);entry.writeUInt16LE(33,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(compressed.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(file.length,28);entry.writeUInt32LE(offset,42);
  local.push(head,file,compressed);central.push(entry,file);offset+=head.length+file.length+compressed.length;
 }
 const directory=Buffer.concat(central), end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.size,8);end.writeUInt16LE(files.size,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...local,directory,end]);
}
export function buildStarPack(assets: StarModel[], catalog: NativeModel[]) {
 const files=new Map<string,Buffer>();files.set("pack.mcmeta",Buffer.from(JSON.stringify({pack:{pack_format:34,description:"CobbleStar · Pokémon Star"}})));
 files.set("licenses/Cobblemon.txt",readFileSync(new URL("../licenses/Cobblemon.txt",import.meta.url)));
 files.set("licenses/NOTICE.txt",Buffer.from("Native Pokemon geometry and base assets: Cobblemon team, Cobblemon 1.8.0. https://gitlab.com/cable-mc/cobblemon\nStar variants are modified adaptations supplied by CobbleStar administrators. Kingambit includes official animations and poser with isolated identifiers to prevent addon collisions. Other native animations remain in Cobblemon. Original asset license included as Cobblemon.txt.\n"));
 for(const input of [...assets].sort((a,b)=>a.species.localeCompare(b.species))){
  const native=catalog.find(n=>n.species===input.species);if(!native)throw new Error("SPECIES_NOT_IN_SERVER_CATALOG");
  const asset=validateStar(input,native), id="star_"+asset.species, root="assets/cobblestar_planets/";
  // Kingambit must not reuse native IDs: CCC replaces their geometry, UVs and poser.
  const addon=native.source?addonTemplate(asset.species):undefined;
  if(addon)for(const [path,data] of addon.files){if(files.has(path))throw new Error('ADDON_RESOURCE_COLLISION');files.set(path,data);}
  if(addon){
   for(const [path,data] of addon.entries)if(/^licenses\/[a-zA-Z0-9_.-]+\.txt$/.test(path))files.set(`licenses/addons/${asset.species}/${path.slice(9)}`,data);
   files.set(`licenses/addons/${asset.species}/SOURCE.json`,Buffer.from(JSON.stringify(addon.row.source,null,2)));
  }
  const isolated=asset.species==="kingambit";
  const nativeReference=isolated||addon?undefined:nativeRecolorReference(asset,native);
  const poserReference=addon?.poser??(isolated?isolatedKingambitRig(files):native.poser);
  if(!nativeReference){
   const geometry=structuredClone(asset.model);geometry["minecraft:geometry"][0]!.description.identifier="geometry."+id;
   files.set(root+`bedrock/pokemon/models/star/${id}.geo.json`,Buffer.from(JSON.stringify(geometry)));
  }
  files.set(root+`textures/pokemon/star/${id}.png`,Buffer.from(asset.texture,"base64"));
  const layers=addon?structuredClone(addon.layers):[];
  if(asset.emissive){
   files.set(root+`textures/pokemon/star/${id}_glow.png`,Buffer.from(asset.emissive,"base64"));
   // Chimchar's supplied glow includes the recolored flame. Override the native
   // layer by its exact name, or its orange pixels would cover the blue flame.
   const glowName=addon?.glowLayer??(asset.species==="chimchar"?"emissive":"star_glow");
   const inherited=layers.findIndex(layer=>layer.name===glowName);if(inherited>=0)layers.splice(inherited,1);
   layers.push({name:glowName,texture:`cobblestar_planets:textures/pokemon/star/${id}_glow.png`,emissive:true,...(asset.species==="chimchar"?{translucent:true}:{})});
  }
  if(asset.species==="charmander"){
   // Cobblemon merges layers by name: replace "flame", not an additional orange+blue overlay.
   // Star resolver only; normal and shiny Charmander keep their native animation.
   const frames=[];
   for(let frame=1;frame<=4;frame++){
    const bytes=readFileSync(new URL(`../star-layers/charmander/flame${frame}.png`,import.meta.url));
    png(bytes.toString("base64"),64,64);
    const path=`textures/pokemon/star/${id}_flame${frame}.png`;
    files.set(root+path,bytes);frames.push(`cobblestar_planets:${path}`);
   }
   layers.push({name:"flame",texture:{frames,fps:10,loop:true},emissive:true,translucent:true});
  }
  files.set(root+`bedrock/pokemon/resolvers/star/${id}.json`,Buffer.from(JSON.stringify({species:"cobblemon:"+asset.species,order:10000,variations:[{aspects:["cobblestar-star"],poser:poserReference,model:nativeReference??`cobblestar_planets:${id}.geo`,texture:`cobblestar_planets:textures/pokemon/star/${id}.png`,layers}]})));
  if(asset.ash){
   const variation=JSON.parse(readFileSync(new URL("../star-layers/ashgreninja/resolver.json",import.meta.url),"utf8")).variations.find((v:{aspects:string[]})=>v.aspects.length===1&&v.aspects[0]==="ash");
   if(variation?.model!=="cobblemon:ashgreninja.geo"||variation?.poser!=="cobblemon:ashgreninja")throw new Error("ASH_NATIVE_REFERENCE_INVALID");
   variation.aspects=["ash","cobblestar-star"];
   variation.texture="cobblestar_planets:textures/pokemon/star/star_ashgreninja.png";
   files.set(root+"textures/pokemon/star/star_ashgreninja.png",Buffer.from(asset.ash.texture,"base64"));
   // Override base Star glow by the SAME name: its 128x64 UVs must not leak onto Ash.
   const glow=asset.ash.emissive??Buffer.from(readFileSync(new URL("../star-layers/ashgreninja/blank.png",import.meta.url))).toString("base64");
   files.set(root+"textures/pokemon/star/star_ashgreninja_glow.png",Buffer.from(glow,"base64"));
   variation.layers.push({name:"star_glow",texture:"cobblestar_planets:textures/pokemon/star/star_ashgreninja_glow.png",emissive:true});
   files.set(root+"bedrock/pokemon/resolvers/star/star_ashgreninja.json",Buffer.from(JSON.stringify({species:"cobblemon:greninja",order:10001,variations:[variation]})));
   files.set("licenses/CCC-Sachanobi.txt",readFileSync(new URL("../star-layers/ashgreninja/LICENSE-CCC.txt",import.meta.url)));
  }
 }
 return zipAssets(files);
}
