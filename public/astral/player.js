(() => {
 const menu=document.querySelector('.astral-menu');
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.open=false}));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus()}});
 document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false});
 document.fonts.ready.then(()=>window.dispatchEvent(new Event('resize')));
 const player=document.querySelector('.gameplay-player'),host=document.querySelector('#video-host');
 const controls=document.createElement('button');
 controls.type='button';controls.className='text-button video-controls-toggle';controls.textContent='Commandes vidéo';controls.setAttribute('aria-pressed','false');
 document.querySelector('.gameplay-section .panel-heading').appendChild(controls);
 function syncVideoControls(){
   const locked=document.documentElement.classList.contains('snap-layout')&&!player.classList.contains('controls-active');
   host.querySelectorAll('iframe,video').forEach(media=>media.tabIndex=locked?-1:0);
 }
 controls.addEventListener('click',()=>{const enabled=player.classList.toggle('controls-active');controls.textContent=enabled?'Reprendre le parcours':'Commandes vidéo';controls.setAttribute('aria-pressed',String(enabled));syncVideoControls()});
 new MutationObserver(syncVideoControls).observe(host,{childList:true});
 new MutationObserver(syncVideoControls).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){player.classList.remove('controls-active');controls.textContent='Commandes vidéo';controls.setAttribute('aria-pressed','false');syncVideoControls()}},{threshold:0}).observe(player);
 syncVideoControls();
})();
