// Private account data stays in memory and is never cached in localStorage.
export class CollectionSession {
  constructor(changed, request = (...args) => fetch(...args)) {
    this.changed = changed; this.request = request; this.data = null;
    this.generation = 0; this.busy = false; this.disposed = false;
    this.refresh = () => { if (!document.hidden) void this.reload(); };
    this.accountChanged = () => { this.generation++; this.data = null; this.changed(null, 'Actualisation du compte…'); void this.reload(); };
    this.timer = setInterval(this.refresh, 60000);
    window.addEventListener('focus', this.refresh);
    window.addEventListener('cobblestar:account-changed', this.accountChanged);
    document.addEventListener('visibilitychange', this.refresh);
  }
  message() {
    const data = this.data;
    if (!data) return 'Connecte-toi pour retrouver tes favoris et préparer tes captures.';
    if (!data.linked) return 'Lie ton compte Minecraft pour retrouver ton équipe et tes boîtes PC. Tu peux déjà enregistrer tes objectifs.';
    if (data.state === 'waiting') return 'Compte Minecraft lié. En attente de ta première synchronisation depuis le jeu.';
    if (data.state === 'unavailable') return 'La collection est momentanément illisible. Tes favoris et tes objectifs restent disponibles.';
    const date = data.observedAt ? new Date(data.observedAt).toLocaleString('fr-FR', {dateStyle:'short',timeStyle:'short'}) : '';
    return `${data.state === 'partial' ? 'Relevé incomplet : certains Pokémon peuvent manquer.' : 'Équipe et PC synchronisés.'}${date ? ' Dernier relevé : '+date+'.' : ''}`;
  }
  async reload() {
    if (this.busy || this.disposed) return;
    const generation = ++this.generation;
    try {
      const response = await this.request('/api/me/collection', {credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
      if (generation !== this.generation || this.disposed) return;
      if (response.status === 401) { this.data = null; this.changed(null, this.message()); return; }
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (generation !== this.generation || this.disposed) return;
      if (this.data && this.data.userId !== data.userId) this.changed(null, 'Changement de compte…');
      this.data = data; this.changed(data, this.message());
    } catch (error) {
      console.warn("Collection refresh failed", error);
      if (generation !== this.generation || this.disposed) return;
      this.data = null; this.changed(null, 'Le carnet est momentanément indisponible. Réessaie avec « Actualiser le carnet ».');
    }
  }
  async save(preference) {
    if (!this.data || this.busy || this.disposed) return false;
    const userId = this.data.userId, generation = ++this.generation;
    this.busy = true;
    try {
      const response = await this.request('/api/me/collection', {method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Collection-Account':userId},body:JSON.stringify(preference),signal:AbortSignal.timeout(15000)});
      if (generation !== this.generation || this.disposed) return false;
      if (response.status === 401 || response.status === 409) { this.data = null; this.changed(null,this.message()); throw new Error('Ton compte a changé. Reconnecte-toi avant d’enregistrer.'); }
      if (!response.ok) throw new Error('Enregistrement impossible. Tes choix restent dans la fiche : réessaie.');
      const result = await response.json();
      if (generation !== this.generation || this.disposed || result.userId !== userId || this.data?.userId !== userId) return false;
      this.data.preferences = [...this.data.preferences.filter(p => p.species !== preference.species),result.preference];
      this.changed(this.data,this.message()); return true;
    } finally {
      this.busy = false;
      if (!this.disposed && generation !== this.generation) void this.reload();
    }
  }
  dispose() {
    this.disposed = true; this.generation++; this.data = null; clearInterval(this.timer);
    window.removeEventListener('focus',this.refresh); window.removeEventListener('cobblestar:account-changed',this.accountChanged);
    document.removeEventListener('visibilitychange',this.refresh);
  }
}
