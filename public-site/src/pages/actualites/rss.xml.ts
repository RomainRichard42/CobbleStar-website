import type { APIRoute } from 'astro';
import {SITE,publishedNews,newsUrl,xml,type PublicLocals} from '../../lib/content';
export const GET:APIRoute=async({locals})=>{
  const news=publishedNews(await (locals as PublicLocals).getNews());
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>CobbleStar — Actualités</title><link>${SITE}/actualites/</link><description>Les nouvelles du serveur CobbleStar</description><language>fr</language>${news.articles.map(a=>`<item><title>${xml(a.title)}</title><link>${xml(SITE+newsUrl(a))}</link><guid>${xml(SITE+newsUrl(a))}</guid><description>${xml(a.excerpt)}</description><pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
};
