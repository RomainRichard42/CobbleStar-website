"use client";
import {useState} from 'react';
export function NpcSkinUpload({onUploaded}:{onUploaded:(skin:string)=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function upload(file:File){
  setBusy(true);setMessage('Publication de la texture dans le pack…');
  try{
   if(file.size>65_000)throw new Error('PNG trop lourd (65 Ko maximum).');
   const bytes=new Uint8Array(await file.arrayBuffer());
   const texture=btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
   const response=await fetch('/api/admin/npc-skins',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({texture})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error?.startsWith('PNG_')?'Utilise un skin PNG 64 × 64, RGB ou RGBA non entrelacé.':result.error||'Publication impossible.');
   onUploaded(result.skin);setMessage('Texture ajoutée au pack automatique. Enregistre et publie le personnage pour l’appliquer.');
  }catch(e){setMessage(e instanceof Error?e.message:'Import impossible.');}finally{setBusy(false);}
 }
 return <div><label>Importer un skin PNG · 64 × 64<input type="file" accept="image/png" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/></label><p>Modèle classique (bras larges), seconde couche incluse. Texture distribuée via le pack obligatoire.</p><p role="status">{message}</p></div>;
}
