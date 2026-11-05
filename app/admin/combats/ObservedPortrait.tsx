"use client";
import {useEffect,useRef,useState} from 'react';

type Identity={species:string;form:string;appearance:string;shiny:boolean;star:boolean};
type Entry={id:string;species:string;form:string;collection:string;assetUrl:string};
let entries:Promise<Entry[]>|null=null;
const clean=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export default function ObservedPortrait({pokemon,name}:{pokemon:Identity;name:string}){
 const host=useRef<HTMLDivElement>(null);const [state,setState]=useState('Chargement du visuel…');
 useEffect(()=>{let live=true;let renderer:Awaited<ReturnType<typeof import('../../../public-site/src/scripts/dex-renderer')['createDexRenderer']>>|undefined;
  host.current?.replaceChildren();setState('Chargement du visuel…');
  void (async()=>{try{
   entries??=fetch('/api/pokedex').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>d.entries??d).catch(e=>{entries=null;throw e;});
   const all=await entries,species=pokemon.species.replace('cobblemon:',''),form=clean(pokemon.form),variant=pokemon.shiny?'shiny':'base';
   const aspects=pokemon.appearance.split('#')[1]?.split(',')??[];
   const custom=aspects.filter(a=>/^cobblestar[-_]/.test(a)&&a!=='cobblestar-star').map(a=>a.replace(/^cobblestar[-_]/,''));
   const extra=aspects.some(a=>!['male','female','genderless','shiny'].includes(a));
   const id=pokemon.star?`star-${species}-${variant}`:custom.length===1?`${species}-${custom[0]}-${variant}`:['normal','standard'].includes(form)?pokemon.shiny||extra?'':`native-${species}`:`${species}-${form}-${variant}`;
   // Never silently substitute an ordinary model for a regional, Star or shiny appearance.
   const found=all.find(e=>e.id===id);if(!found)throw Error();
   const response=await fetch(found.assetUrl);if(!response.ok)throw Error();const {asset}=await response.json();
   const {createDexRenderer}=await import('../../../public-site/src/scripts/dex-renderer');if(!live)return;
   renderer=createDexRenderer();renderer.resize(340,240);await renderer.set(asset,id);if(!live)return;renderer.show(id,0);
   const canvas=document.createElement('canvas');canvas.width=340;canvas.height=240;canvas.style.cssText='width:170px;height:120px;object-fit:contain';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',name+' · '+pokemon.form+(pokemon.star?' · Star':pokemon.shiny?' · Shiny':''));canvas.getContext('2d')!.drawImage(renderer.canvas,0,0);host.current?.replaceChildren(canvas);setState('');
  }catch{if(live)setState('Visuel indisponible pour cette apparence.');}finally{renderer?.dispose();}})();
  return()=>{live=false;renderer?.dispose();};
 },[pokemon.species,pokemon.form,pokemon.appearance,pokemon.shiny,pokemon.star,name]);
 return <div style={{minHeight:120,display:'flex',alignItems:'center',gap:12}}><div ref={host}/>{state&&<span style={{fontSize:13,color:'#b9a4c7'}}>{state}</span>}</div>;
}
