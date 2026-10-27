import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {join,basename,relative} from 'node:path';
import {inflateRawSync} from 'node:zlib';
import {renderToken} from './render-token.mjs';
const root=process.cwd(), api=join(root,'api');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const names=new Map(json(join(api,'star-templates/index.json')).species.map(s=>[s.species,s.name]));
const packs=['regional-starters','event-pokemon-assets','mascot-assets','referral-cosmetics','allodus-assets','patapouf-assets'];
const entries=[];
for(const pack of packs){
 const files=walk(join(api,pack));
 for(const file of files.filter(f=>f.replaceAll('\\','/').includes('/lang/')&&f.endsWith('fr_fr.json'))){for(const [k,v] of Object.entries(json(file)))if(k.endsWith('.name'))names.set(k.replace('cobblemon.species.','').replace('.name',''),v);}
 for(const file of files.filter(f=>f.replaceAll('\\','/').includes('/resolvers/')&&f.endsWith('.json'))){
  const resolver=json(file),species=resolver.species.split(':')[1];let previous={};
  for(const variation of resolver.variations){
   const v={...previous,...variation};previous=v;
   if(!v.texture||typeof v.texture!=='string'||!v.model)throw new Error('Unsupported resolver: '+file);
   const aspects=v.aspects||[];
   // Alpha eyes are a display effect, not a separate collectible form.
   if(aspects.includes('alpha_eyes')||aspects.some(a=>a.startsWith('cosmetic_item-')))continue;
   const collection=pack==='regional-starters'?(aspects.includes('cobblestar_asteria')?'Astéria':'Nébélia'):pack==='event-pokemon-assets'?'Éclipse':pack==='referral-cosmetics'?'Alliance':'Créations CobbleStar';
   const form=[aspects.includes('shiny')?'Chromatique':'Classique',...(aspects.includes('female')?['Femelle']:[])].join(' · ');
   const modelName=v.model.split(':')[1].split('/').at(-1)+'.json';
   let model=files.find(f=>basename(f)===modelName&&f.replaceAll('\\','/').includes('/models/'));
   if(!model){
    const zip=readFileSync(join(api,'star-templates',species+'.zip'));let o=0;
    while(o+30<zip.length&&zip.readUInt32LE(o)===0x04034b50){const method=zip.readUInt16LE(o+8),len=zip.readUInt32LE(o+18),nl=zip.readUInt16LE(o+26),start=o+30+nl+zip.readUInt16LE(o+28);const name=zip.toString('utf8',o+30,o+30+nl);if(name===species+'.geo.json'){mkdirSync(join(api,'dex-native'),{recursive:true});model=join(api,'dex-native',species+'.geo.json');writeFileSync(model,method===8?inflateRawSync(zip.subarray(start,start+len)):zip.subarray(start,start+len));break;}o=start+len;}
   }
   if(!model)throw new Error('Missing model '+v.model);
   const pathFor=ref=>join(api,pack,'assets',...ref.split(':'));
   const texture=pathFor(v.texture);if(!existsSync(texture))throw new Error('Missing '+texture);
   const glow=v.layers?.find(l=>l.emissive&&typeof l.texture==='string'&&!l.name.includes('alpha'))?.texture;
   const id=[species,collection==='Créations CobbleStar'?'custom':collection.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),aspects.includes('shiny')?'shiny':'base',...(aspects.includes('female')?['female']:[])].join('-');
   if(entries.some(e=>e.id===id))throw new Error('Duplicate form '+id);
   entries.push({id,species,name:names.get(species)||species,collection,form,model:relative(api,model).replaceAll('\\','/'),texture:relative(api,texture).replaceAll('\\','/'),...(glow?{emissive:relative(api,pathFor(glow)).replaceAll('\\','/')}:{} )});
  }
 }
}
writeFileSync(join(api,'dex.catalog.json'),JSON.stringify({version:1,entries},null,2)+'\n');
console.log(`Exported ${entries.length} CobbleStar forms from bundled resolvers.`);

// Depth-tested renders of the game's actual octagonal token meshes.
const mod=process.argv[2];
if(mod){
 mkdirSync(join(root,'public/shop/tokens'),{recursive:true});
 for(const id of ['nova','pulsar','quasar','vote']){
  const mesh=json(join(mod,'src/main/resources/assets/cobblestar_planets/models/cosmic/key_'+id+'.json'));
  writeFileSync(join(root,'public/shop/tokens',id+'.png'),await renderToken(mesh));
 }
}
