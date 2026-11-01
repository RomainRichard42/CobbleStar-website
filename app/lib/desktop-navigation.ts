import {DISCORD_INVITE} from './community-links';
export const desktopLinks = [['/wiki/', 'Wiki'], ['/wiki/pokedex/', 'Pokédex'], ['/actualites/', 'Actualités'], ['/vote/', 'Voter'], [DISCORD_INVITE, 'Discord']];
export const serverLinks = [
  { href: '/wiki/mondes/', title: 'Astéria & Nébélia', detail: 'Découvrir les deux mondes' },
  { href: '/#activites', title: 'Les activités', detail: 'GTS, raids, pension, métiers' },
  { href: '/rejoindre/', title: 'Premiers pas', detail: 'Préparer l’ouverture' },
  { href: DISCORD_INVITE, title: 'Le Discord ↗', detail: 'Retrouver la communauté' },
];
export function desktopLinkActive(pathname: string, href: string) {
  return pathname.startsWith(href) && (href !== '/wiki/' || !pathname.startsWith('/wiki/pokedex/'));
}
export function bindDesktopMenu(menu: HTMLDetailsElement) {
  const summary = menu.querySelector('summary')!;
  const mobile = matchMedia('(max-width: 1150px)');
  function close(focus = false) { menu.open = false; if (focus) summary.focus({ preventScroll: true }); }
  function outside(event: MouseEvent) { if (menu.open && event.target instanceof Node && !menu.contains(event.target)) close(); }
  function keydown(event: KeyboardEvent) { if (menu.open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); } }
  function select(event: MouseEvent) { if (event.target instanceof Element && event.target.closest('a')) close(); }
  function focusout(event: FocusEvent) { if (event.relatedTarget instanceof Node && !menu.contains(event.relatedTarget)) close(); }
  function resize() { if (mobile.matches) close(); }
  document.addEventListener('click', outside);
  menu.addEventListener('keydown', keydown);
  menu.addEventListener('click', select);
  menu.addEventListener('focusout', focusout);
  mobile.addEventListener('change', resize);
  return () => { document.removeEventListener('click', outside); menu.removeEventListener('keydown', keydown); menu.removeEventListener('click', select); menu.removeEventListener('focusout', focusout); mobile.removeEventListener('change', resize); };
}
