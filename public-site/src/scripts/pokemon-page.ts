import type {createDexRenderer} from './dex-renderer';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const panelHash=()=>['#apercu','#evolutions','#localisation','#attaques'].includes(location.hash)?location.hash:['#stats','#talents'].includes(location.hash)?'#apercu':'';
const retainPanel=()=>document.querySelectorAll<HTMLAnchorElement>('[data-pokemon-neighbour],#pokemon-jump-results a').forEach(link=>{link.hash=panelHash();});
const jump=document.querySelector<HTMLFormElement>('#pokemon-jump');
if(jump){
 const field=document.getElementById('pokemon-jump-input') as HTMLInputElement;
 const results=document.getElementById('pokemon-jump-results')!;
 const status=document.getElementById('pokemon-jump-status')!;
 type Choice={species:string;name:string;collection:string};
 let catalogue:Promise<Choice[]>|undefined,timer:ReturnType<typeof setTimeout>,revision=0;
 const current=location.pathname.split('/').filter(Boolean).at(-1);
 function getCatalogue(){
  return catalogue??=fetch('/api/pokedex',{signal:AbortSignal.timeout(10000)}).then(async response=>{
   if(!response.ok)throw Error('Catalogue indisponible');
   const {entries}=await response.json() as {entries:Choice[]};
   const unique=new Map<string,Choice>();
   for(const entry of entries)if(!unique.has(entry.species)||entry.collection==='Classiques')unique.set(entry.species,entry);
   return [...unique.values()].filter(e=>e.species!==current).sort((a,b)=>a.name.localeCompare(b.name,'fr')||a.species.localeCompare(b.species));
  }).catch(error=>{catalogue=undefined;throw error;});
 }
 field.addEventListener('input',()=>{
  clearTimeout(timer);const version=++revision;const query=norm(field.value.trim());
  results.replaceChildren();results.hidden=true;status.hidden=query.length===0;
  if(query.length<2){status.textContent=query?'Saisis au moins deux lettres.':'';return;}
  status.textContent='Recherche…';
  timer=setTimeout(async()=>{
   try{
    const catalogue=await getCatalogue();if(version!==revision)return;
    const matches=catalogue.filter(e=>norm(e.name+' '+e.species).includes(query));
    matches.sort((a,b)=>Number(norm(b.name)===query||norm(b.species)===query)-Number(norm(a.name)===query||norm(a.species)===query));
    for(const entry of matches.slice(0,6)){
     const item=document.createElement('li'),link=document.createElement('a');
     link.href='/wiki/pokedex/'+encodeURIComponent(entry.species)+'/'+panelHash();link.textContent=entry.name+' →';
     item.append(link);results.append(item);
    }
    results.hidden=!matches.length;
    status.textContent=matches.length>6?'6 fiches sur '+matches.length+' résultats. Précise le nom ou lance la recherche complète.':matches.length?matches.length+(matches.length===1?' fiche trouvée.':' fiches trouvées.'):'Aucun autre Pokémon trouvé. Essaie son nom français ou anglais.';
   }catch{if(version===revision)status.textContent='Suggestions indisponibles. Le bouton Rechercher ouvre le Pokédex.';}
  },180);
 });
 field.addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'&&!results.hidden){event.preventDefault();results.querySelector('a')?.focus();}
  if(event.key==='Escape'){++revision;clearTimeout(timer);results.hidden=true;status.hidden=true;}
 });
 results.addEventListener('keydown',event=>{
  if(event.key==='Escape'){results.hidden=true;status.hidden=true;field.focus();}
 });
 // The normal GET form remains a useful fallback without JavaScript or if the API is unavailable.
}
// The complete document is server-rendered. Only enhance it after JavaScript starts.
const tabNav=document.querySelector<HTMLElement>('.pokemon-sections');
if(tabNav){
 const links=[...tabNav.querySelectorAll<HTMLAnchorElement>('a')];
 const panels=[...document.querySelectorAll<HTMLElement>('[data-pokemon-panel]')];
 const tabs=links.map(link=>{
  const button=document.createElement('button');
  const id=link.hash.slice(1);
  button.type='button';button.textContent=link.textContent;button.id='tab-'+id;
  button.setAttribute('role','tab');button.setAttribute('aria-controls',id);
  link.replaceWith(button);
  const panel=document.getElementById(id)!;
  panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.tabIndex=0;
  return button;
 });
 tabNav.setAttribute('role','tablist');
 function activate(index:number,updateHash=false){
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});
  if(updateHash&&location.hash!=='#'+panels[index].id)history.pushState(null,'','#'+panels[index].id);
  retainPanel();
 }
 function fromHash(scroll=false){
  let id:string;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  const target=document.getElementById(id);
  const index=panels.findIndex(panel=>panel===target||!!target&&panel.contains(target));
  if(index>=0){activate(index);if(scroll)requestAnimationFrame(()=>target!.scrollIntoView({block:'start'}));}
  else if(!location.hash)activate(0);
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>activate(index,true));
  tab.addEventListener('keydown',event=>{
   let next=index;
   if(event.key==='ArrowRight')next=(index+1)%tabs.length;
   else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
   else if(event.key==='Home')next=0;
   else if(event.key==='End')next=tabs.length-1;
   else return;
   event.preventDefault();activate(next,true);tabs[next].focus();
  });
 });
 activate(0);fromHash(!!location.hash);
 window.addEventListener('hashchange',()=>fromHash(true));
 window.addEventListener('popstate',()=>fromHash());
}
const input=document.querySelector<HTMLInputElement>('#pokemon-move-search');
if(input){
 input.parentElement!.hidden=false;
 const moves=[...document.querySelectorAll<HTMLElement>('#pokemon-moves details')];
 const more=document.getElementById('pokemon-more-moves') as HTMLButtonElement;
 const count=document.getElementById('pokemon-move-count')!;
 const pageSize=12;let limit=pageSize;
 function filter(){
  const matching=moves.filter(move=>norm(move.dataset.search||'').includes(norm(input!.value.trim())));
  const shown=new Set(matching.slice(0,limit));
  for(const move of moves)move.hidden=!shown.has(move);
  count.textContent=matching.length?shown.size+' sur '+matching.length+' entrées d’apprentissage':'Aucune attaque ne correspond à cette recherche.';
  more.hidden=shown.size>=matching.length;
  return matching;
 }
 input.addEventListener('input',()=>{limit=pageSize;filter();});
 more.addEventListener('click',()=>{
  const previous=limit;limit+=pageSize;const matching=filter();
  // Move focus to the first newly revealed entry, including on the final batch.
  matching[previous]?.querySelector('summary')?.focus();
 });
 filter();
}
const host=document.getElementById('pokemon-model'),pause=document.getElementById('pokemon-pause') as HTMLButtonElement;
if(host?.dataset.asset){
 let renderer:ReturnType<typeof createDexRenderer>|undefined,dead=false,visible=true,time=0,previous=0,paused=true;
 const label=()=>{pause.textContent=paused?'Animer le Pokémon':'Mettre en pause';pause.setAttribute('aria-pressed',String(paused));};
 label();pause.addEventListener('click',()=>{paused=!paused;label();});
 const motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',()=>{if(motion.matches)paused=true;label();});
 const resize=new ResizeObserver(()=>renderer?.resize(host.clientWidth,host.clientHeight));resize.observe(host);
 const observer=new IntersectionObserver(e=>{visible=e[0].isIntersecting;});observer.observe(host);
 document.querySelectorAll<HTMLElement>('[data-pokemon-turn]').forEach(b=>b.addEventListener('click',()=>renderer?.turn(Number(b.dataset.pokemonTurn))));
 async function start(){try{const [module,r]=await Promise.all([import('./dex-renderer'),fetch(host!.dataset.asset!,{signal:AbortSignal.timeout(20000)})]);if(!r.ok)throw Error();const {asset}=await r.json();if(dead)return;renderer=module.createDexRenderer(true);renderer.resize(host!.clientWidth,host!.clientHeight);await renderer.set(asset);if(dead)return;host!.replaceChildren(renderer.canvas);document.getElementById('pokemon-controls')!.hidden=false;document.getElementById('pokemon-model-status')!.textContent='Glisse pour tourner le modèle.';function frame(now:number){if(dead)return;const dt=previous?Math.min((now-previous)/1000,.1):0;previous=now;if(!paused&&visible&&!document.hidden){time+=dt;renderer?.tick(time);}requestAnimationFrame(frame);}requestAnimationFrame(frame);}catch{document.getElementById('pokemon-model-status')!.textContent='Aperçu 3D indisponible. Toutes les informations restent consultables.';}}
 void start();window.addEventListener('pagehide',()=>{dead=true;resize.disconnect();observer.disconnect();renderer?.dispose();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
}
