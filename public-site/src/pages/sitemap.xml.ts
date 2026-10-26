import type { APIRoute } from 'astro';
import {SITE,staticPages,publishedWiki,publishedNews,wikiUrl,newsUrl,xml,type PublicLocals} from '../lib/content';
export const GET:APIRoute=async({locals})=>{
  const [wiki,news]=await Promise.all([(locals as PublicLocals).getWiki(),(locals as PublicLocals).getNews()]);
  const paths=[...staticPages,...publishedWiki(wiki).articles.map(wikiUrl),...publishedNews(news).articles.map(newsUrl)];
  // A document-level publication date is not an article modification date. Do not invent lastmod.
  const body=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(path=>`<url><loc>${xml(SITE+path)}</loc></url>`).join('')}</urlset>`;
  return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=60'}});
};
