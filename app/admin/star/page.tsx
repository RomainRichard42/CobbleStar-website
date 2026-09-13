"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import s from "./star.module.css";

const StarPreview=dynamic(()=>import("./StarPreview"),{ssr:false,loading:()=> <div className={s.preview}>Chargement de l’aperçu…</div>});
type Model={species:string;revision:number;publishedRevision:number};
type Template={species:string;name:string;compatible:boolean};
type State={canWrite:boolean;hash:string;catalog:{species:string;poser:string}[];templates:Template[];templateVersion:string;models:Model[];servers:{server_id:string;applied_hash:string;ready_clients:number;total_clients:number;last_error:string;seen_at:string}[]};
async function api<T>(url:string,options?:RequestInit):Promise<T>{const response=await fetch(url,{credentials:"include",cache:"no-store",...options,headers:{"Content-Type":"application/json",...options?.headers}});const body=await response.json();if(!response.ok)throw new Error(body.error??`HTTP ${response.status}`);return body as T;}
async function png(file:File){if(file.size>2_000_000)throw new Error("Texture trop grande : maximum 2 Mo.");const bytes=new Uint8Array(await file.arrayBuffer());let data="";for(let i=0;i<bytes.length;i+=8192)data+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(data);}
const previewUrl=(m:Model)=>`/api/admin/star/${m.species}/asset?version=${m.publishedRevision?"published":"draft"}&revision=${m.publishedRevision||m.revision}`;
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();

