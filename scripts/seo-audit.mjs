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
 const titles=new Map(),descriptions=new Map();
 for(const url of urls){
  const expected=new URL(url);if(expected.origin!==canonicalOrigin)throw new Error('Unexpected sitemap origin');
  const {response,html}=await fetchPage(origin+expected.pathname);const title=html.match(/<title>(.*?)<\/title>/s)?.[1]||'';const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1]||'';const canonical=html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]||'';const h1=(html.match(/<h1(?:\s|>)/g)||[]).length;
  documents.set(expected.pathname,{response,html});
  const errors=[];if(response.status!==200)errors.push('HTTP '+response.status);if(!title)errors.push('Missing title');if(!description)errors.push('Missing description');if(canonical!==url)errors.push('Wrong canonical: '+canonical);if(h1!==1)errors.push('H1 count: '+h1);if(/<meta name="robots" content="[^"]*noindex/.test(html)||/noindex/.test(response.headers.get('x-robots-tag')||''))errors.push('Sitemap page is noindex');
  if(titles.has(title))errors.push('Duplicate title with '+titles.get(title));titles.set(title,url);if(descriptions.has(description))report.warnings.push('Duplicate description: '+url);descriptions.set(description,url);
  const scripts=[...new Set([...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]))];
  const row={url,status:response.status,title,description,canonical,h1,renderer:response.headers.get('x-cobblestar-renderer')||'Next static',htmlBytes:Buffer.byteLength(html),scriptFiles:scripts.length,errors};report.pages.push(row);report.errors.push(...errors.map(e=>url+': '+e));
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
 if(links.size>120||images.size>120)throw new Error('Audit crawl limit reached; review limits before expanding');
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
 // An ordinary HTTP request with this UA only checks for obvious blocking. Search Console live testing confirms real Google access.
 const bot=await fetch(origin+'/',{headers:{'User-Agent':'Googlebot'},signal:AbortSignal.timeout(15000)});
 if(bot.status!==200)report.errors.push('Homepage with Googlebot user agent: HTTP '+bot.status);
 const botHtml=await bot.text();if(!botHtml.includes('<h1')||/noindex/.test(bot.headers.get('x-robots-tag')||''))report.errors.push('Homepage unavailable to crawler check');
 report.metrics.crawlerHttpStatus=bot.status;
 const robots=await fetchPage(origin+'/robots.txt');if(!robots.html.includes(canonicalOrigin+'/sitemap.xml'))report.errors.push('Missing sitemap in robots.txt');
 for(const path of ['/admin/discord/','/compte/','/maquettes/site-atlas/']){const r=await fetchPage(origin+path);if(!/noindex/.test(r.response.headers.get('x-robots-tag')||''))report.errors.push(path+': missing exclusion header');}
 for(const path of ['/wiki/not-a-published-guide/','/actualites/not-a-published-article/'])if((await fetchPage(origin+path)).response.status!==404)report.errors.push(path+': missing real 404');
}catch(error){report.errors.push(String(error.message||error));}
const output=process.env.SEO_REPORT||`seo/reports/audit-${new Date().toISOString().slice(0,10)}.json`;
await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pages:report.pages.length,errors:report.errors,warnings:report.warnings,metrics:report.metrics,report:output},null,2));if(report.errors.length)process.exitCode=1;
