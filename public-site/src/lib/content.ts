import type {DexEntry} from '../../../api/src/public-dex';
import type { WikiEnvelope, WikiArticle } from '../../../app/wiki/wiki-types';
import type { NewsEnvelope } from '../../../app/actualites/news-types';
import {availableWiki} from '../../../api/src/wiki-availability';

export const SITE = 'https://cobblestar-mc.fr';
export const SERVER = 'play.cobblestar-mc.fr';
export const DISCORD = 'https://discord.gg/Sd387Ky4M';
export const DOWNLOAD = '/telecharger/';
export type PublicLocals = { getWiki: () => Promise<WikiEnvelope>; getNews: () => Promise<NewsEnvelope>; getDex:()=>Promise<DexEntry[]>; getDexInfo:(id:string)=>Promise<any> };
export function publishedWiki(envelope: WikiEnvelope) {
  envelope = {...envelope, content:availableWiki(envelope.content)};
  const branches = envelope.content.branches.filter(b => b.visible).sort((a,b) => a.order-b.order);
  const articles = envelope.content.articles.filter(a => a.published && branches.some(b => b.id === a.branchId)).sort((a,b) => a.order-b.order);
  return { ...envelope, branches: branches.filter(b=>articles.some(a=>a.branchId===b.id)), articles };
}
export function publishedNews(envelope: NewsEnvelope) {
  return { ...envelope, articles: envelope.content.articles.filter(a => a.published).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)) };
}
export const wikiUrl = (article: WikiArticle) => `/wiki/${article.id}/`;
export const newsUrl = (article: {slug:string}) => `/actualites/${article.slug}/`;
export const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g,'\\u003c');
export const xml = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export const safeImage = (src: string | undefined) => src && (/^\/(?!\/)/.test(src) || src.startsWith('https://raw.githubusercontent.com/PokeAPI/sprites/')) ? src : '/cobblemon-team.webp';
export const date = (value: string) => new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeZone:'Europe/Paris'}).format(new Date(value));
export const breadcrumbs = (items: {name:string;path:string}[]) => ({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:SITE+item.path}))});
export const staticPages = ['/', '/rejoindre/', '/minecraft-pokemon/', '/installer-cobblemon/', '/telecharger/', '/wiki/', '/wiki/pokedex/', '/actualites/', '/roadmap/', '/confidentialite/', '/boutique/', '/vote/'];
