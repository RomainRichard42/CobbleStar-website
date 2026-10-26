(() => {
 const menu=document.querySelector('.mobile-navigation');
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.open=false}));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus()}});
 document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false});
 document.fonts.ready.then(()=>window.dispatchEvent(new Event('resize')));
})();
