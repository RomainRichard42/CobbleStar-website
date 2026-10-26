import type { APIRoute } from 'astro';
import {SITE,staticPages,publishedWiki,publishedNews,wikiUrl,newsUrl,xml,type PublicLocals} from '../lib/content';
import {pageRevisions} from '../lib/revisions';
export const GET:APIRoute=async({locals})=>{
  const [wiki,news]=await Promise.all([(locals as PublicLocals).getWiki(),(locals as PublicLocals).getNews()]);
  const guides=publishedWiki(wiki).articles, posts=publishedNews(news).articles;
  const paths=[...staticPages,...guides.map(wikiUrl),...posts.map(newsUrl)];
  const revisions={...pageRevisions,...Object.fromEntries(guides.filter(a=>a.modifiedAt).map(a=>[wikiUrl(a),a.modifiedAt!]))};
  // Only recorded page edits qualify; the shared CMS timestamp is not an article modification date.
  const body=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(paths)].map(path=>`<url><loc>${xml(SITE+path)}</loc>${revisions[path]?`<lastmod>${xml(revisions[path])}</lastmod>`:''}</url>`).join('')}</urlset>`;
  return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=60'}});
};
