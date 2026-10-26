import type { APIRoute } from 'astro';
// Keep bookmarked download URLs safe until the public opening is announced.
export const GET:APIRoute=()=>new Response(null,{status:302,headers:{Location:'/telecharger/','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
