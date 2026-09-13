"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import s from "./star.module.css";
type Model={species:string;revision:number;publishedRevision:number};
type State={canWrite:boolean;hash:string;catalog:{species:string;poser:string}[];models:Model[];servers:{server_id:string;applied_hash:string;ready_clients:number;total_clients:number;last_error:string;seen_at:string}[]};
async function api<T>(url:string,options?:RequestInit):Promise<T>{const response=await fetch(url,{credentials:"include",cache:"no-store",...options,headers:{"Content-Type":"application/json",...options?.headers}});const body=await response.json();if(!response.ok)throw new Error(body.error??`HTTP ${response.status}`);return body as T;}
async function png(file:File){if(file.size>2_000_000)throw new Error("Texture trop grande : maximum 2 Mo.");const bytes=new Uint8Array(await file.arrayBuffer());let data="";for(let i=0;i<bytes.length;i+=8192)data+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(data);}
export default function StarStudio(){
 const [state,setState]=useState<State|null>(null),[species,setSpecies]=useState("dragonite"),[model,setModel]=useState<File|null>(null),[texture,setTexture]=useState<File|null>(null),[glow,setGlow]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [observedAt,setObservedAt]=useState(0);
 const load=useCallback(async()=>{const next=await api<State>("/api/admin/star");setState(next);setObservedAt(Date.now());},[]);
 useEffect(()=>{let active=true;const refresh=()=>api<State>("/api/admin/star").then(next=>{if(active){setState(next);setObservedAt(Date.now());}}).catch(e=>{if(active)setError((e as Error).message);});void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>{active=false;clearInterval(timer);};},[]);
 const selected=state?.models.find(m=>m.species===species),known=state?.catalog.some(c=>c.species===species);
 async function task(work:()=>Promise<void>){setBusy(true);setError("");setMessage("");try{await work();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function dragonitePreset(){await task(async()=>{
  const names=["dragonite.geo.json","dragonite.png","dragonite_glow.png"];
  const files=await Promise.all(names.map(async name=>{const response=await fetch(`/downloads/pokemon-star/dragonite/${name}`);if(!response.ok)throw new Error("Le pack Dracolosse Star est absent de ce déploiement.");return new File([await response.blob()],name,{type:name.endsWith(".png")?"image/png":"application/json"});}));
  setSpecies("dragonite");setModel(files[0]);setTexture(files[1]);setGlow(files[2]);
  setMessage("Dracolosse Star chargé : géométrie native, texture ivoire/indigo et détails lumineux. Enregistre le brouillon, puis publie-le pour activer les apparitions.");
 });}
 async function save(){await task(async()=>{if(!model||!texture)throw new Error("Ajoute le modèle et sa texture.");if(model.size>1_500_000)throw new Error("Modèle trop grand : maximum 1,5 Mo.");const asset={species,model:JSON.parse(await model.text()),texture:await png(texture),...(glow?{emissive:await png(glow)}:{})};await api(`/api/admin/star/${species}`,{method:"PUT",body:JSON.stringify({expectedRevision:selected?.revision??0,asset})});setMessage("Brouillon enregistré. Rien ne peut encore apparaître en Star pour cette nouvelle espèce.");});}
 async function publish(){if(!selected||!window.confirm(`Publier le modèle Star de ${species} ? Le pack sera envoyé aux joueurs connectés.`))return;await task(async()=>{await api(`/api/admin/star/${species}/publish`,{method:"POST",body:JSON.stringify({revision:selected.revision})});setMessage("Publié. Attends la synchronisation serveur puis le chargement du pack par les clients.");});}
 return <main className={s.page}><header><div><p>COBBLESTAR / ATELIER</p><h1>Pokémon Star</h1><span>Deux fois plus rares qu’un shiny · uniquement avec un modèle publié</span></div><Link href="/admin/">Retour au centre de contrôle</Link></header>
  {error&&<p className={s.error} role="alert">{error}</p>}{message&&<p className={s.success} role="status">{message}</p>}
  <div className={s.grid}><section><h2>1. Choisir le Pokémon</h2><label>Espèce Cobblemon<input list="star-species" value={species} onChange={e=>{setSpecies(e.target.value.toLowerCase());setModel(null);setTexture(null);setGlow(null);}} placeholder="dragonite" /></label><datalist id="star-species">{state?.catalog.map(c=><option key={c.species} value={c.species}/>)}</datalist>
   {!known&&<p className={s.warning}>Espèce absente du catalogue serveur. Mets à jour le mod et connecte la passerelle du site.</p>}
   <h2>2. Importer depuis Blockbench</h2><p>Format Bedrock <code>.geo.json</code>. Conserve les noms et parents des os du modèle Cobblemon : ses animations sont réutilisées. Tu peux modifier les cubes et ajouter des os.</p>
   <div className={s.status}><strong>Dracolosse Star prêt à importer</strong><span>Modèle Cobblemon 1.8 conservé, texture ivoire, ailes indigo, étoiles cyan lumineuses. Les petits embouts étoilés suivent les animations des antennes.</span><button disabled={busy||!state?.canWrite} onClick={()=>void dragonitePreset()}>Charger Dracolosse Star</button><a href="/downloads/pokemon-star/dragonite/README.txt" target="_blank" rel="noreferrer">Fichiers Blockbench et instructions</a></div>
   <label>Modèle géométrique (obligatoire)<input key={species+"model"} type="file" accept=".json" onChange={e=>setModel(e.target.files?.[0]??null)}/></label>
   <label>Texture PNG (obligatoire)<input key={species+"texture"} type="file" accept="image/png" onChange={e=>setTexture(e.target.files?.[0]??null)}/></label>
   <label>Calque lumineux PNG (facultatif)<input key={species+"glow"} type="file" accept="image/png" onChange={e=>setGlow(e.target.files?.[0]??null)}/></label>
   {model&&texture&&<p role="status">Prêt : {model.name} · {texture.name}{glow?` · ${glow.name}`:" · sans calque lumineux"}</p>}
   <p>Les PNG doivent avoir les dimensions UV du modèle (1024 × 1024 maximum). Le calque lumineux est transparent sauf sur les détails à faire briller.</p>
   <button disabled={busy||!state?.canWrite||!known||!model||!texture} onClick={()=>void save()}>Enregistrer le brouillon</button>
  </section><section><h2>3. Publier en jeu</h2><p>La sauvegarde seule n’active pas les apparitions. La publication crée un pack Minecraft immuable ; le serveur le transmet automatiquement aux clients.</p><div className={s.status}><strong>{species}</strong><span>Brouillon : {selected?.revision??"aucun"}</span><span>Publié : {selected?.publishedRevision||"non"}</span></div>
   <button disabled={busy||!state?.canWrite||!selected||selected.revision===selected.publishedRevision} onClick={()=>void publish()}>Publier le modèle Star</button>
   <h2>Synchronisation</h2>{!state?.servers.length&&<p>Aucun serveur connecté. Vérifie le mod et sa configuration de passerelle.</p>}
   {state?.servers.map(server=><div className={s.status} key={server.server_id}><strong>{server.server_id}</strong><span>{observedAt-new Date(server.seen_at).getTime()>90000?"Serveur hors ligne / réponse ancienne":server.applied_hash===state.hash&&state.hash?"Pack transmis au serveur":"Publication en attente"}</span><span>{server.ready_clients} / {server.total_clients} clients ont chargé le pack</span>{server.last_error&&<span className={s.error}>{server.last_error}</span>}</div>)}
   <p>Les nouveaux spawns Star attendent que les clients connectés aient chargé le pack. Aucun redémarrage requis pour une nouvelle publication.</p>
   <h2>Modèles enregistrés</h2><ul>{state?.models.map(m=><li key={m.species}><button className={s.link} onClick={()=>{setSpecies(m.species);setModel(null);setTexture(null);setGlow(null);}}>{m.species}</button> — {m.publishedRevision?`publié v${m.publishedRevision}`:"brouillon uniquement"}{m.revision!==m.publishedRevision&&" · modifications non publiées"}</li>)}</ul>
  </section></div></main>;
}
