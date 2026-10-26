(() => {
  'use strict';
  const M=window.CobbleStarMotion,root=document.documentElement,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),room=matchMedia('(min-width: 721px) and (min-height: 590px)');
  let motion=!reduced.matches,stepped=true,story=false,steps=[],active=0,anim=0,animationDestination=0,queued=false,measureQueued=false,busyUntil=0,lastWheel=0,gestureTaken=false,wheelTotal=0;
  const runway=$('.opening-runway'),viewport=$('.opening-viewport'),track=$('.opening-track'),panels=$$('.opening-panel'),stage=panels[0];
  const letters=$$('.cinema-word [data-letter]'),star=$('.morph-star'),starLine=$('.morph-star-line'),starFill=$('.morph-star-fill'),camera=$('.game-camera>img'),shade=$('.camera-shade'),intro=$('.cinema-intro'),mascot=$('.cinema-mascot');
  const rail=$('.activity-viewport'),railCards=$$('.activity-card'),prev=$('#step-prev'),next=$('#step-next'),status=$('#journey-status'),bar=$('.journey-progress span');
  const decorativeScenes=[{section:$('.world-section'),images:$$('.world-photo img'),type:'world'},{section:$('.creation'),images:$$('.creation-visual>img'),type:'creation'},{section:$('.store-section'),images:$$('.store-art img'),type:'store'}];
  let headerH=88,stageH=700,heroTop=0,heroRange=900,horizontalDistance=650,maxY=0,cx=0,cy=0,radius=130,centers=[],lastVisual=-1,lastPanel=-1,lastTrack=-1;
  root.style.scrollBehavior='auto';
  const top=el=>el.getBoundingClientRect().top+scrollY;
  const focusableTarget=el=>el?.querySelector('h1,h2,h3')||el;
  function focusTarget(el){const dest=focusableTarget(el);if(!dest)return;if(!dest.hasAttribute('tabindex'))dest.setAttribute('tabindex','-1');dest.focus({preventScroll:true})}
  function measureSoon(){if(!measureQueued){measureQueued=true;requestAnimationFrame(()=>{measureQueued=false;measure()})}}
  function measure(){
    headerH=$('.site-header').offsetHeight;stageH=Math.max(400,innerHeight-headerH);story=motion&&stepped&&room.matches&&stageH>=490;
    root.style.setProperty('--stage-header',headerH+'px');root.style.setProperty('--stage-height',stageH+'px');
    heroRange=stageH*1.25;horizontalDistance=stageH*.9;root.style.setProperty('--opening-distance',(heroRange+horizontalDistance*2)+'px');
    root.classList.toggle('story-layout',story);root.classList.toggle('linear-layout',!story);root.classList.toggle('motion-off',!motion);
    if(!story){cancelAnimationFrame(anim);anim=0;busyUntil=0;track.style.removeProperty('transform');panels.forEach(p=>{p.inert=false;p.removeAttribute('aria-hidden')});letters.forEach(e=>{e.style.removeProperty('transform');e.style.removeProperty('opacity')});[star,camera,intro,mascot,shade].forEach(e=>{e.style.removeProperty('transform');e.style.removeProperty('opacity')});intro.inert=false;lastPanel=-1;lastTrack=-1}
    for(const scene of decorativeScenes){scene.start=top(scene.section);scene.height=scene.section.offsetHeight;if(!story)scene.images.forEach(image=>image.style.removeProperty('transform'))}
    letters.forEach(e=>e.style.transform='none');const bounds=stage.getBoundingClientRect();cx=bounds.width/2;cy=bounds.height*.43;radius=star.offsetWidth*130/310;
    centers=letters.map(e=>{const r=e.getBoundingClientRect();return {x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+r.height/2}});
    heroTop=Math.max(0,top(runway)-headerH);maxY=Math.max(0,root.scrollHeight-innerHeight);steps=[];
    const add=(y,name,el,extra={})=>{y=Math.max(0,Math.min(maxY,y));const last=steps.at(-1);if(last&&Math.abs(last.y-y)<8&&extra.rail===undefined)return;steps.push({y,name,el,...extra})};
    if(story){add(heroTop,'Accueil',panels[0],{panel:0});add(heroTop+heroRange+horizontalDistance,'Vidéo Cobblemon',panels[1],{panel:1});add(heroTop+heroRange+horizontalDistance*2,'Photos de Cobblemon',panels[2],{panel:2})}
    else panels.forEach((p,i)=>add(Math.max(0,top(p)-headerH),['Accueil','Vidéo Cobblemon','Photos de Cobblemon'][i],p,{panel:i}));
    for(const section of $$('main>section:not(.opening-runway)')){
      const start=Math.max(0,top(section)-headerH),usable=Math.max(320,innerHeight-headerH-40),height=section.offsetHeight,name=section.querySelector('h2')?.textContent.trim()||'CobbleStar';
      if(section.classList.contains('activity-runway'))railCards.forEach((card,i)=>add(start,['GTS','Pension','Raids','Métiers'][i],card,{rail:Math.max(0,card.offsetLeft-railCards[0].offsetLeft)}));else add(start,name,section);
      if(height>usable+80){const count=Math.ceil((height-usable)/usable);for(let i=1;i<=count;i++)add(start+Math.min(i*usable,height-usable),name,section)}
    }
    add(maxY,'Bas de page',$('footer'));active=Math.min(active,steps.length-1);lastVisual=-1;draw();
  }
  function nearest(){if(steps[active]&&Math.abs(scrollY-steps[active].y)<15)return active;let best=0,d=Infinity;steps.forEach((s,i)=>{const v=Math.abs(s.y-scrollY);if(v<d){d=v;best=i}});return best}
  function request(){if(!queued){queued=true;requestAnimationFrame(draw)}}
  function draw(){queued=false;if(!steps.length)return;if(!anim)active=nearest();prev.disabled=active===0;next.disabled=active===steps.length-1;bar.style.transform=`scaleX(${M.clamp(scrollY/Math.max(1,maxY))})`;if(!story)return;
    for(const scene of decorativeScenes){const q=M.clamp((scrollY+innerHeight-scene.start)/(innerHeight+scene.height));scene.images.forEach((image,i)=>{image.style.transform=scene.type==='world'?`scale(1.12) translateY(${(q-.5)*(i?45:-45)}px)`:scene.type==='creation'?`translateY(${(q-.5)*-45}px) rotate(${(q-.5)*-5}deg)`:`translateY(${(q-.5)*(i%2?-28:28)}px) rotate(${(q-.5)*(i-1)*6}deg)`})}
    const p=M.clamp((scrollY-heroTop)/heroRange),horizontal=Math.max(0,Math.min(2,(scrollY-heroTop-heroRange)/horizontalDistance)),panel=Math.round(horizontal);
    if(Math.abs(horizontal-lastTrack)>.00001){track.style.transform=`translate3d(${-horizontal*viewport.clientWidth}px,0,0)`;lastTrack=horizontal}
    if(panel!==lastPanel){panels.forEach((el,i)=>{el.inert=i!==panel;el.setAttribute('aria-hidden',String(i!==panel))});lastPanel=panel}
    if(Math.abs(p-lastVisual)<.00001)return;lastVisual=p;const s=M.state(p);
    letters.forEach((el,i)=>{const point=M.point(i,radius),c=centers[i];if(!c)return;el.style.transform=`translate(${(cx+point.x-c.x)*s.merge}px,${(cy+point.y-c.y)*s.merge}px) rotate(${(i*36-18)*s.merge}deg) scale(${1-s.merge*.76})`;el.style.opacity=String(s.letterOpacity)});
    star.style.opacity=String(s.starOpacity);star.style.transform=`scale(${s.starScale}) rotate(${s.p>.5?(s.p-.5)*32:0}deg)`;starFill.style.opacity=String(s.starFill);starLine.style.strokeDashoffset=String(100*(1-M.phase(s.p,.2,.39)));
    camera.style.transform=`translateY(${s.cameraY}px) scale(${s.cameraScale})`;shade.style.opacity=String(.7+s.shade*.4);intro.style.opacity=String(s.copyOpacity);intro.style.transform=`translateY(${-30*(1-s.copyOpacity)}px)`;intro.inert=s.copyOpacity<.1;mascot.style.opacity=String(s.mascotOpacity);mascot.style.transform=`translateY(${-p*80}px) rotate(${-9+p*30}deg)`;
  }
  function finish(index,focus){anim=0;active=index;draw();if(focus)focusTarget(steps[index]?.el);status.textContent=steps[index]?.name||''}
  function go(index,options={}){
    if(!steps.length)return;index=Math.max(0,Math.min(steps.length-1,index));const source=active,target=steps[index],from=scrollY;cancelAnimationFrame(anim);anim=0;active=index;animationDestination=index;
    const focus=Boolean(options.focus)||panels.some(p=>p.contains(document.activeElement))&&!target.el.contains(document.activeElement);
    if(target.rail!==undefined)rail.scrollTo({left:target.rail,behavior:motion&&!options.instant?'smooth':'auto'});
    const introSequence=story&&source===0&&index===1&&!options.instant;
    const duration=options.instant||!motion?0:introSequence?2550:650;busyUntil=performance.now()+duration+90;
    if(!duration||Math.abs(target.y-from)<2){window.scrollTo(0,target.y);finish(index,focus);return}
    const started=performance.now(),heroEnd=heroTop+heroRange;
    function tick(now){const elapsed=now-started;let y;
      if(introSequence)y=M.introScroll(elapsed,from,heroEnd,target.y);
      else y=from+(target.y-from)*M.ease(elapsed/duration);
      window.scrollTo(0,y);draw();if(elapsed<duration)anim=requestAnimationFrame(tick);else{window.scrollTo(0,target.y);finish(index,focus)}
    }
    anim=requestAnimationFrame(tick);
  }
  function move(dir,keyboard=false){go(active+dir,{focus:keyboard})}
  function isControl(el){return el instanceof Element&&Boolean(el.closest('input,textarea,select,video,iframe,button,a,summary,[contenteditable=true],.display-settings,.preview-tools'))}
  addEventListener('wheel',event=>{if(!story||event.ctrlKey||event.metaKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||event.target instanceof Element&&event.target.closest('input,textarea,select,video,iframe,.display-settings,.preview-tools')||!event.deltaY)return;event.preventDefault();const now=performance.now(),idle=now-lastWheel;lastWheel=now;if(idle>170){gestureTaken=false;wheelTotal=0}if(now<busyUntil||gestureTaken)return;wheelTotal+=event.deltaY*(event.deltaMode===1?18:event.deltaMode===2?innerHeight:1);if(Math.abs(wheelTotal)>=22){gestureTaken=true;move(wheelTotal>0?1:-1);wheelTotal=0}},{passive:false});
  addEventListener('keydown',event=>{
    if(event.key==='Escape'){const menu=$('.display-settings');if(menu.open){menu.open=false;menu.querySelector('summary').focus();return}if(anim){cancelAnimationFrame(anim);anim=0;go(animationDestination,{instant:true,focus:true})}return}
    if(event.key==='Tab'){if(anim){cancelAnimationFrame(anim);anim=0;go(animationDestination,{instant:true,focus:true})}return}
    if(!story||isControl(event.target)||event.ctrlKey||event.metaKey||event.altKey)return;
    if(!['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End'].includes(event.key))return;event.preventDefault();if(event.repeat)return;
    if(event.key==='Home')go(0,{focus:true});else if(event.key==='End')go(steps.length-1,{focus:true});else move(['ArrowUp','PageUp'].includes(event.key)||event.key===' '&&event.shiftKey?-1:1,true);
  });
  prev.onclick=()=>move(-1,true);next.onclick=()=>move(1,true);$('#start-journey').onclick=()=>go(1,{focus:true});
  $$('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{const dest=document.getElementById(link.hash.slice(1));if(!dest)return;event.preventDefault();let index=steps.findIndex(s=>s.el===dest||s.el.contains(dest));if(index<0){const y=Math.max(0,top(dest)-headerH);index=steps.reduce((best,s,i)=>Math.abs(s.y-y)<Math.abs(steps[best].y-y)?i:best,0)}go(index,{focus:true,instant:link.classList.contains('skip')||link.classList.contains('intro-skip')});if(link.classList.contains('skip'))focusTarget(dest)}));
  rail.addEventListener('focusin',event=>{const card=event.target.closest('.activity-card');if(!story||!card)return;const index=steps.findIndex(s=>s.el===card);if(index>=0){active=index;rail.scrollTo({left:steps[index].rail,behavior:'auto'});draw()}});
  // Visible native controls and a separate Stop action are kept even for muted autoplay.
  const player=$('.gameplay-player'),host=$('#video-host'),startVideoButton=$('.video-start'),pauseVideoButton=$('#video-pause'),videoStatus=$('#video-status');
  let videoVisible=false,userPaused=false,localVideoURL=null,photoURLs=[],iframe=null,localVideo=null;
  function stopVideo(){if(localVideo)localVideo.pause();if(iframe){const focused=document.activeElement===iframe;iframe.remove();iframe=null;if(focused)pauseVideoButton.focus({preventScroll:true})}player.classList.remove('video-live');startVideoButton.hidden=false;pauseVideoButton.textContent='Lire la vidéo'}
  function startVideo(explicit=false){if(!explicit&&(!motion||document.hidden||userPaused))return;if(explicit)userPaused=false;
    if(localVideo){localVideo.muted=true;localVideo.play().then(()=>{player.classList.add('video-live');startVideoButton.hidden=true;pauseVideoButton.textContent='Mettre la vidéo en pause';videoStatus.textContent='Vidéo locale en lecture, sans son.'}).catch(()=>{startVideoButton.hidden=false;videoStatus.textContent='La lecture automatique est bloquée. Utilise le bouton Lire la vidéo.'});return}
    if(iframe)return;iframe=document.createElement('iframe');iframe.title='Vidéo officielle Cobblemon, lecture sans son';iframe.src='https://www.youtube-nocookie.com/embed/'+player.dataset.videoId+'?autoplay=1&mute=1&playsinline=1&controls=1&rel=0&cc_load_policy=1';iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';host.appendChild(iframe);player.classList.add('video-live');startVideoButton.hidden=true;pauseVideoButton.textContent='Arrêter la vidéo';videoStatus.textContent='Lecteur Cobblemon chargé. Les commandes de lecture sont disponibles dans la vidéo.';
  }
  startVideoButton.onclick=()=>startVideo(true);pauseVideoButton.onclick=()=>{if(iframe||localVideo&&!localVideo.paused){userPaused=true;stopVideo();videoStatus.textContent='Vidéo arrêtée.'}else startVideo(true)};
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{videoVisible=entries[0].intersectionRatio>=.55;if(videoVisible)startVideo();else stopVideo()},{threshold:[0,.55]}).observe(player);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopVideo();else if(videoVisible)startVideo()});
  $('#local-gameplay').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file||!file.type.startsWith('video/'))return;stopVideo();host.replaceChildren();if(localVideoURL)URL.revokeObjectURL(localVideoURL);localVideoURL=URL.createObjectURL(file);localVideo=document.createElement('video');localVideo.src=localVideoURL;localVideo.muted=true;localVideo.playsInline=true;localVideo.controls=true;localVideo.preload='metadata';host.appendChild(localVideo);localVideo.addEventListener('error',()=>{videoStatus.textContent='Ce format ne peut pas être lu. Choisis un MP4 ou WebM.';startVideoButton.hidden=false});videoStatus.textContent='Vidéo locale sélectionnée. Aucun fichier envoyé.';if(videoVisible)startVideo()});
  $('#local-photos').addEventListener('change',event=>{const files=[...(event.target.files||[])].filter(f=>f.type.startsWith('image/'));if(!files.length)return;photoURLs.forEach(URL.revokeObjectURL);photoURLs=files.slice(0,3).map(f=>URL.createObjectURL(f));const fallback=['assets/ocean.webp','assets/berries.webp','assets/desert.webp'];$$('.photo-wall figure').forEach((figure,i)=>{figure.querySelector('img').src=photoURLs[i]||fallback[i];figure.querySelector('img').alt=photoURLs[i]?'Photo sélectionnée pour la maquette': ['Pokémon dans un paysage sous-marin','Cultures de baies','Pokémon dans un désert'][i];figure.querySelector('figcaption').textContent=photoURLs[i]?'Photo '+(i+1):['Océan','Cultures de baies','Désert'][i]});camera.src=photoURLs[0];measureSoon()});
  function updatePreferences(preserve=true){const anchor=steps[active]?.el;cancelAnimationFrame(anim);anim=0;busyUntil=0;$('.motion-button').setAttribute('aria-pressed',String(motion));$('.motion-button').textContent=motion?'Animations activées':'Animations désactivées';$('.step-mode').setAttribute('aria-pressed',String(stepped));$('.step-mode').textContent=stepped?'Défilement par étapes':'Défilement libre';if(!motion)stopVideo();measure();if(preserve&&anchor){const index=steps.findIndex(s=>s.el===anchor);if(index>=0)go(index,{instant:true})}if(motion&&videoVisible)startVideo()}
  $('.motion-button').onclick=()=>{motion=!motion&&!reduced.matches;updatePreferences()};$('.step-mode').onclick=()=>{stepped=!stepped;updatePreferences()};
  addEventListener('message',event=>{if(event.source===parent&&event.data?.type==='cobblestar-motion'&&typeof event.data.enabled==='boolean'){motion=event.data.enabled&&!reduced.matches;updatePreferences(false)}});
  reduced.addEventListener('change',()=>{motion=!reduced.matches;updatePreferences()});room.addEventListener('change',measureSoon);
  addEventListener('scroll',request,{passive:true});addEventListener('resize',measureSoon,{passive:true});addEventListener('load',measureSoon);
  $$('img').forEach(img=>{if(!img.complete)img.addEventListener('load',measureSoon,{once:true})});$$('.faq details,.preview-tools').forEach(d=>d.addEventListener('toggle',measureSoon));
  if('ResizeObserver' in window)new ResizeObserver(measureSoon).observe($('.site-header'));
  addEventListener('beforeunload',()=>{if(localVideoURL)URL.revokeObjectURL(localVideoURL);photoURLs.forEach(URL.revokeObjectURL)});
  root.classList.add('js');updatePreferences(false);
})();

