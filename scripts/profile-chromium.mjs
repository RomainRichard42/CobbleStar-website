// Repeatable Chromium workload; reports engine work, not a claim about every user's GPU/FPS.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root = resolve('out');
const server = createServer(async (req,res) => {
  try {
    const path = new URL(req.url,'http://localhost').pathname;
    if (path.startsWith('/api/')) { res.writeHead(401,{'Content-Type':'application/json'}).end('{"error":"AUTH_REQUIRED"}'); return; }
    const file = resolve(root, '.' + (path.endsWith('/') ? path+'index.html' : path));
    if (!file.startsWith(root+sep)) throw Error('path');
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const results=[];
try {
  for (const route of ['/','/boutique/','/roadmap/']) {
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
    await page.route('https://**',r=>r.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}${route}`,{waitUntil:'networkidle'});
    const cdp=await page.context().newCDPSession(page); await cdp.send('Performance.enable');
    const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
    for (const mode of ['pointer','scroll']) {
      const before=await metrics();
      await page.evaluate(async mode=>{
        const start=performance.now();
        await new Promise(done=>{
          const frame=now=>{
            const elapsed=now-start;
            if(elapsed>=2000){done();return;}
            if(mode==='pointer') {
              const event={bubbles:true,clientX:innerWidth*.5+Math.sin(elapsed/150)*400,clientY:innerHeight*.5+Math.cos(elapsed/170)*200,pointerType:'mouse'};
              document.querySelector('main').dispatchEvent(new PointerEvent('pointermove',event));
            } else window.scrollTo({top:Math.min(document.documentElement.scrollHeight-innerHeight,elapsed*1.1),behavior:'instant'});
            requestAnimationFrame(frame);
          };requestAnimationFrame(frame);
        });
      },mode);
      const after=await metrics();
      results.push({route,mode,...Object.fromEntries(['RecalcStyleCount','RecalcStyleDuration','LayoutCount','LayoutDuration','TaskDuration','ScriptDuration'].map(k=>[k,+(after[k]-before[k]).toFixed(5)]))});
    }
    await page.close();
  }
  await mkdir('ui-review-performance',{recursive:true}); await writeFile(`ui-review-performance/${process.argv[3] ?? 'profile'}.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
} finally {await browser.close();await new Promise(r=>server.close(r));}
