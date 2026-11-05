"use client";
import {useState} from 'react';
export function NpcSkinUpload({onUploaded}:{onUploaded:(skin:string)=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[model,setModel]=useState<'auto'|'slim'|'wide'>('auto');
 async function upload(file:File){
  setBusy(true);setMessage('Publication de la texture dans le pack…');
  try{
   if(file.size>512_000)throw new Error('PNG trop lourd (512 Ko maximum).');
   const bytes=new Uint8Array(await file.arrayBuffer());
   const texture=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
   const response=await fetch('/api/admin/npc-skins',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({texture,model})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error?.startsWith('PNG_')?'Utilise un skin Minecraft au format PNG 64 × 64.':result.error||'Publication impossible.');
   onUploaded(result.skin);setMessage(`Skin ${result.model==='slim'?'Alex · bras fins':'Steve · bras classiques'} ajouté au pack. Enregistre et publie le personnage pour l’appliquer.`);
  }catch(e){setMessage(e instanceof Error?e.message:'Import impossible.');}finally{setBusy(false);}
 }
 return <div><label>Modèle du skin<select value={model} disabled={busy} onChange={e=>setModel(e.target.value as typeof model)}><option value="auto">Détection automatique</option><option value="slim">Alex · bras fins</option><option value="wide">Steve · bras classiques</option></select></label><label>Importer un skin PNG · 64 × 64<input type="file" accept="image/png" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label><p>Les modèles Alex et Steve et leur seconde couche sont pris en charge. Le skin est distribué dans le pack automatique.</p><p role="status">{message}</p></div>;
}
