import { DISCORD_APP_INVITE, DISCORD_INVITE } from './community-links';

export function openDiscordApp(connected = false) {
    let dialog = document.querySelector<HTMLDialogElement>('#discord-launch-dialog');
    // Close the mobile drawer before opening a modal outside its inert siblings.
    document.querySelectorAll<HTMLDetailsElement>('.player-menu[open]').forEach(menu => { menu.open = false; });
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'discord-launch-dialog';
      dialog.className = 'discord-launch-dialog';
      dialog.setAttribute('aria-labelledby', 'discord-launch-title');
      dialog.setAttribute('aria-describedby', 'discord-launch-description');
      dialog.innerHTML = `<button type="button" class="discord-launch-close" aria-label="Fermer">×</button>
        <h2 id="discord-launch-title">Ouvrir Discord</h2>
        <p id="discord-launch-description">Autorise ton navigateur à ouvrir l’application Discord.</p>
        <a class="discord-launch-primary" href="${DISCORD_APP_INVITE}">Réessayer l’application</a>
        <p class="discord-launch-help">L’application ne s’ouvre pas ?</p>
        <a class="discord-launch-web" href="${DISCORD_INVITE}" target="_blank" rel="noopener noreferrer" data-discord-web>Continuer sur le site Discord ↗</a>`;
      const createdDialog = dialog;
      dialog.querySelector('button')!.addEventListener('click', () => createdDialog.close());
      document.body.append(dialog);
    }
    dialog.querySelector('h2')!.textContent = connected ? 'Connexion réussie' : 'Ouvrir Discord';
    dialog.querySelector('#discord-launch-description')!.textContent = connected
      ? 'Tu es connecté au site et tu as rejoint le Discord CobbleStar. Autorise ton navigateur à ouvrir l’application.'
      : 'Autorise ton navigateur à ouvrir l’application Discord.';
    if (!dialog.open) dialog.showModal();
    window.location.assign(DISCORD_APP_INVITE);
}

// OAuth first keeps its signed state and web callback. Invitation clicks and
// successful logins share the same application handoff and explicit web fallback.
export function bindDiscordInvites() {
  function click(event: MouseEvent) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.href !== DISCORD_INVITE || link.hasAttribute('data-discord-web')) return;
    event.preventDefault();
    openDiscordApp();
  }
  document.addEventListener('click', click);
  return () => { document.removeEventListener('click', click); const dialog = document.querySelector<HTMLDialogElement>('#discord-launch-dialog'); dialog?.close(); dialog?.remove(); };
}
