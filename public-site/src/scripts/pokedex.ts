import {loadDetails,clearDetails} from './dex-details';
import {bindCollection} from './player-collection';
import type {PreviewAsset} from './bedrock-model';
type Renderer=ReturnType<typeof import('./dex-renderer').createDexRenderer>;
const cards=[...document.querySelectorAll<HTMLElement>('[data-dex]')];
const grid=document.getElementById('dex-grid')!;
const search=document.getElementById('dex-search') as HTMLInputElement;
const sort=document.getElementById('dex-sort') as HTMLSelectElement;
const more=document.getElementById('dex-more')!;
const status=document.getElementById('dex-status')!;
const dialog=document.getElementById('dex-dialog') as HTMLDialogElement;
const host=document.getElementById('dex-viewer')!;
const viewStatus=document.getElementById('dex-view-status')!;
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const query=new URLSearchParams(location.search);search.value=query.get('pokemon')||'';
let category=query.get('collection')||'all',limit=24,thumb:Renderer|undefined,viewer:Renderer|undefined,opening=0,trigger:HTMLElement|null=null,oldOverflow='';
const library=()=>import('./dex-renderer');
const assets=new Map<string,PreviewAsset>();
async function asset(url:string){if(assets.has(url))return assets.get(url)!;const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('Aperçu indisponible. Réessaie dans un instant.');const data=await response.json() as {asset:PreviewAsset};if(assets.size>=24)assets.delete(assets.keys().next().value!);assets.set(url,data.asset);return data.asset;}
let queue=Promise.resolve();
const visible=new Set<HTMLElement>(),loading=new Set<HTMLElement>();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches,dead=false,lastFrame=0,elapsed=0,previous=0;
const pauses=[document.getElementById('dex-pause')!,document.getElementById('dex-view-pause')!];
function updatePause(){for(const pause of pauses){pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Reprendre les animations':'Mettre les animations en pause';}}
pauses.forEach(pause=>pause.addEventListener('click',()=>{paused=!paused;updatePause();}));
reduced.addEventListener('change',()=>{paused=reduced.matches;updatePause();});updatePause();
function paint(card:HTMLElement,time:number){const canvas=card.querySelector('canvas');if(!canvas||!thumb?.show(card.dataset.asset!,time))return;const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(thumb.canvas,0,0);}
const observer=new IntersectionObserver(entries=>{for(const entry of entries){const card=entry.target as HTMLElement;if(!entry.isIntersecting){visible.delete(card);continue;}visible.add(card);if(card.hidden||loading.has(card)||!card.dataset.asset||thumb?.has(card.dataset.asset))continue;loading.add(card);queue=queue.then(async()=>{
 if(card.hidden){loading.delete(card);return;}
 const portrait=card.querySelector('.dex-portrait')!;
 try{thumb??=(await library()).createDexRenderer();thumb.resize(320,256);await thumb.set(await asset(card.dataset.asset!),card.dataset.asset);const canvas=document.createElement('canvas');canvas.width=320;canvas.height=256;canvas.setAttribute('aria-hidden','true');portrait.replaceChildren(canvas);card.dataset.rendered='true';paint(card,elapsed);}
 catch{portrait.textContent='Aperçu indisponible';}
 finally{loading.delete(card);}
 });}}, {rootMargin:'150px'});
function animate(now:number){if(dead)return;const delta=previous?Math.min((now-previous)/1000,.1):0;previous=now;
 if(!paused&&!document.hidden){elapsed+=delta;if(now-lastFrame>=1000/(dialog.open?30:12)){lastFrame=now;if(dialog.open)viewer?.tick(elapsed);else for(const c of visible)if(!c.hidden&&!loading.has(c))paint(c,elapsed);}}
 requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
function filter(){
 const terms=normalize(search.value).trim().split(/\s+/).filter(Boolean);
 const matches=cards.filter(c=>c.dataset.collectionMatch!=='false'&&(category==='all'||c.dataset.collection===category)&&terms.every(t=>normalize([c.dataset.name,c.dataset.species,c.dataset.collection,c.dataset.form].join(' ')).includes(t)));
 matches.sort((a,b)=>{const prefix=sort.value==='collection'?(a.dataset.collection||'').localeCompare(b.dataset.collection||'','fr'):0;return prefix||(a.dataset.name||'').localeCompare(b.dataset.name||'','fr')||(a.dataset.form||'').localeCompare(b.dataset.form||'','fr');});
 visible.clear();for(const c of cards){c.hidden=true;observer.unobserve(c);}
 for(const [i,c] of matches.entries()){grid.append(c);c.hidden=i>=limit;if(!c.hidden)observer.observe(c);}
 status.textContent=`${matches.length} apparence${matches.length>1?'s':''} · ${Math.min(limit,matches.length)} affichée${Math.min(limit,matches.length)>1?'s':''}`;
 more.hidden=matches.length<=limit;document.getElementById('dex-empty')!.hidden=matches.length>0;
}
search.addEventListener('input',()=>{limit=24;filter();});sort.addEventListener('change',()=>{limit=24;filter();});
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.filter!;limit=24;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filter();}));
more.addEventListener('click',()=>{const previous=limit;limit+=24;filter();grid.querySelectorAll<HTMLElement>('[data-dex]:not([hidden])')[previous]?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});});
const resize=new ResizeObserver(()=>viewer?.resize(Math.max(host.clientWidth,1),Math.max(host.clientHeight,1)));resize.observe(host);
async function open(card:HTMLElement){
 trigger=card.querySelector('button');const ticket=++opening;void loadDetails(card.dataset.id!);
 document.getElementById('dex-title')!.textContent=card.dataset.name!;document.getElementById('dex-subtitle')!.textContent=card.dataset.collection+' · '+card.dataset.form;host.setAttribute('aria-label',`Modèle 3D : ${card.dataset.name}, ${card.dataset.form}`);
 oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();viewStatus.textContent='Chargement du modèle…';
 try{const [module,data]=await Promise.all([library(),asset(card.dataset.asset!)]);if(ticket!==opening)return;viewer=module.createDexRenderer(true);host.replaceChildren(viewer.canvas);viewer.resize(Math.max(host.clientWidth,1),Math.max(host.clientHeight,1));await viewer.set(data);if(ticket===opening)viewStatus.textContent='';}
 catch{if(ticket===opening)viewStatus.textContent='Le modèle ne peut pas être affiché. Ferme puis rouvre cet aperçu pour réessayer.';}
}
cards.forEach(c=>c.querySelector('button')!.addEventListener('click',()=>void open(c)));
dialog.querySelector('.dex-close')!.addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{opening++;clearDetails();viewer?.dispose();viewer=undefined;document.body.style.overflow=oldOverflow;trigger?.focus({preventScroll:true});});
dialog.querySelectorAll<HTMLButtonElement>('[data-turn]').forEach(b=>b.addEventListener('click',()=>viewer?.turn(Number(b.dataset.turn)*Math.PI/6)));
dialog.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b=>b.addEventListener('click',()=>viewer?.zoom(Number(b.dataset.zoom))));
document.getElementById('dex-reset')!.addEventListener('click',()=>viewer?.reset());
window.addEventListener('pagehide',()=>{dead=true;observer.disconnect();resize.disconnect();thumb?.dispose();viewer?.dispose();thumb=viewer=undefined;});
window.addEventListener('pageshow',event=>{if(event.persisted){dead=false;previous=0;requestAnimationFrame(animate);resize.observe(host);filter();}});
filter();

document.querySelectorAll<HTMLElement>('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));

bindCollection(cards,()=>{limit=24;filter();});
