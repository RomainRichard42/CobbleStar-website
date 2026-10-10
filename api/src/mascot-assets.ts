import {readFileSync} from 'node:fs';
import {png} from './star-assets.js';

/** Approved visual resources only. Gameplay remains server-authoritative. */
export function appendMascotAssets(files:Map<string,Buffer>){
 const root='assets/cobblestar_planets/',ids=['astreval','basteros','ludilux'];
 const allowed=new Set(ids.flatMap(id=>[
  root+`bedrock/pokemon/models/mascots/${id}/${id}.geo.json`,
  root+`bedrock/pokemon/animations/mascots/${id}/${id}.animation.json`,
  root+`bedrock/pokemon/posers/mascots/${id}/${id}.json`,
  root+`bedrock/pokemon/resolvers/mascots/${id}/0_${id}_base.json`,
  ...['','_shiny','_glow','_glow_shiny'].map(s=>root+`textures/pokemon/mascots/${id}/${id}${s}.png`)
 ]));
 for(const lang of ['fr_fr','en_us'])allowed.add(root+`mascots/lang/${lang}.json`);
 allowed.add(root+'mascots/sounds.json');
 const manifest=JSON.parse(readFileSync(new URL('../mascot-assets/manifest.json',import.meta.url),'utf8')) as {version:number;files:string[]};
 if(manifest.version!==1||!Array.isArray(manifest.files)||manifest.files.length!==allowed.size||new Set(manifest.files).size!==allowed.size)throw Error('INVALID_MASCOT_MANIFEST');
 for(const path of manifest.files){
  if(!allowed.has(path))throw Error('INVALID_MASCOT_PATH');
  const bytes=readFileSync(new URL('../mascot-assets/'+path,import.meta.url));if(bytes.length>500000)throw Error('MASCOT_ASSET_TOO_LARGE');
  if(path.endsWith('.png'))png(bytes.toString('base64'),512,512);else JSON.parse(bytes.toString());
  let destination=path;
  if(path.includes('/mascots/lang/')){
   const entries=JSON.parse(bytes.toString()) as Record<string,string>;
   if(Object.entries(entries).some(([key,value])=>!/^(?:cobblemon|cobblestar_planets)\.(?:species\.(?:astreval|basteros|ludilux)\.(?:name|desc)|ability\.(?:cobblestarspectralascendant|cobblestarastralbulwark|cobblestarreplay)(?:\.desc)?|move\.(?:cobblestarnetherwing|cobblestarastralaegis|cobblestartilt)(?:\.desc)?)$/.test(key)||typeof value!=='string'))throw Error('INVALID_MASCOT_LANGUAGE');
   destination=path.replace('/mascots/lang/','/lang/');
  }else if(path.endsWith('/mascots/sounds.json')){
   const entries=JSON.parse(bytes.toString());if(Object.keys(entries).length!==3||Object.keys(entries).some(k=>!ids.includes(k.replace(/\.cry$/,''))||!k.endsWith('.cry')))throw Error('INVALID_MASCOT_SOUNDS');
   destination=root+'sounds.json';
  }
  if(destination!==path){
   const entries=JSON.parse(bytes.toString()),previous=JSON.parse(files.get(destination)?.toString()??'{}');
   if(Object.keys(entries).some(k=>Object.hasOwn(previous,k)))throw Error('MASCOT_MERGE_COLLISION');
   files.set(destination,Buffer.from(JSON.stringify({...previous,...entries})));
  }else{if(files.has(path))throw Error('MASCOT_ASSET_COLLISION');files.set(path,bytes);}
 }
 files.set('licenses/CobbleStar-Mascots-NOTICE.txt',readFileSync(new URL('../mascot-assets/NOTICE.txt',import.meta.url)));
}
