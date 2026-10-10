import {readFileSync} from "node:fs";
import {png} from "./star-assets.js";

/** Curated event assets only, never upload paths or server gameplay definitions. */
export function appendEventPokemonAssets(files:Map<string,Buffer>){
 const root="assets/cobblestar_planets/",id="dragonite_eclipse";
 const allowed=new Set([
  ...["models","animations","posers","resolvers"].map(kind=>root+`bedrock/pokemon/${kind}/events/${id}${kind==="models"?".geo":kind==="animations"?".animation":""}.json`),
  ...["","_shiny","_glow","_glow_shiny","_alpha"].map(s=>root+`textures/pokemon/events/${id}${s}.png`),
  root+"textures/particle/events/eclipse_mist.png",
  root+"bedrock/particles/events/eclipse_appearance.particle.json",
  root+"events/sounds.json",
  ...["fr_fr","en_us"].map(l=>root+`lang/${l}.json`)
 ]);
 const manifest=JSON.parse(readFileSync(new URL("../event-pokemon-assets/manifest.json",import.meta.url),"utf8")) as {version:number;files:string[]};
 if(manifest.version!==1||!Array.isArray(manifest.files)||manifest.files.length!==allowed.size||new Set(manifest.files).size!==allowed.size)throw new Error("INVALID_EVENT_POKEMON_MANIFEST");
 for(const path of manifest.files){
  if(!allowed.has(path))throw new Error("INVALID_EVENT_POKEMON_PATH");
  const bytes=readFileSync(new URL("../event-pokemon-assets/"+path,import.meta.url));if(bytes.length>500000)throw new Error("EVENT_ASSET_TOO_LARGE");
  if(path.endsWith(".png"))png(bytes.toString("base64"),path.includes("/particle/")?32:512,path.includes("/particle/")?32:512);
  else JSON.parse(bytes.toString());
  if(path.includes("/lang/")){
   const entries=JSON.parse(bytes.toString()) as Record<string,string>;
   if(Object.entries(entries).some(([key,value])=>!/^cobblemon\.species\.dragonite-eclipse\.(?:name|desc)$/.test(key)||typeof value!=="string"))throw new Error("INVALID_EVENT_POKEMON_LANG");
   const previous=JSON.parse(files.get(path)?.toString()??"{}");if(Object.keys(entries).some(k=>Object.hasOwn(previous,k)))throw new Error("EVENT_LANGUAGE_COLLISION");
   files.set(path,Buffer.from(JSON.stringify({...previous,...entries})));continue;
  }
  if(path.endsWith("/events/sounds.json")){
   const sound=JSON.parse(bytes.toString());if(Object.keys(sound).join(",")!=="eclipse.appear")throw new Error("INVALID_EVENT_SOUND");
   const dest=root+"sounds.json",previous=JSON.parse(files.get(dest)?.toString()??"{}");if(Object.keys(sound).some(k=>Object.hasOwn(previous,k)))throw new Error("EVENT_SOUND_COLLISION");
   files.set(dest,Buffer.from(JSON.stringify({...previous,...sound})));continue;
  }
  if(files.has(path))throw new Error("EVENT_ASSET_COLLISION");files.set(path,bytes);
  if(path.includes("/textures/particle/"))files.set(path.replace("/textures/particle/","/textures/particles/"),bytes);
 }
 files.set("licenses/Dragonite-Eclipse-NOTICE.txt",readFileSync(new URL("../event-pokemon-assets/NOTICE.txt",import.meta.url)));
}
