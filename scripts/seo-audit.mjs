import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const origin=new URL(process.env.SEO_ORIGIN||'https://cobblestar-mc.fr').origin;
const canonicalOrigin='https://cobblestar-mc.fr';
const report={at:new Date().toISOString(),origin,pages:[],errors:[],warnings:[],metrics:{},notes:['HTTP checks are not Google rankings or field Core Web Vitals. Search Console is the source for impressions, clicks, queries and index coverage.']};
const fetchPage=async url=>{const response=await fetch(url,{headers:{'User-Agent':'CobbleStar-SEO-Audit/1.0'},signal:AbortSignal.timeout(15000)});return {response,html:await response.text()};};
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
const documents=new Map(),links=new Map(),images=new Map();
try{
 const map=await fetchPage(origin+'/sitemap.xml');if(map.response.status!==200)throw new Error('Sitemap HTTP '+map.response.status);
 const urls=[...map.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));if(!urls.length)throw new Error('Empty sitemap');
 if(urls.length>250)throw new Error('Sitemap page limit (250) reached');
 const titles=new Map(),descriptions=new Map();
 for(const url of urls){
  const expected=new URL(url);if(expected.origin!==canonicalOrigin)throw new Error('Unexpected sitemap origin');
  const {response,html}=await fetchPage(origin+expected.pathname);const title=html.match(/<title>(.*?)<\/title>/s)?.[1]||'';const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1]||'';const canonical=html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]||'';const h1=(html.match(/<h1(?:\s|>)/g)||[]).length;
  documents.set(expected.pathname,{response,html});
  const errors=[];if(response.status!==200)errors.push('HTTP '+response.status);if(!title)errors.push('Missing title');if(!description)errors.push('Missing description');if(canonical!==url)errors.push('Wrong canonical: '+canonical);if(h1!==1)errors.push('H1 count: '+h1);if(/<meta name="robots" content="[^"]*noindex/.test(html)||/noindex/.test(response.headers.get('x-robots-tag')||''))errors.push('Sitemap page is noindex');
  if(!/<html[^>]*lang="fr(?:-FR)?"/.test(html))errors.push('Missing French document language');
  if(!/<meta name="viewport"/.test(html))errors.push('Missing mobile viewport');
  if(/pok[eé][\s-]?(?:park|parc)/i.test(html))errors.push('Unavailable activity still advertised');
  if((html.match(/<link rel="canonical"/g)||[]).length!==1)errors.push('Canonical count is not one');
  if(titles.has(title))errors.push('Duplicate title with '+titles.get(title));titles.set(title,url);if(descriptions.has(description))report.warnings.push('Duplicate description: '+url);descriptions.set(description,url);
  const scripts=[...new Set([...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]))];
  const ogUrl=html.match(/<meta property="og:url" content="([^"]*)"/)?.[1]||'';
  if(ogUrl!==url)errors.push('Wrong Open Graph URL: '+ogUrl);
  const lastmod=map.html.match(new RegExp('<loc>'+url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'</loc><lastmod>([^<]+)</lastmod>'))?.[1];
  if(lastmod&&(!Number.isFinite(Date.parse(lastmod))||Date.parse(lastmod)>Date.now()+60000))errors.push('Invalid/future lastmod: '+lastmod);
  const row={url,status:response.status,title:decode(title),description:decode(description),canonical,ogUrl,lastmod,h1,renderer:response.headers.get('x-cobblestar-renderer')||'Next static',htmlBytes:Buffer.byteLength(html),scriptFiles:scripts.length,errors};report.pages.push(row);report.errors.push(...errors.map(e=>url+': '+e));
  if(expected.pathname==='/'){let bytes=0;for(const src of scripts){const asset=new URL(src,origin);if(asset.origin!==origin)continue;const r=await fetch(asset,{signal:AbortSignal.timeout(10000)});if(!r.ok)report.errors.push('Script HTTP '+r.status+': '+src);bytes+=(await r.arrayBuffer()).byteLength;}const inlineBytes=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src=')&&!m[1].includes('application/ld+json')).reduce((n,m)=>n+Buffer.byteLength(m[2]),0);report.metrics.home={htmlBytes:row.htmlBytes,scriptFiles:scripts.length,scriptBytes:bytes,inlineScriptBytes:inlineBytes,totalScriptBytes:bytes+inlineBytes};}
  for(const script of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))try{JSON.parse(script[1]);}catch{report.errors.push(url+': Invalid structured JSON');}
  for(const link of html.matchAll(/<a[^>]*href="([^"]+)"/g)){
    const href=decode(link[1]);if(/^javascript:|^data:/i.test(href))report.errors.push(url+': Unsafe link scheme');
    const target=new URL(href,url);
    // Cloudflare replaces public mailto links with this JS-decoded placeholder, not a document URL.
    // The browser restores mailto:; requesting the placeholder as a page produces an expected 404.
    if(target.origin===canonicalOrigin&&target.pathname==='/cdn-cgi/l/email-protection'){
      report.metrics.cloudflareEmailLinks=(report.metrics.cloudflareEmailLinks||0)+1;continue;
    }
    if(target.origin===canonicalOrigin&&!/^\/(api|internal|auth)(\/|$)/.test(target.pathname))links.set(target.pathname+target.hash,url);
  }
  for(const match of html.matchAll(/<img\b[^>]*>/g)){
    const tag=match[0],src=tag.match(/\bsrc="([^"]+)"/)?.[1];
    if(!/\balt(?:\s|=|\/?>)/.test(tag))report.warnings.push(url+': Image without alt: '+src);
    if(src){const target=new URL(decode(src),url);if(target.origin===canonicalOrigin)images.set(target.pathname,url);}
  }
  const og=html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];if(og){const target=new URL(decode(og),url);if(target.origin===canonicalOrigin)images.set(target.pathname,url);}
 }
 report.linkChecks=[];report.imageChecks=[];
 const linkedPages=new Set([...links.keys()].map(path=>new URL(path,canonicalOrigin).pathname));
 if(linkedPages.size>250||links.size>2000||images.size>150)throw new Error('Audit limit reached (250 documents / 2000 anchors / 150 images)');
 for(const [path,source] of links){
   const target=new URL(path,canonicalOrigin),key=target.pathname;
   let doc=documents.get(key);if(!doc){doc=await fetchPage(origin+key);documents.set(key,doc);}
   report.linkChecks.push({path,status:doc.response.status});
   if(doc.response.status>=400)report.errors.push(source+': Broken internal link '+path+' (HTTP '+doc.response.status+')');
   if(target.hash&&doc.response.ok&&doc.response.headers.get('content-type')?.includes('text/html')){
     const fragment=decodeURIComponent(target.hash.slice(1));
     const ids=[...doc.html.matchAll(/\b(?:id|name)="([^"]+)"/g)].map(m=>decode(m[1]));
     if(fragment&&!ids.includes(fragment))report.warnings.push(source+': Missing anchor '+path);
   }
 }
 for(const [path,source] of images){
   const r=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});const bytes=(await r.arrayBuffer()).byteLength;
   const type=r.headers.get('content-type')||'';report.imageChecks.push({path,status:r.status,type,bytes});
   if(!r.ok||!type.startsWith('image/'))report.errors.push(source+': Broken image '+path+' (HTTP '+r.status+', '+type+')');
   else if(bytes>300000)report.warnings.push('Image larger than 300 kB: '+path+' ('+bytes+' bytes)');
 }
 report.metrics.checkedLinks=links.size;report.metrics.checkedImages=images.size;
 report.metrics.checkedDocuments=documents.size;
 const graph=new Map();
 for(const [path,doc] of documents){
   const targets=new Set();
   for(const match of doc.html.matchAll(/<a[^>]*href="([^"]+)"/g)){
     const target=new URL(decode(match[1]),canonicalOrigin+path);
     if(target.origin===canonicalOrigin&&target.pathname!==path)targets.add(target.pathname);
   }
   graph.set(path,targets);
 }
 const depth=new Map([['/',0]]),queue=['/'];
 while(queue.length){const path=queue.shift();for(const target of graph.get(path)||[])if(!depth.has(target)){depth.set(target,depth.get(path)+1);queue.push(target);}}
 report.metrics.maxClickDepth=0;
 for(const page of report.pages){page.clickDepth=depth.get(new URL(page.url).pathname)??null;if(page.clickDepth===null)report.errors.push(page.url+': unreachable through internal links from homepage');else report.metrics.maxClickDepth=Math.max(report.metrics.maxClickDepth,page.clickDepth);}
 // An ordinary HTTP request with this UA only checks for obvious blocking. Search Console live testing confirms real Google access.
 const bot=await fetch(origin+'/',{headers:{'User-Agent':'Googlebot'},signal:AbortSignal.timeout(15000)});
 if(bot.status!==200)report.errors.push('Homepage with Googlebot user agent: HTTP '+bot.status);
 const botHtml=await bot.text();if(!botHtml.includes('<h1')||/noindex/.test(bot.headers.get('x-robots-tag')||''))report.errors.push('Homepage unavailable to crawler check');
 report.metrics.crawlerHttpStatus=bot.status;
 const robots=await fetchPage(origin+'/robots.txt');if(!robots.html.includes(canonicalOrigin+'/sitemap.xml'))report.errors.push('Missing sitemap in robots.txt');
 for(const path of ['/admin/discord/','/compte/','/maquettes/site-atlas/','/apercus/astral/']){const r=await fetchPage(origin+path);if(!/noindex/.test(r.response.headers.get('x-robots-tag')||''))report.errors.push(path+': missing exclusion header');}
 for(const path of ['/wiki/not-a-published-guide/','/actualites/not-a-published-article/','/seo-url-inexistante/','/wiki/pokepark/'])if((await fetchPage(origin+path)).response.status!==404)report.errors.push(path+': missing real 404');
 if(urls.some(url=>url.includes('/wiki/pokepark/')))report.errors.push('Unavailable guide remains in sitemap');
 if(!urls.includes(canonicalOrigin+'/installer-cobblemon/'))report.errors.push('Installation guide missing from sitemap');
 const publicWiki=await fetchPage(origin+'/api/wiki');
 if(publicWiki.response.status!==200)report.errors.push('Public wiki API: HTTP '+publicWiki.response.status);
 else if(/pok[eé][\s-]?(?:park|parc)/i.test(publicWiki.html))report.errors.push('Unavailable activity remains in public wiki API');
 for(const [from,to] of [['/installer-cobblemon','/installer-cobblemon/'],['/minecraft-pokemon/index.html','/minecraft-pokemon/'],['/boutique','/boutique/']]){
  const r=await fetch(origin+from,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(![301,308].includes(r.status)||new URL(r.headers.get('location')||'',origin).pathname!==to)report.errors.push('Invalid permanent redirect: '+from);
 }
}catch(error){report.errors.push(String(error.message||error));}
const output=process.env.SEO_REPORT||`seo/reports/audit-${new Date().toISOString().slice(0,10)}.json`;
await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pages:report.pages.length,errors:report.errors,warnings:report.warnings,metrics:report.metrics,report:output},null,2));if(report.errors.length)process.exitCode=1;
