import type {createDexRenderer} from './dex-renderer';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const input=document.querySelector<HTMLInputElement>('#pokemon-move-search');
if(input){input.parentElement!.hidden=false;const moves=[...document.querySelectorAll<HTMLElement>('#pokemon-moves details')];input.addEventListener('input',()=>{let count=0;for(const move of moves){move.hidden=!norm(move.dataset.search||'').includes(norm(input.value));if(!move.hidden)count++;}document.getElementById('pokemon-move-count')!.textContent=count+(count===1?' entrée d’apprentissage':' entrées d’apprentissage');});}
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
