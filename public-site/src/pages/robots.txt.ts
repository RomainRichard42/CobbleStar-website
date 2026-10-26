import type { APIRoute } from 'astro';
export const GET:APIRoute=()=>new Response('User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /wiki/admin/\nDisallow: /actualites/admin/\n\nSitemap: https://cobblestar-mc.fr/sitemap.xml\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
