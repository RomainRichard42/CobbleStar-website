// Read-only browser audit of the real export. API routes return an unauthenticated response.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root = resolve('out'), review = resolve('ui-review-readability');
await mkdir(review, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) { res.writeHead(401, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'AUTH_REQUIRED' })); return; }
    const file = resolve(root, `.${path.endsWith('/') ? path + 'index.html' : path}`);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true });
const results = [], errors = [];
const capture = process.argv.includes('--capture');
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://**', route => route.abort());
    for (const route of ['/', '/boutique/', '/boutique-jeu/', '/vote/', '/wiki/', '/roadmap/', '/compte/', '/actualites/', '/confidentialite/', '/admin/', '/admin/joueurs/']) {
      await page.goto(`http://127.0.0.1:${server.address().port}${route}`, { waitUntil: 'networkidle' });
      const samples = [];
      const positions = route === '/roadmap/' ? [0] : [0, .5, 1];
      for (const pos of positions) {
        await page.evaluate(p => window.scrollTo(0, p * (document.documentElement.scrollHeight - innerHeight)), pos);
        await page.waitForTimeout(100);
        samples.push(await page.evaluate(() => {
          const small = [];
          for (const el of document.querySelectorAll('body *')) {
            if (el.closest('script,style,[aria-hidden="true"]')) continue;
            const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
            if (!/[a-zà-ü]{3}/i.test(text)) continue;
            const box = el.getBoundingClientRect(), css = getComputedStyle(el);
            if (!box.width || !box.height || box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth || css.visibility === 'hidden') continue;
            let shown = true; for (let p = el; p; p = p.parentElement) if (+getComputedStyle(p).opacity < .1) shown = false;
            if (shown && parseFloat(css.fontSize) < 14) small.push({ tag: el.tagName, class: el.className, text: text.slice(0, 100), px: parseFloat(css.fontSize) });
          }
          return { overflow: document.documentElement.scrollWidth > innerWidth + 1, small };
        }));
      }
      if (capture && ['/', '/boutique/', '/wiki/', '/roadmap/', '/compte/'].includes(route)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(100);
        await page.screenshot({ path: resolve(review, `${route.replaceAll('/', '') || 'accueil'}-${width}.png`) });
      }
      results.push({ route, width, overflow: samples.some(s => s.overflow), small: [...new Map(samples.flatMap(s => s.small).map(s => [s.text, s])).values()] });
      if (route === '/roadmap/' && capture) {
        for (const index of [1, 2, 3, 6, 9]) {
          const step = page.getByRole('button', { name: new RegExp(`^Étape 0${index} :`) });
          await step.click();
          await page.waitForTimeout(150);
          await page.screenshot({ path: resolve(review, `roadmap-etape-${index}-${width}.png`) });
          if (index === 2 && width === 390) {
            const chapter = page.locator('[data-roadmap-scroll][aria-label="Lire le jalon 02"]');
            const before = await chapter.evaluate(el => ({ top: el.scrollTop, room: el.scrollHeight > el.clientHeight }));
            assert.equal(before.room, true, 'Mobile chapter must expose a scrollable reading area');
            await chapter.hover(); await page.mouse.wheel(0, 280); await page.waitForTimeout(150);
            assert.ok(await chapter.evaluate(el => el.scrollTop) > before.top, 'Wheel must scroll the chapter before changing milestone');
            assert.equal(await step.getAttribute('aria-current'), 'step');
            await page.screenshot({ path: resolve(review, 'roadmap-lecture-mobile.png') });
          }
        }
      }
    }
    await page.close();
  }
  await writeFile(resolve(review, capture ? 'after.json' : 'before.json'), JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ pages: results.map(r => ({ route:r.route, width:r.width, small:r.small.length, overflow:r.overflow })), errors }));
  if (capture) { assert.equal(errors.length, 0, 'Browser errors'); assert.ok(results.every(r => !r.overflow), 'Horizontal overflow'); assert.ok(results.every(r => !r.small.length), 'Useful visible text smaller than 14px'); }
} finally { await browser.close(); await new Promise(r => server.close(r)); }
