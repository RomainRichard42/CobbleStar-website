import { DISCORD_APP_INVITE, DISCORD_INVITE } from './community-links';

// Only community invitations launch the app. OAuth must keep its web callback.
export function bindDiscordInvites() {
  let dialog: HTMLDialogElement | undefined;
  function click(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.href !== DISCORD_INVITE || link.hasAttribute('data-discord-web')) return;
    event.preventDefault();
    // Close the mobile drawer before opening a modal outside its inert siblings.
    document.querySelectorAll<HTMLDetailsElement>('.player-menu[open]').forEach(menu => { menu.open = false; });
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'discord-launch-dialog';
      dialog.setAttribute('aria-labelledby', 'discord-launch-title');
      dialog.setAttribute('aria-describedby', 'discord-launch-description');
      dialog.innerHTML = `<button type="button" class="discord-launch-close" aria-label="Fermer">×</button>
        <h2 id="discord-launch-title">Ouvrir Discord</h2>
        <p id="discord-launch-description">Autorise ton navigateur à ouvrir l’application Discord.</p>
        <a class="discord-launch-primary" href="${DISCORD_APP_INVITE}">Réessayer l’application</a>
        <p class="discord-launch-help">L’application ne s’ouvre pas ?</p>
        <a class="discord-launch-web" href="${DISCORD_INVITE}" target="_blank" rel="noopener noreferrer" data-discord-web>Continuer sur le site Discord ↗</a>`;
      dialog.querySelector('button')!.addEventListener('click', () => dialog!.close());
      document.body.append(dialog);
    }
    if (!dialog.open) dialog.showModal();
    // Synchronous navigation retains the user's click; no app detection or timer.
    window.location.assign(DISCORD_APP_INVITE);
  }
  document.addEventListener('click', click);
  return () => { document.removeEventListener('click', click); dialog?.close(); dialog?.remove(); };
}
