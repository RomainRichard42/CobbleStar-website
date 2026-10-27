import type {WikiArticle} from '../../../app/wiki/wiki-types';

export const wikiJourneys = [
  {title:'Je débute', text:'Compte → premiers pas → équipe', ids:['compte','welcome','capture']},
  {title:'Je prépare mes Pokémon', text:'Pension → talents → combats', ids:['daycare','talents','ranked']},
  {title:'Je développe mon aventure', text:'Métiers → économie → club', ids:['metiers','monnaies','clubs']},
  {title:'Je collectionne', text:'Boosters → certification → galerie', ids:['album','galerie','cosmedex']},
];

const connections: Record<string,string[]> = {
  welcome:['compte','starters','quests','metiers'], compte:['welcome','votes','boutique','parrainage'],
  deplacements:['mondes','clubs','grades'], commandes:['welcome','deplacements','monnaies'],
  capture:['starters','daycare','pokemon-star','legendaries'], starters:['capture','mondes','daycare'],
  daycare:['metiers','talents','capture','gts'], 'pokemon-star':['capture','daycare','cosmedex','parrainage'],
  legendaries:['capture','mondes','pokemon-star'], quests:['metiers','battlepass','epreuves'],
  metiers:['talents','monnaies','daycare','quests'], talents:['metiers','daycare','grades'],
  grades:['votes','epreuves','album','tags'], battlepass:['quests','raids','boutique'],
  mondes:['deplacements','clubs','legendaries'],
  raids:['capture','battlepass','epreuves'], epreuves:['ligue','grades','capture'],
  ligue:['epreuves','daycare','ranked'], ranked:['daycare','ligue','grades'],
  monnaies:['gts','pokesell','metiers','boutique'], gts:['pokesell','monnaies','grades','daycare'],
  pokesell:['gts','monnaies','capture'], boutique:['compte','monnaies','battlepass','caisses'],
  votes:['compte','caisses','grades'], clubs:['mondes','monnaies','organisations','tags'],
  organisations:['clubs','deplacements'], parrainage:['compte','caisses','pokemon-star'],
  tags:['grades','carte-dresseur','clubs'], 'carte-dresseur':['tags','album','cosmedex'],
  album:['galerie','grades','carte-dresseur'], galerie:['album','clubs','monnaies'],
  caisses:['votes','parrainage','boutique'], cosmedex:['pokemon-star','parrainage','carte-dresseur'],
};

export function relatedGuides(article:WikiArticle, articles:WikiArticle[]) {
  const ids=[...(connections[article.id]??[]),...articles.filter(a=>a.branchId===article.branchId).map(a=>a.id)];
  return [...new Set(ids)].filter(id=>id!==article.id).map(id=>articles.find(a=>a.id===id)).filter((a):a is WikiArticle=>!!a).slice(0,4);
}

// Index player-facing text, including commands and FAQ answers, not JSON keys or image URLs.
export function guideSearchText(article:WikiArticle) {
  return [article.title,article.summary,...article.tags,...article.blocks.flatMap(b=>[
    b.text,b.title,b.command,b.leftTitle,b.rightTitle,...(b.leftItems??[]),...(b.rightItems??[]),
    ...(b.items??[]).flatMap(i=>typeof i==='string'?[i]:[i.title,i.text]),
  ])].filter(Boolean).join(' ');
}
