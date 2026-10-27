type PublicWiki = {
  branches: { id: string; label: string }[];
  articles: { id: string; modifiedAt?: string; blocks: unknown[] }[];
};

// Public availability is independent of saved CMS drafts. Keep the archived draft
// recoverable, but never advertise this unavailable activity through an old publication.
const replacements = new Map([
  ['Mondes & PokéPark', 'Mondes & exploration'],
  ['Un Pokémon Star reste un vrai Pokémon avec une apparence particulière. Une incarnation du Cosmédex habille visuellement ton personnage. Une carte d’album est un objet de collection. Un Poké-Résonant appartient à la progression séparée de PokéPark. Ces quatre systèmes ne se remplacent pas.',
   'Un Pokémon Star reste un vrai Pokémon avec une apparence particulière. Une incarnation du Cosmédex habille visuellement ton personnage. Une carte d’album est un objet de collection. Ces trois systèmes ne se remplacent pas.'],
  ['/epreuves, /ligue et /pokepark ouvrent les activités correspondantes. Le Ranked se lance auprès de son responsable.',
   '/epreuves et /ligue ouvrent les activités correspondantes. Le Ranked se lance auprès de son responsable.'],
]);

function correctText(value: unknown): unknown {
  if (typeof value === 'string') return replacements.get(value) ?? value;
  if (Array.isArray(value)) return value.map(correctText);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,correctText(item)]));
  return value;
}

export function availableWiki<T extends PublicWiki>(document: T): T {
  const result = correctText(document) as T;
  result.articles = result.articles.filter(article => article.id !== 'pokepark');
  for (const article of result.articles) {
    const previous = document.articles.find(item=>item.id===article.id);
    if (JSON.stringify(previous?.blocks)!==JSON.stringify(article.blocks)) {
      // This is a real editorial correction, not a date refreshed on every request.
      article.modifiedAt = article.modifiedAt && article.modifiedAt > '2026-10-27' ? article.modifiedAt : '2026-10-27';
    }
  }
  return result;
}
