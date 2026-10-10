import { z } from "zod";
import { deflateRawSync, inflateSync, inflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import {addonSource,addonTemplate,sameSource,type AddonSource} from './star-addon-templates.js';
import {appendRankTags} from './rank-tags.js';
import {appendEventPokemonAssets} from './event-pokemon-assets.js';

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
export function png(encoded: string, width: number, height: number) {
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
export function buildStarPack(assets: StarModel[], catalog: NativeModel[], npcSkins: {hash:string;png:Buffer}[] = []) {
 const files=new Map<string,Buffer>();files.set("pack.mcmeta",Buffer.from(JSON.stringify({pack:{pack_format:34,description:"CobbleStar · Pokémon Star"}})));
 // Articulated quest-NPC geometry and preset motion are pack resources too.
 const npcStudio=JSON.parse(readFileSync(new URL("../npc-studio-assets/manifest.json",import.meta.url),"utf8")) as {files:string[]};
 const npcPaths=new Set(["assets/cobblestar_planets/models/entity/quest_npc_rig.json","assets/cobblestar_planets/npc_studio/presets.json"]);
 if(npcStudio.files.length!==npcPaths.size||new Set(npcStudio.files).size!==npcPaths.size)throw new Error("INVALID_NPC_STUDIO_MANIFEST");
 for(const path of npcStudio.files){
  if(!npcPaths.has(path))throw new Error("INVALID_NPC_STUDIO_PATH");
  const bytes=readFileSync(new URL("../npc-studio-assets/"+path,import.meta.url));
  if(bytes.length>131072||JSON.parse(bytes.toString()).version!==1)throw new Error("INVALID_NPC_STUDIO_ASSET");
  files.set(path,bytes);
 }
 for(const skin of [...npcSkins].sort((a,b)=>a.hash.localeCompare(b.hash))){
  if(!/^[a-f0-9]{64}$/.test(skin.hash))throw new Error('INVALID_NPC_SKIN_HASH');
  files.set(`assets/cobblestar_planets/textures/entity/quest_npc/upload/${skin.hash}.png`,png(skin.png.toString('base64'),64,64));
 }
 // Shared cosmetics are shipped even when no species has been published yet.
 // Original admin-only Allodus cosmetics, never server definitions or scripts.
 const allodus=JSON.parse(readFileSync(new URL("../allodus-assets/manifest.json",import.meta.url),"utf8")) as {version:number;files:string[]};
 const allodusPaths=new Set([
  "assets/cobblestar_planets/bedrock/pokemon/models/allodus/allodus.geo.json",
  "assets/cobblestar_planets/bedrock/pokemon/animations/allodus/allodus.animation.json",
  "assets/cobblestar_planets/bedrock/pokemon/posers/allodus/allodus.json",
  "assets/cobblestar_planets/bedrock/pokemon/resolvers/allodus/0_allodus_base.json",
  "assets/cobblestar_planets/bedrock/particles/allodus/allodus_burst.particle.json",
  "assets/cobblestar_planets/textures/particles/allodus_star.png",
  "assets/cobblestar_planets/allodus/sounds.json",
  ...["allodus","allodus_glow"].map(n=>`assets/cobblestar_planets/textures/pokemon/allodus/${n}.png`),
  ...["fr_fr","en_us"].map(n=>`assets/cobblestar_planets/allodus/lang/${n}.json`)
 ]);
 if(allodus.version!==1||allodus.files.length!==allodusPaths.size||new Set(allodus.files).size!==allodusPaths.size)throw new Error("INVALID_ALLODUS_MANIFEST");
 const allodusLang=new Map<string,Record<string,string>>();
 let allodusSounds:Record<string,unknown>={};
 for(const path of allodus.files){
  if(!allodusPaths.has(path)||files.has(path))throw new Error("INVALID_ALLODUS_PATH");
  const bytes=readFileSync(new URL("../allodus-assets/"+path,import.meta.url));
  if(bytes.length>500_000)throw new Error("ALLODUS_ASSET_TOO_LARGE");
  if(path.endsWith(".png"))png(bytes.toString("base64"),path.endsWith("allodus_star.png")?16:512,path.endsWith("allodus_star.png")?16:512);
  else {
   const value=JSON.parse(bytes.toString());
   if(path.endsWith("/allodus/sounds.json")){
    if(Object.keys(value).sort().join(",")!=="allodus.appear,allodus.cry,allodus.judgment")throw new Error("INVALID_ALLODUS_SOUNDS");
    allodusSounds=value;continue;
   }
   if(path.includes("/allodus/lang/")){
    if(Object.entries(value).some(([key,text])=>!/^(?:cobblestar_planets\.species\.allodus\.|cobblemon\.(?:species\.allodus\.|move\.cobblestarjudgment(?:\.|$)|ability\.cobblestaromnitype(?:\.|$)))/.test(key)||typeof text!=="string"))throw new Error("INVALID_ALLODUS_LANG");
    allodusLang.set(path.split("/").at(-1)!,value);
    continue;
   }
  }
  files.set(path,bytes);
  // Cobblemon remaps Bedrock textures/particles to the Java particle atlas.
  if(path==="assets/cobblestar_planets/textures/particles/allodus_star.png"){
   files.set(path.replace("textures/particles/","textures/particle/"),bytes);
  }
 }
 // Patapouf is another original admin-only species. Cosmetic files only; no
 // species definitions, move scripts or executable data may enter the client pack.
 const patapouf=JSON.parse(readFileSync(new URL("../patapouf-assets/manifest.json",import.meta.url),"utf8")) as {version:number;files:string[]};
 const patapoufPaths=new Set([
  "assets/cobblestar_planets/bedrock/pokemon/models/patapouf/patapouf.geo.json",
  "assets/cobblestar_planets/bedrock/pokemon/animations/patapouf/patapouf.animation.json",
  "assets/cobblestar_planets/bedrock/pokemon/posers/patapouf/patapouf.json",
  "assets/cobblestar_planets/bedrock/pokemon/resolvers/patapouf/0_patapouf_base.json",
  "assets/cobblestar_planets/bedrock/particles/patapouf/patapouf_puff.particle.json",
  "assets/cobblestar_planets/textures/particles/patapouf_puff.png",
  "assets/cobblestar_planets/textures/pokemon/patapouf/patapouf.png",
  "assets/cobblestar_planets/patapouf/sounds.json",
  ...["fr_fr","en_us"].map(n=>`assets/cobblestar_planets/patapouf/lang/${n}.json`)
 ]);
 if(patapouf.version!==1||patapouf.files.length!==patapoufPaths.size||new Set(patapouf.files).size!==patapoufPaths.size)throw new Error("INVALID_PATAPOUF_MANIFEST");
 const patapoufLang=new Map<string,Record<string,string>>();
 let patapoufSounds:Record<string,unknown>={};
 for(const path of patapouf.files){
  if(!patapoufPaths.has(path)||files.has(path))throw new Error("INVALID_PATAPOUF_PATH");
  const bytes=readFileSync(new URL("../patapouf-assets/"+path,import.meta.url));
  if(bytes.length>500_000)throw new Error("PATAPOUF_ASSET_TOO_LARGE");
  if(path.endsWith(".png"))png(bytes.toString("base64"),path.endsWith("patapouf_puff.png")?16:256,path.endsWith("patapouf_puff.png")?16:256);
  else {
   const value=JSON.parse(bytes.toString());
   if(path.endsWith("/patapouf/sounds.json")){
    if(Object.keys(value).sort().join(",")!=="patapouf.cry,patapouf.sneeze")throw new Error("INVALID_PATAPOUF_SOUNDS");
    patapoufSounds=value;continue;
   }
   if(path.includes("/patapouf/lang/")){
    if(Object.entries(value).some(([key,text])=>!/^(?:cobblestar_planets\.species\.patapouf\.|cobblemon\.(?:species\.patapouf\.|move\.patapoufsneeze(?:\.|$)))/.test(key)||typeof text!=="string"))throw new Error("INVALID_PATAPOUF_LANG");
    patapoufLang.set(path.split("/").at(-1)!,value);continue;
   }
  }
  files.set(path,bytes);
  if(path.endsWith("textures/particles/patapouf_puff.png"))files.set(path.replace("textures/particles/","textures/particle/"),bytes);
 }
 const effects=JSON.parse(readFileSync(new URL("../star-effects/manifest.json",import.meta.url),"utf8")) as {files:string[]};
 for(const path of effects.files){
  if(!/^assets\/cobblestar_planets\/[a-z0-9_./-]+$/.test(path)||path.includes("..")||files.has(path))throw new Error("INVALID_STAR_EFFECT_PATH");
  files.set(path,readFileSync(new URL("../star-effects/"+path,import.meta.url)));
 }
 // Approved arcade cabinets are cosmetic resources; all loot and simulation stay in the mod.
 const arcade=JSON.parse(readFileSync(new URL("../arcade-assets/manifest.json",import.meta.url),"utf8")) as {version:number;files:string[]};
 const arcadePaths=new Set(["assets/cobblestar_planets/textures/block/crates/arcade_atlas.png",
  ...["vote","nova","pulsar","quasar"].flatMap(id=>["cosmic","item"].map(kind=>`assets/cobblestar_planets/models/${kind}/crate_${id}.json`))]);
 if(arcade.version!==1||arcade.files.length!==arcadePaths.size||new Set(arcade.files).size!==arcadePaths.size)throw new Error("INVALID_ARCADE_MANIFEST");
 for(const path of arcade.files){
  if(!arcadePaths.has(path)||files.has(path))throw new Error("INVALID_ARCADE_PATH");
  const bytes=readFileSync(new URL("../arcade-assets/"+path,import.meta.url));
  if(bytes.length>2_000_000)throw new Error("ARCADE_ASSET_TOO_LARGE");
  if(path.endsWith(".json"))JSON.parse(bytes.toString());
  else png(bytes.toString("base64"),1024,256);
  files.set(path,bytes);
 }
 // Gallery geometry and SGA cosmetics share mandatory pack delivery. The mod
 // provides interactions/rendering; a pack never installs executable gameplay.
 const gallery=JSON.parse(readFileSync(new URL("../gallery-assets/manifest.json",import.meta.url),"utf8")) as {version:number;files:string[]};
 if(gallery.version!==1||gallery.files.length>64||new Set(gallery.files).size!==gallery.files.length)throw new Error("INVALID_GALLERY_MANIFEST");
 for(const path of gallery.files){
  if(!/^assets\/cobblestar_planets\/(?:blockstates\/(?:hologram_projector|card_stand|card_vitrine|card_wall_frame|sga_grader|card_cabinet)\.json|models\/(?:block|item)\/(?:hologram_projector|card_stand|card_vitrine|card_wall_frame|sga_grader|card_cabinet(?:_[0-5])?|card_base|booster_asteria|booster_nebelia)\.json|gallery\/(?:sounds\.json|models\/[a-z0-9_./-]+\.json)|textures\/(?:gallery\/logo_cercle_5|item\/booster_(?:asteria|nebelia)_v2)\.png)$/.test(path)||path.includes("..")||files.has(path))throw new Error("INVALID_GALLERY_PATH");
  const bytes=readFileSync(new URL("../gallery-assets/"+path,import.meta.url));
  if(bytes.length>8_000_000)throw new Error("GALLERY_ASSET_TOO_LARGE");
  if(path.endsWith(".json"))JSON.parse(bytes.toString());
  files.set(path,bytes);
 }
 const gallerySounds=JSON.parse(files.get("assets/cobblestar_planets/gallery/sounds.json")!.toString());
 const soundsPath="assets/cobblestar_planets/sounds.json";
 const oldSounds=JSON.parse(files.get(soundsPath)?.toString()??"{}");
 for(const [name,value] of Object.entries(gallerySounds)){
  if(!/^(?:gallery\.sga_(scan|reveal)|booster\.(tear|slide|rise|reveal))$/.test(name)||name in oldSounds)throw new Error("INVALID_GALLERY_SOUND");
  oldSounds[name]=value;
 }
 files.set(soundsPath,Buffer.from(JSON.stringify(oldSounds)));
 // Earned referral skins are cosmetics, never published Star species. Assets
 // share the mandatory pack, while their opt-in aspect leaves native spawns alone.
 const referral=JSON.parse(readFileSync(new URL("../referral-cosmetics/manifest.json",import.meta.url),"utf8")) as {files:string[]};
 for(const path of referral.files){
  if(!/^assets\/cobblestar_planets\/(?:textures\/pokemon\/referral|bedrock\/pokemon\/resolvers\/referral)\/[a-z0-9_.-]+$/.test(path)||path.includes("..")||files.has(path))throw new Error("INVALID_REFERRAL_COSMETIC_PATH");
  const incoming=readFileSync(new URL("../referral-cosmetics/"+path,import.meta.url));
  if(path.endsWith(".png"))png(incoming.toString("base64"),256,128);
  files.set(path,incoming);
 }
 files.set("licenses/Dragonite-Alliance-NOTICE.txt",readFileSync(new URL("../referral-cosmetics/NOTICE.txt",import.meta.url)));
 // Regional starters are shared assets, not Star drafts. They must be present
 // for every player before the server exposes their regional forms.
 const regionals=JSON.parse(readFileSync(new URL("../regional-starters/manifest.json",import.meta.url),"utf8")) as {files:string[]};
 for(const path of regionals.files){
  if(!/^assets\/cobblestar_planets\/[a-z0-9_./-]+$/.test(path)||path.includes(".."))throw new Error("INVALID_REGIONAL_ASSET_PATH");
  const incoming=readFileSync(new URL("../regional-starters/"+path,import.meta.url));
  if(files.has(path)){
   if(!/^assets\/cobblestar_planets\/lang\/(?:fr_fr|en_us)\.json$/.test(path))throw new Error("REGIONAL_ASSET_COLLISION");
   const previous=JSON.parse(files.get(path)!.toString()) as Record<string,string>;
   const next=JSON.parse(incoming.toString()) as Record<string,string>;
   if(Object.keys(next).some(key=>Object.hasOwn(previous,key)))throw new Error("REGIONAL_LANGUAGE_COLLISION");
   files.set(path,Buffer.from(JSON.stringify({...previous,...next})));
  }else files.set(path,incoming);
 }
 appendEventPokemonAssets(files);
 files.set("licenses/Cobblemon.txt",readFileSync(new URL("../licenses/Cobblemon.txt",import.meta.url)));
 files.set("licenses/NOTICE.txt",Buffer.from("Native Pokemon geometry and base assets: Cobblemon team, Cobblemon 1.8.0. https://gitlab.com/cable-mc/cobblemon\nStar variants are modified adaptations supplied by CobbleStar administrators. Regional starters V2 are CobbleStar adaptations of the official models and textures, with modified cubes and pixel palettes; original rig metadata is preserved. Kingambit includes official animations and poser with isolated identifiers to prevent addon collisions. Other native animations remain in Cobblemon. Original asset license included as Cobblemon.txt.\n"));
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
 // Rank badges join the same mandatory pack, alongside every existing asset.
 appendRankTags(files);
 const allodusSoundPath="assets/cobblestar_planets/sounds.json";
 files.set(allodusSoundPath,Buffer.from(JSON.stringify({...JSON.parse(files.get(allodusSoundPath)?.toString()??"{}"),...allodusSounds,...patapoufSounds})));
 for(const [name,entries] of [...allodusLang,...patapoufLang]){
  const path=`assets/cobblestar_planets/lang/${name}`;
  files.set(path,Buffer.from(JSON.stringify({...JSON.parse(files.get(path)?.toString()??"{}"),...entries})));
 }
 return zipAssets(files);
}
