export const mobileLinks = [
  { href: '/roadmap/', title: 'Le serveur', detail: 'Astéria & Nébélia', icon: 'M12 3 3 8v8l9 5 9-5V8Zm0 0v18M3 8l9 5 9-5' },
  { href: '/wiki/', title: 'Wiki', detail: 'Tous les systèmes', icon: 'M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v15' },
  { href: '/wiki/pokedex/', title: 'Pokédex', detail: 'Pokémon & formes', icon: 'M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0ZM2 12h7m6 0h7m-7 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z' },
  { href: '/actualites/', title: 'Actualités', detail: 'Les nouvelles du serveur', icon: 'M4 3h16v18H4ZM8 7h8M8 11h8M8 15h3m3 0h2' },
  { href: '/vote/', title: 'Voter', detail: 'Soutenir CobbleStar', icon: 'm12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z' },
  { href: '/rejoindre/', title: 'Rejoindre', detail: 'Préparer l’ouverture', icon: 'M4 4h9v16H4m6-8h12m-5-5 5 5-5 5' },
];

export function bindMobileMenu(menu: HTMLDetailsElement) {
  const summary = menu.querySelector('summary')!;
  const desktop = matchMedia('(min-width: 1151px)');
  const disabled = new Map<HTMLElement, boolean>();
  function release() {
    disabled.forEach((value, element) => { element.inert = value; });
    disabled.clear();
    document.documentElement.classList.remove('player-menu-open');
  }
  function sync() {
    release();
    if (!menu.open) return;
    document.documentElement.classList.add('player-menu-open');
    let current: HTMLElement = menu;
    while (current.parentElement && current !== document.body) {
      for (const sibling of current.parentElement.children) {
        if (sibling !== current && sibling instanceof HTMLElement && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
          disabled.set(sibling, sibling.inert); sibling.inert = true;
        }
      }
      current = current.parentElement;
    }
    menu.querySelector<HTMLButtonElement>('[data-menu-close]')?.focus({ preventScroll: true });
  }
  function close() { menu.open = false; release(); summary.focus({ preventScroll: true }); }
  function click(event: MouseEvent) {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('[data-menu-close],a')) close();
  }
  function keydown(event: KeyboardEvent) {
    if (!menu.open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key !== 'Tab') return;
    const stops = [...menu.querySelectorAll<HTMLElement>('summary,a[href],button')].filter(element => element.getClientRects().length && !element.hasAttribute('tabindex'));
    const first = stops[0], last = stops.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  function resize() { if (desktop.matches && menu.open) close(); }
  menu.addEventListener('toggle', sync);
  menu.addEventListener('click', click);
  menu.addEventListener('keydown', keydown);
  desktop.addEventListener('change', resize);
  return () => { release(); menu.removeEventListener('toggle', sync); menu.removeEventListener('click', click); menu.removeEventListener('keydown', keydown); desktop.removeEventListener('change', resize); };
}