export default function StarStudio(){
 const [state,setState]=useState<State|null>(null),[species,setSpecies]=useState("dragonite"),[model,setModel]=useState<File|null>(null),[texture,setTexture]=useState<File|null>(null),[glow,setGlow]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[query,setQuery]=useState(""),[tab,setTab]=useState<"published"|"missing">("published"),[page,setPage]=useState(0);
 const [observedAt,setObservedAt]=useState(0);
 const load=useCallback(async()=>{const next=await api<State>("/api/admin/star");setState(next);setObservedAt(Date.now());},[]);
 useEffect(()=>{let active=true;const refresh=()=>api<State>("/api/admin/star").then(next=>{if(active){setState(next);setObservedAt(Date.now());}}).catch(e=>{if(active)setError((e as Error).message);});void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>{active=false;clearInterval(timer);};},[]);
 const selected=state?.models.find(m=>m.species===species),template=state?.templates?.find(t=>t.species===species),known=state?.catalog.some(c=>c.species===species);
 const library=useMemo(()=>{
  const rows=new Map<string,Template>();for(const t of state?.templates??[])rows.set(t.species,t);
  for(const t of [...state?.catalog??[],...state?.models??[]])if(!rows.has(t.species))rows.set(t.species,{species:t.species,name:t.species,compatible:false});
  return [...rows.values()].map(t=>({...t,model:state?.models.find(m=>m.species===t.species)})).sort((a,b)=>a.name.localeCompare(b.name,"fr"));
 },[state]);
 const published=library.filter(t=>!!t.model?.publishedRevision),missing=library.filter(t=>!t.model?.publishedRevision);
 const filtered=(tab==="published"?published:missing).filter(t=>normalize(t.name+" "+t.species).includes(normalize(query)));
 const lastPage=Math.max(0,Math.ceil(filtered.length/6)-1),currentPage=Math.min(page,lastPage),visible=filtered.slice(currentPage*6,currentPage*6+6);
 function choose(id:string){setSpecies(id);setModel(null);setTexture(null);setGlow(null);setMessage("");}
 async function task(work:()=>Promise<void>){setBusy(true);setError("");setMessage("");try{await work();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function save(){await task(async()=>{if(!model||!texture)throw new Error("Ajoute le modèle et sa texture.");if(model.size>1_500_000)throw new Error("Modèle trop grand : maximum 1,5 Mo.");const asset={species,model:JSON.parse(await model.text()),texture:await png(texture),...(glow?{emissive:await png(glow)}:{})};await api(`/api/admin/star/${species}`,{method:"PUT",body:JSON.stringify({expectedRevision:selected?.revision??0,asset})});setMessage("Brouillon enregistré. La version publiée reste inchangée jusqu’à publication.");});}
 async function publish(){if(!selected||!window.confirm(`Publier le modèle Star de ${species} ? Le pack sera envoyé aux joueurs connectés.`))return;await task(async()=>{await api(`/api/admin/star/${species}/publish`,{method:"POST",body:JSON.stringify({revision:selected.revision})});setMessage("Publié. Attends la synchronisation serveur puis le chargement du pack par les clients.");});}
 async function download(id:string,source:"native"|"published"|"draft"){
  setBusy(true);setError("");
  try{const response=await fetch(`/api/admin/star/${id}/kit?source=${source}`,{credentials:"include",cache:"no-store"});if(!response.ok){const body=await response.json();throw new Error(body.error==="NATIVE_KIT_SERVER_VERSION_MISMATCH"?"Le modèle du serveur diffère du kit Cobblemon 1.8. Mets à jour le catalogue de kits.":body.error??`HTTP ${response.status}`);}const url=URL.createObjectURL(await response.blob()),a=document.createElement("a");a.href=url;a.download=`${id}-star-${source}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <main className={s.page}>
  <header><div><p>COBBLESTAR / ATELIER</p><h1>Pokémon Star</h1><span>Le catalogue des variantes publiées et des prochaines créations</span></div><Link href="/admin/">Retour au centre de contrôle</Link></header>
  {error&&<p className={s.error} role="alert">{error}</p>}{message&&<p className={s.success} role="status">{message}</p>}
  <section className={s.library} aria-label="Catalogue Pokémon Star">
   <div className={s.libraryHead}><div><h2>Les créations du serveur</h2><p>Les aperçus affichent les vrais fichiers Star, en pose fixe. Les animations restent celles de Cobblemon en jeu.</p></div><label>Rechercher un Pokémon<input value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Nom français ou identifiant…" type="search"/></label></div>
   <div className={s.tabs}><button aria-pressed={tab==="published"} onClick={()=>{setTab("published");setPage(0);}}>★ Avec version Star <span>{published.length}</span></button><button aria-pressed={tab==="missing"} onClick={()=>{setTab("missing");setPage(0);}}>Sans version Star <span>{missing.length}</span></button></div>
   {tab==="missing"&&<p>Un brouillon seul ne compte pas comme une version Star disponible en jeu. Kits natifs : Cobblemon {state?.templateVersion??"1.8.0"}, forme de base.</p>}
   {!state?<p role="status">Chargement du catalogue…</p>:!visible.length?<p>{query?"Aucun Pokémon ne correspond à cette recherche.":tab==="published"?"Aucune version Star publiée pour le moment.":"Toutes les espèces du catalogue ont leur version Star."}</p>:<div className={s.cards}>{visible.map(row=><article className={s.card} key={row.species}>
    {row.model?<StarPreview key={previewUrl(row.model)} url={previewUrl(row.model)} label={`${row.name} · ${row.model.publishedRevision?"Star publié":"brouillon non publié"}`}/>:<div className={s.noModel}><span aria-hidden="true">☆</span><p>Version Star à créer</p></div>}
    <div className={s.cardBody}><h3>{row.name}</h3><code>{row.species}</code><p className={row.model?.publishedRevision?s.badge:s.draft}>{row.model?.publishedRevision?`★ Star publié · v${row.model.publishedRevision}`:row.model?`Brouillon v${row.model.revision} · non publié`:"Aucun modèle Star"}{!!row.model?.publishedRevision&&row.model.revision!==row.model.publishedRevision&&" · brouillon plus récent"}</p>
     <div className={s.actions}><button disabled={busy} onClick={()=>{choose(row.species);document.getElementById("star-editor")?.scrollIntoView({behavior:"smooth",block:"start"});}}>Ouvrir l’atelier</button><button className={s.secondary} disabled={busy||(!row.model&&!row.compatible)} onClick={()=>void download(row.species,row.model?.publishedRevision?"published":row.model?"draft":"native")}>Télécharger le ZIP {row.model?.publishedRevision?"Star":row.model?"brouillon":"de base"}</button></div>
    </div></article>)}</div>}
   {filtered.length>6&&<nav className={s.pagination} aria-label="Pages du catalogue"><button disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Précédent</button><span>Page {currentPage+1} / {lastPage+1} · {filtered.length} Pokémon</span><button disabled={currentPage>=lastPage} onClick={()=>setPage(currentPage+1)}>Suivant</button></nav>}
  </section>
  <div className={s.grid} id="star-editor"><section><h2>1. Choisir et télécharger</h2><label>Espèce Cobblemon<input disabled={busy} list="star-species" value={species} onChange={e=>choose(e.target.value.toLowerCase())} placeholder="dragonite"/></label><datalist id="star-species">{library.map(c=><option key={c.species} value={c.species}>{c.name}</option>)}</datalist>
   {!!state&&!known&&<p className={s.warning}>Espèce absente du catalogue serveur : tu peux préparer le kit natif, mais la publication nécessite une synchronisation du serveur.</p>}
   <div className={s.actions}><button className={s.secondary} disabled={busy||!template?.compatible} onClick={()=>void download(species,"native")}>ZIP du modèle de base</button>{selected&&<button className={s.secondary} disabled={busy} onClick={()=>void download(species,"draft")}>ZIP du brouillon v{selected.revision}</button>}{!!selected?.publishedRevision&&<button className={s.secondary} disabled={busy} onClick={()=>void download(species,"published")}>ZIP Star publié v{selected.publishedRevision}</button>}</div>
   <p>Le ZIP natif contient le modèle <code>.geo.json</code>, sa texture, un calque lumineux transparent et les instructions Blockbench. Les fichiers de référence servent à conserver les animations.</p>
   {template&&!template.compatible&&<p className={s.warning}>Le squelette serveur diffère du kit natif : téléchargement de base désactivé pour éviter un modèle incompatible.</p>}
   <h2>2. Importer depuis Blockbench</h2><p>Conserve les noms et parents des os Cobblemon. Modifie la texture, les cubes et, si besoin, ajoute des os. Le modèle exporté reste au format Bedrock <code>.geo.json</code>.</p>
   <label>Modèle géométrique (obligatoire)<input disabled={busy||!state?.canWrite} key={species+"model"} type="file" accept=".json" onChange={e=>setModel(e.target.files?.[0]??null)}/></label>
   <label>Texture PNG (obligatoire)<input disabled={busy||!state?.canWrite} key={species+"texture"} type="file" accept="image/png" onChange={e=>setTexture(e.target.files?.[0]??null)}/></label>
   <label>Calque lumineux PNG (facultatif)<input disabled={busy||!state?.canWrite} key={species+"glow"} type="file" accept="image/png" onChange={e=>setGlow(e.target.files?.[0]??null)}/></label>
   {model&&texture&&<p>Prêt : {model.name} · {texture.name}{glow?` · ${glow.name}`:" · sans calque lumineux"}</p>}
   <p>Les PNG doivent avoir les dimensions UV du modèle (1024 × 1024 maximum). Le calque lumineux reste transparent en dehors des détails à faire briller.</p>
   <button disabled={busy||!state?.canWrite||!known||!model||!texture} onClick={()=>void save()}>Enregistrer le brouillon</button>
  </section><section><h2>3. Vérifier et publier</h2>
   {selected?<><StarPreview key={`${species}-${selected.revision}`} url={`/api/admin/star/${species}/asset?version=draft&revision=${selected.revision}`} label={`Brouillon ${template?.name??species}`}/><p>Aperçu du brouillon v{selected.revision}{selected.revision!==selected.publishedRevision?" — pas encore en jeu":" — identique à la version publiée"}.</p></>:<p>Aucun modèle Star enregistré pour {template?.name??species}. Télécharge le kit de base pour commencer.</p>}
   <div className={s.status}><strong>{template?.name??species}</strong><span>Brouillon : {selected?.revision??"aucun"}</span><span>Publié : {selected?.publishedRevision||"non"}</span></div>
   <button disabled={busy||!state?.canWrite||!known||!selected||selected.revision===selected.publishedRevision} onClick={()=>void publish()}>Publier le modèle Star</button>
   {state&&!state.canWrite&&<p className={s.warning}>Accès en lecture seule : consultation et téléchargement autorisés, modification désactivée.</p>}
   <h2>Synchronisation</h2>{!state?.servers.length&&<p>Aucun serveur connecté. Vérifie le mod et sa configuration de passerelle.</p>}
   {state?.servers.map(server=><div className={s.status} key={server.server_id}><strong>{server.server_id}</strong><span>{observedAt-new Date(server.seen_at).getTime()>90000?"Serveur hors ligne / réponse ancienne":server.applied_hash===state.hash&&state.hash?"Pack transmis au serveur":"Publication en attente"}</span><span>{server.ready_clients} / {server.total_clients} clients ont chargé le pack</span>{server.last_error&&<span className={s.error}>{server.last_error}</span>}</div>)}
   <p>Une sauvegarde ne publie rien. Après publication, les nouveaux spawns Star attendent le chargement du pack par les clients connectés.</p>
  </section></div>
 </main>;
}
