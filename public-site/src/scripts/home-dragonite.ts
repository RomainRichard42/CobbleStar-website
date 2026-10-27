import type {createDexRenderer} from './dex-renderer';
const host=document.getElementById('home-dragonite')!;
const section=host.closest<HTMLElement>('.creation')!;
const pause=document.getElementById('dragonite-pause') as HTMLButtonElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer:ReturnType<typeof createDexRenderer>|undefined,loading=false,visible=false,paused=reduced.matches,dead=false,elapsed=0,previous=0,last=0;
function label(){pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Animer Dracolosse':'Mettre Dracolosse en pause';}
pause.addEventListener('click',()=>{paused=!paused;label();});reduced.addEventListener('change',()=>{paused=reduced.matches;label();});label();
const size=()=>renderer?.resize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight));
const resize=new ResizeObserver(size);resize.observe(host);
async function load(){if(loading||renderer)return;loading=true;
 try{const [module,response]=await Promise.all([import('./dex-renderer'),fetch('/api/pokedex/star-dragonite-base/asset',{signal:AbortSignal.timeout(20000)})]);if(!response.ok)throw Error('preview');const {asset}=await response.json();if(dead)return;
  renderer=module.createDexRenderer();size();await renderer.set(asset);if(dead)return;host.replaceChildren(renderer.canvas);pause.hidden=false;
 }catch{renderer?.dispose();renderer=undefined;pause.hidden=true;}finally{loading=false;}
}
const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)void load();},{rootMargin:'180px'});observer.observe(host);
function frame(now:number){if(dead)return;const dt=previous?Math.min((now-previous)/1000,.1):0;previous=now;
 if(renderer&&visible&&!document.hidden&&!paused&&!document.documentElement.classList.contains('motion-off')){
  elapsed+=dt;if(now-last>1000/30){last=now;const rect=section.getBoundingClientRect(),progress=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight+rect.height)));renderer.orbit((progress-.5)*1.25);renderer.tick(elapsed);host.style.setProperty('--dragonite-lift',((progress-.5)*-35)+'px');}
 }requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{dead=true;observer.disconnect();resize.disconnect();renderer?.dispose();renderer=undefined;});
window.addEventListener('pageshow',e=>{if(e.persisted){dead=false;previous=0;resize.observe(host);observer.observe(host);requestAnimationFrame(frame);}});
