import type {createDexRenderer} from './dex-renderer';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
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
  if(updateHash)history.pushState(null,'','#'+panels[index].id);
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
 let renderer:ReturnType<typeof createDexRenderer>|undefined,dead=false,visible=true,time=0,previous=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const label=()=>{pause.textContent=paused?'Animer le Pokémon':'Mettre en pause';pause.setAttribute('aria-pressed',String(paused));};
 label();pause.addEventListener('click',()=>{paused=!paused;label();});
 const motion=matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',()=>{paused=motion.matches;label();});
 const resize=new ResizeObserver(()=>renderer?.resize(host.clientWidth,host.clientHeight));resize.observe(host);
 const observer=new IntersectionObserver(e=>{visible=e[0].isIntersecting;});observer.observe(host);
 document.querySelectorAll<HTMLElement>('[data-pokemon-turn]').forEach(b=>b.addEventListener('click',()=>renderer?.turn(Number(b.dataset.pokemonTurn))));
 async function start(){try{const [module,r]=await Promise.all([import('./dex-renderer'),fetch(host!.dataset.asset!,{signal:AbortSignal.timeout(20000)})]);if(!r.ok)throw Error();const {asset}=await r.json();if(dead)return;renderer=module.createDexRenderer(true);renderer.resize(host!.clientWidth,host!.clientHeight);await renderer.set(asset);if(dead)return;host!.replaceChildren(renderer.canvas);document.getElementById('pokemon-controls')!.hidden=false;document.getElementById('pokemon-model-status')!.textContent='Glisse pour tourner le modèle.';function frame(now:number){if(dead)return;const dt=previous?Math.min((now-previous)/1000,.1):0;previous=now;if(!paused&&visible&&!document.hidden){time+=dt;renderer?.tick(time);}requestAnimationFrame(frame);}requestAnimationFrame(frame);}catch{document.getElementById('pokemon-model-status')!.textContent='Aperçu 3D indisponible. Toutes les informations restent consultables.';}}
 void start();window.addEventListener('pagehide',()=>{dead=true;resize.disconnect();observer.disconnect();renderer?.dispose();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
}
