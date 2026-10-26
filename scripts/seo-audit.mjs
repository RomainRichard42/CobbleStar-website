import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const origin=new URL(process.env.SEO_ORIGIN||'https://cobblestar-mc.fr').origin;
const canonicalOrigin='https://cobblestar-mc.fr';
const report={at:new Date().toISOString(),origin,pages:[],errors:[],warnings:[],metrics:{},notes:['HTTP checks are not Google rankings or field Core Web Vitals. Search Console is the source for impressions, clicks, queries and index coverage.']};
const fetchPage=async url=>{const response=await fetch(url,{headers:{'User-Agent':'CobbleStar-SEO-Audit/1.0'},signal:AbortSignal.timeout(15000)});return {response,html:await response.text()};};
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
try{
 const map=await fetchPage(origin+'/sitemap.xml');if(map.response.status!==200)throw new Error('Sitemap HTTP '+map.response.status);
 const urls=[...map.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));if(!urls.length)throw new Error('Empty sitemap');
 const titles=new Map(),descriptions=new Map();
 for(const url of urls){
  const expected=new URL(url);if(expected.origin!==canonicalOrigin)throw new Error('Unexpected sitemap origin');
  const {response,html}=await fetchPage(origin+expected.pathname);const title=html.match(/<title>(.*?)<\/title>/s)?.[1]||'';const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1]||'';const canonical=html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]||'';const h1=(html.match(/<h1(?:\s|>)/g)||[]).length;
  const errors=[];if(response.status!==200)errors.push('HTTP '+response.status);if(!title)errors.push('Missing title');if(!description)errors.push('Missing description');if(canonical!==url)errors.push('Wrong canonical: '+canonical);if(h1!==1)errors.push('H1 count: '+h1);if(/<meta name="robots" content="[^"]*noindex/.test(html)||/noindex/.test(response.headers.get('x-robots-tag')||''))errors.push('Sitemap page is noindex');
  if(titles.has(title))errors.push('Duplicate title with '+titles.get(title));titles.set(title,url);if(descriptions.has(description))report.warnings.push('Duplicate description: '+url);descriptions.set(description,url);
  const scripts=[...new Set([...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]))];
  const row={url,status:response.status,title,description,canonical,h1,renderer:response.headers.get('x-cobblestar-renderer')||'Next static',htmlBytes:Buffer.byteLength(html),scriptFiles:scripts.length,errors};report.pages.push(row);report.errors.push(...errors.map(e=>url+': '+e));
  if(expected.pathname==='/'){let bytes=0;for(const src of scripts){const asset=new URL(src,origin);if(asset.origin!==origin)continue;const r=await fetch(asset,{signal:AbortSignal.timeout(10000)});if(!r.ok)report.errors.push('Script HTTP '+r.status+': '+src);bytes+=(await r.arrayBuffer()).byteLength;}const inlineBytes=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src=')&&!m[1].includes('application/ld+json')).reduce((n,m)=>n+Buffer.byteLength(m[2]),0);report.metrics.home={htmlBytes:row.htmlBytes,scriptFiles:scripts.length,scriptBytes:bytes,inlineScriptBytes:inlineBytes,totalScriptBytes:bytes+inlineBytes};}
  for(const script of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))try{JSON.parse(script[1]);}catch{report.errors.push(url+': Invalid structured JSON');}
  for(const link of html.matchAll(/<a[^>]*href="([^"]+)"/g)){const href=decode(link[1]);if(/^javascript:|^data:/i.test(href))report.errors.push(url+': Unsafe link scheme');}
 }
 const robots=await fetchPage(origin+'/robots.txt');if(!robots.html.includes(canonicalOrigin+'/sitemap.xml'))report.errors.push('Missing sitemap in robots.txt');
 for(const path of ['/admin/discord/','/compte/','/maquettes/site-atlas/']){const r=await fetchPage(origin+path);if(!/noindex/.test(r.response.headers.get('x-robots-tag')||''))report.errors.push(path+': missing exclusion header');}
 for(const path of ['/wiki/not-a-published-guide/','/actualites/not-a-published-article/'])if((await fetchPage(origin+path)).response.status!==404)report.errors.push(path+': missing real 404');
}catch(error){report.errors.push(String(error.message||error));}
const output=process.env.SEO_REPORT||`seo/reports/audit-${new Date().toISOString().slice(0,10)}.json`;
await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pages:report.pages.length,errors:report.errors,warnings:report.warnings,metrics:report.metrics,report:output},null,2));if(report.errors.length)process.exitCode=1;
