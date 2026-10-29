import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'node:http';

export function isPublicPage(path: string) {
  if (['/','/collection','/wiki','/actualites','/rejoindre','/minecraft-pokemon','/installer-cobblemon','/telecharger','/telecharger/windows','/roadmap','/confidentialite','/robots.txt','/sitemap.xml','/actualites/rss.xml'].includes(path.replace(/\/$/,'') || '/')) return true;
  if (/^\/wiki\/pokedex\/[a-z0-9_-]+\/?$/.test(path)) return true;
  return /^\/(wiki|actualites)\/(?!admin(?:\/|$))[a-z0-9_-]+\/?$/.test(path);
}
type Handler = (req: IncomingMessage, res: ServerResponse, next: (error?: Error) => void, locals: Record<string, unknown>) => Promise<void>;
export function registerPublicSite(app: FastifyInstance, content: {getWiki:()=>Promise<unknown>;getNews:()=>Promise<unknown>;getDex?:()=>Promise<unknown>;getDexInfo?:(id:string)=>Promise<unknown>}, render?: Handler) {
  let loaded: Promise<Handler> | undefined;
  const renderer = () => render ? Promise.resolve(render) : loaded ??= import(pathToFileURL(resolve(process.cwd(),'public-astro/server/entry.mjs')).href).then(module=>module.handler as Handler).catch(error=>{loaded=undefined;throw error;});
  app.addHook('onRequest',async(request,reply)=>{
    const path=request.url.split('?')[0]!;
    if (/^\/(?:apercus|maquettes|admin|compte|collection|boutique-jeu|roadmap-carte)(?:\/|$)|^\/(?:wiki|actualites)\/admin(?:\/|$)/.test(path)) reply.header('X-Robots-Tag','noindex, nofollow');
    if (!['GET','HEAD'].includes(request.method)) return;
    const normalized=path.replace(/\/index\.html$/, '/') || '/';
    const nextPublic=/^\/(?:boutique|vote)\/?$/.test(normalized);
    if(!isPublicPage(normalized)&&!nextPublic)return;
    const canonical=/\.(?:txt|xml)$/.test(normalized)||normalized.endsWith('/')?normalized:normalized+'/';
    const query=request.url.includes('?')?'?'+request.url.split('?').slice(1).join('?'):'';
    if(request.hostname.toLowerCase()==='www.cobblestar-mc.fr')return reply.code(308).redirect('https://cobblestar-mc.fr'+canonical+query);
    if(path!==canonical)return reply.code(308).redirect(canonical+query);
    if(nextPublic)return;
    const handler=await renderer();
    reply.header('Cache-Control',(path.startsWith('/telecharger/windows')||path.startsWith('/collection'))?'no-store':'public, max-age=60');
    reply.header('X-CobbleStar-Renderer','Astro');
    for(const [name,value] of Object.entries(reply.getHeaders()))if(value!==undefined)reply.raw.setHeader(name,value);
    reply.hijack();
    // Only published documents enter Astro. No account, session or private API is exposed in locals.
    await handler(request.raw,reply.raw,error=>{
      if(error)request.log.error(error,'Public site rendering failed');
      if(!reply.raw.headersSent){reply.raw.statusCode=error?503:404;reply.raw.setHeader('Cache-Control','no-store');reply.raw.setHeader('X-Robots-Tag','noindex');}
      if(!reply.raw.writableEnded)reply.raw.end(error?'Site temporairement indisponible':'Page introuvable');
    },content);
  });
}
