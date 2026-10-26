(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CobbleStarMotion=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const clamp=v=>Math.max(0,Math.min(1,v));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v)};
  const phase=(p,start,end)=>ease((p-start)/(end-start));
  function point(i,r=130){const angle=-Math.PI/2+i*Math.PI/5,rad=i%2?r*.44:r;return {x:Math.cos(angle)*rad,y:Math.sin(angle)*rad}}
  function state(progress){const p=clamp(progress);return {p,merge:phase(p,.08,.34),letterOpacity:1-phase(p,.34,.45),starOpacity:phase(p,.25,.38)*(1-phase(p,.72,.88)),starScale:1-.92*phase(p,.51,.84),starFill:phase(p,.35,.48),cameraScale:1.64-.64*phase(p,.43,.95),cameraY:36*(1-phase(p,.43,.95)),copyOpacity:1-phase(p,.1,.28),revealOpacity:phase(p,.62,.82),mascotOpacity:1-phase(p,.04,.24),shade:.64-.38*phase(p,.45,.9)}}
  function introScroll(elapsed,from,heroEnd,videoEnd){return elapsed<1750?from+(heroEnd-from)*clamp(elapsed/1750):heroEnd+(videoEnd-heroEnd)*ease((elapsed-1750)/800)}
  function readingOffsets(height,usable){const distance=Math.max(0,height-usable);if(distance<120)return [];const count=Math.ceil(distance/usable);return Array.from({length:count},(_,i)=>distance*(i+1)/count)}
  return {clamp,ease,phase,point,state,introScroll,readingOffsets};
});
