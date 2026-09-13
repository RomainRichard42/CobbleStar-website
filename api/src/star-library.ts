import { readFile } from "node:fs/promises";
import { zipAssets, type StarModel, type NativeModel } from "./star-assets.js";

type Template = NativeModel & { name:string };
type Templates = { version:string; species:Template[] };
let cached:Promise<Templates>|undefined;
export function starTemplates():Promise<Templates> {
 return cached ??= readFile(new URL("../star-templates/index.json",import.meta.url),"utf8").then(text=>JSON.parse(text) as Templates).catch(error=>{cached=undefined;throw error;});
}
export function sameSkeleton(template:NativeModel,native:NativeModel) {
 const signature=(model:NativeModel)=>JSON.stringify(model.bones.map(b=>[b.name,b.parent??""]).sort((a,b)=>a[0]!.localeCompare(b[0]!)));
 return template.poser===native.poser && signature(template)===signature(native);
}
export async function nativeStarKit(species:string) {
 if(!/^[a-z0-9_]{1,80}$/.test(species))throw new Error("INVALID_SPECIES");
 return readFile(new URL(`../star-templates/${species}.zip`,import.meta.url));
}
export async function editableStarKit(asset:StarModel,revision:number,version:string) {
 const files=new Map<string,Buffer>([
  [`${asset.species}.geo.json`,Buffer.from(JSON.stringify(asset.model,null,2))],
  [`${asset.species}.png`,Buffer.from(asset.texture,"base64")],
  ["README.txt",Buffer.from(`Pokémon Star : ${asset.species}\nVersion ${version}, révision ${revision}.\nOuvre le .geo.json dans Blockbench et importe le PNG. Garde les noms et parents des os pour conserver les animations natives. Le PNG _glow, si présent, est le calque lumineux. Réimporte ces fichiers dans Admin > Pokémon Star, enregistre puis publie.\nSource native : Cobblemon, licence jointe ; adaptation Star : CobbleStar.\n`)],
  ["licenses/Cobblemon.txt",await readFile(new URL("../licenses/Cobblemon.txt",import.meta.url))]
 ]);
 if(asset.emissive)files.set(`${asset.species}_glow.png`,Buffer.from(asset.emissive,"base64"));
 return zipAssets(files);
}
