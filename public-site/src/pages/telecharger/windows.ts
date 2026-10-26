import type { APIRoute } from 'astro';
let cached: {url:string;at:number}|null=null;
export const GET:APIRoute=async()=>{
  let target=cached&&Date.now()-cached.at<300000?cached.url:null;
  if(!target)try{
    const response=await fetch('https://api.github.com/repos/RomainRichard42/CobbleStar-launcher/releases/latest',{headers:{Accept:'application/vnd.github+json','User-Agent':'CobbleStar-launcher-download'},signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error('Release unavailable');
    const data=await response.json();
    const asset=data.assets?.find((a:{name:string;browser_download_url:string})=>a.name.endsWith('.exe')&&a.browser_download_url.startsWith('https://github.com/RomainRichard42/CobbleStar-launcher/releases/download/'));
    if(asset){target=asset.browser_download_url;cached={url:target!,at:Date.now()};}
  }catch{/* The official releases page remains usable if GitHub's API is unavailable. */}
  return new Response(null,{status:302,headers:{Location:target||'https://github.com/RomainRichard42/CobbleStar-launcher/releases/latest','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
};
