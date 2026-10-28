type Preference = { species: string; favorite: boolean; wanted: boolean; target: number; shiny: boolean; note: string };
type Owned = { species: string; count: number; shiny: number; party: number; pc: number };
type Collection = { userId: string; linked: boolean; state: string; observedAt: number | null; owned: Owned[]; preferences: Preference[] };
const defaults = (species: string): Preference => ({ species, favorite: false, wanted: false, target: 1, shiny: false, note: '' });

export function bindCollection(cards: HTMLElement[], changed: () => void) {
 const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
 const privatePanel = byId('collection-private'), login = byId('collection-login'), sync = byId('collection-sync'), feedback = byId('collection-feedback');
 const dialog = byId<HTMLDialogElement>('collection-goal-dialog'), form = byId<HTMLFormElement>('collection-goal-form');
 const target = byId<HTMLInputElement>('collection-target'), shiny = byId<HTMLInputElement>('collection-target-shiny'), note = byId<HTMLTextAreaElement>('collection-note');
 const total = new Set(cards.map(c => c.dataset.species)).size;
 let state: Collection | null = null, preferences = new Map<string, Preference>(), owned = new Map<string, Owned>();
 let view = new URLSearchParams(location.search).get('suivi') || 'all', editing = '', generation = 0, busy = false, disposed = false;
 const views = [...document.querySelectorAll<HTMLButtonElement>('[data-collection-view]')];
 if (!views.some(b => b.dataset.collectionView === view)) view = 'all';
 const readable = () => !!state && ['ready', 'partial'].includes(state.state);
 const complete = (p: Preference) => readable() && (owned.get(p.species)?.[p.shiny ? 'shiny' : 'count'] || 0) >= p.target;
 const count = (p: Preference) => owned.get(p.species)?.[p.shiny ? 'shiny' : 'count'] || 0;
 const controls = new Map<HTMLElement, { root: HTMLElement; label: HTMLElement; favorite: HTMLButtonElement; wanted: HTMLButtonElement; edit: HTMLButtonElement; progress: HTMLProgressElement; note: HTMLElement }>();
 function button(text: string) { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; return b; }
 for (const card of cards) {
  const species = card.dataset.species!;
  const root = document.createElement('div'); root.className = 'collection-card'; root.hidden = true;
  const label = document.createElement('p'); label.className = 'collection-owned-label';
  const actions = document.createElement('div'); actions.className = 'collection-card-actions';
  const favorite = button('♡ Favori'), wanted = button('+ À capturer'), edit = button(''); edit.className = 'collection-goal-edit';
  const progress = document.createElement('progress'); const memo = document.createElement('p');
  actions.append(favorite, wanted); root.append(label, actions, edit, progress, memo); card.append(root);
  favorite.addEventListener('click', () => { const p = preferences.get(species) || defaults(species); void save({ ...p, favorite: !p.favorite }); });
  wanted.addEventListener('click', () => openGoal(species, card.dataset.name!));
  edit.addEventListener('click', () => openGoal(species, card.dataset.name!));
  controls.set(card, { root, label, favorite, wanted, edit, progress, note: memo });
 }
 function openGoal(species: string, name: string) {
  if (!state || busy) return;
  editing = species; const p = preferences.get(species) || defaults(species);
  byId('collection-goal-title').textContent = `Objectif : ${name}`;
  target.value = String(p.target); shiny.checked = p.shiny; note.value = p.note;
  byId('collection-goal-error').textContent = ''; byId('collection-goal-remove').hidden = !p.wanted;
  dialog.showModal();
 }
 function render() {
  privatePanel.hidden = !state;
  const goals = [...preferences.values()].filter(p => p.wanted);
  byId('collection-owned').textContent = readable() ? `${owned.size} / ${total}` : '—';
  byId('collection-shiny').textContent = readable() ? String([...owned.values()].reduce((n, p) => n + p.shiny, 0)) : '—';
  byId('collection-favorites').textContent = String([...preferences.values()].filter(p => p.favorite).length);
  byId('collection-goals').textContent = `${readable() || !goals.length ? goals.filter(complete).length : '—'} / ${goals.length}`;
  const percent = total && readable() ? owned.size / total * 100 : 0;
  byId('collection-percent').textContent = readable() ? `${percent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %${state?.state === 'partial' ? ' au minimum' : ''}` : 'En attente du jeu';
  byId<HTMLProgressElement>('collection-progress').value = percent;
  for (const b of views) { b.setAttribute('aria-pressed', String(b.dataset.collectionView === view)); b.disabled = !readable() && ['owned', 'missing', 'shiny', 'completed'].includes(b.dataset.collectionView!) || b.dataset.collectionView === 'missing' && state?.state === 'partial'; }
  let filterChanged = false;
  for (const [card, c] of controls) {
   c.root.hidden = !state;
   const species = card.dataset.species!, p = preferences.get(species) || defaults(species), item = owned.get(species);
   const achieved = p.wanted && complete(p);
   const match = String(view === 'all' || view === 'owned' && !!item || view === 'shiny' && !!item?.shiny || view === 'missing' && readable() && !item || view === 'favorite' && p.favorite || view === 'wanted' && p.wanted && !achieved || view === 'completed' && achieved);
   if (card.dataset.collectionMatch !== match) filterChanged = true;
   card.dataset.collectionMatch = match;
   c.label.textContent = !readable() ? 'Collection en attente du jeu' : item ? `Espèce possédée · ${item.count} (${item.party} équipe, ${item.pc} PC)${item.shiny ? ` · ${item.shiny} chromatique${item.shiny > 1 ? 's' : ''}` : ''}` : state?.state === 'partial' ? 'Non observé dans la synchronisation partielle' : 'Espèce non possédée';
   c.favorite.textContent = p.favorite ? '♥ Favori' : '♡ Favori'; c.favorite.setAttribute('aria-pressed', String(p.favorite)); c.favorite.setAttribute('aria-label', `${p.favorite ? 'Retirer des' : 'Ajouter aux'} favoris : ${card.dataset.name}`);
   c.wanted.textContent = p.wanted ? achieved ? '✓ Objectif atteint' : '◎ À capturer' : '+ À capturer'; c.wanted.setAttribute('aria-pressed', String(p.wanted)); c.wanted.setAttribute('aria-label', `Objectif de capture : ${card.dataset.name}`);
   c.edit.hidden = !p.wanted; c.edit.textContent = `${readable() ? count(p) : '—'} / ${p.target}${p.shiny ? ' chromatiques' : ' possédés'} · Modifier`;
   c.progress.hidden = !p.wanted || !readable(); c.progress.max = p.target; c.progress.value = count(p); c.progress.setAttribute('aria-label', `Objectif ${card.dataset.name}`);
   c.note.hidden = !p.wanted || !p.note; c.note.textContent = p.note;
   for (const b of [c.favorite, c.wanted, c.edit]) b.disabled = busy;
  }
  if (filterChanged) changed();
 }
 async function reload() {
  if (disposed || busy || document.hidden) return;
  const current = ++generation;
  try {
   const response = await fetch('/api/me/collection', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000) });
   if (current !== generation || disposed) return;
   if (response.status === 401) { state = null; preferences.clear(); owned.clear(); view = 'all'; login.hidden = false; sync.textContent = 'Ton carnet t’attend.'; dialog.close(); render(); return; }
   if (!response.ok) throw new Error();
   const data: Collection = await response.json(); if (current !== generation || disposed) return;
   if (state && state.userId !== data.userId) { view = 'all'; dialog.close(); }
   state = data; preferences = new Map(data.preferences.map(p => [p.species, p])); owned = new Map(data.owned.map(p => [p.species, p])); login.hidden = true;
   const time = data.observedAt ? new Date(data.observedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '';
   sync.textContent = !data.linked ? 'Tes listes sont enregistrées. Lie ton compte Minecraft depuis « Mon compte » pour synchroniser ton équipe et ton PC à l’ouverture.' : data.state === 'waiting' ? 'Ton compte Minecraft est lié. En attente de ta première synchronisation depuis le jeu.' : data.state === 'unavailable' ? 'La collection n’a pas pu être lue dans le jeu. Tes favoris et tes objectifs restent disponibles.' : `${data.state === 'partial' ? 'Synchronisation partielle : certains Pokémon peuvent manquer.' : 'Équipe et PC synchronisés.'} Dernier relevé : ${time}. Actualisation automatique toutes les minutes pendant la consultation.`;
   if (!readable() && ['owned', 'missing', 'shiny', 'completed'].includes(view) || data.state === 'partial' && view === 'missing') view = 'all';
   render();
  } catch { if (current === generation && !disposed) { state = null; owned.clear(); preferences.clear(); view = 'all'; dialog.close(); sync.textContent = 'Le carnet est momentanément indisponible. Réessaie dans quelques instants.'; login.hidden = true; render(); byId('collection-refresh').hidden = false; } }
 }
 async function save(p: Preference): Promise<boolean> {
  if (!state || busy) return false;
  const userId = state.userId, current = ++generation; busy = true; render(); feedback.textContent = 'Enregistrement…';
  for (const b of form.querySelectorAll<HTMLButtonElement>('button')) b.disabled = true;
  try {
   const response = await fetch('/api/me/collection', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Collection-Account': userId }, body: JSON.stringify(p), signal: AbortSignal.timeout(15000) });
   if (response.status === 401 || response.status === 409) { state = null; preferences.clear(); owned.clear(); view = 'all'; dialog.close(); login.hidden = false; throw new Error('Ton compte a changé. Actualise le carnet ou reconnecte-toi.'); }
   if (!response.ok) throw new Error('Enregistrement impossible. Réessaie.');
   const result = await response.json();
   if (current !== generation || state?.userId !== userId || result.userId !== userId) return false;
   preferences.set(p.species, result.preference); feedback.textContent = 'Carnet enregistré.'; return true;
  } catch (error) { if (current === generation) { const message = error instanceof Error ? error.message : 'Enregistrement impossible.'; feedback.textContent = message; byId('collection-goal-error').textContent = message; } return false; }
  finally { busy = false; for (const b of form.querySelectorAll<HTMLButtonElement>('button')) b.disabled = false; render(); }
 }
 form.addEventListener('submit', async event => { event.preventDefault(); const p = preferences.get(editing) || defaults(editing); if (await save({ ...p, wanted: true, target: Number(target.value), shiny: shiny.checked, note: note.value })) dialog.close(); });
 byId('collection-goal-remove').addEventListener('click', async () => { const p = preferences.get(editing) || defaults(editing); if (await save({ ...p, wanted: false })) dialog.close(); });
 byId('collection-goal-close').addEventListener('click', () => dialog.close());
 views.forEach(b => b.addEventListener('click', () => { view = b.dataset.collectionView!; const url = new URL(location.href); if (view === 'all') url.searchParams.delete('suivi'); else url.searchParams.set('suivi', view); history.replaceState(null, '', url); render(); }));
 byId('collection-refresh').addEventListener('click', () => void reload());
 const timer = window.setInterval(() => void reload(), 60000);
 const refresh = () => void reload();
 const accountChanged = () => { generation++; state = null; owned.clear(); preferences.clear(); dialog.close(); view = 'all'; render(); void reload(); };
 window.addEventListener('focus', refresh); window.addEventListener('cobblestar:account-changed', accountChanged); document.addEventListener('visibilitychange', refresh);
 window.addEventListener('pagehide', () => { disposed = true; generation++; clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('cobblestar:account-changed', accountChanged); });
 window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
 void reload();
}
