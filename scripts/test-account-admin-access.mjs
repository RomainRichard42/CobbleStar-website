// Real static account UI, synthetic sessions only. No live account or permission writes.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root = resolve('out');
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(root, `.${pathname.endsWith('/') ? pathname + 'index.html' : pathname}`);
    if (!file.startsWith(root + sep)) return res.writeHead(403).end();
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  let admin = false, anonymous = false;
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('https://**', route => route.abort());
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/me' && !anonymous) return route.fulfill({ json: { user: {
      id: 'fixture', name: 'TEST', identity: { kind: 'provisional', id: 'fixture' }, admin,
      email: null, discord: { id: 'fixture', username: 'TEST', globalName: 'TEST', avatarUrl: null },
      minecraft: { username: null, uuid: null, linked: false },
    } } });
    if (path === '/api/wallet') return route.fulfill({ json: { balance: 0 } });
    if (path === '/api/link/status') return route.fulfill({ json: { relinkEnabled: false } });
    return route.fulfill({ status: 401, json: { error: 'AUTH_REQUIRED' } });
  });
  const adminLinks = page.locator('a[href="/admin/"]');
  for (const value of [false, 'false', 1, true]) {
    admin = value;
    await page.goto(`http://127.0.0.1:${server.address().port}/compte/`, { waitUntil: 'networkidle' });
    assert.equal(await adminLinks.count(), value === true ? 1 : 0, `Only boolean true may show admin: ${value}`);
  }
  admin = false;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await adminLinks.waitFor({ state: 'detached' });
  anonymous = true;
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await adminLinks.count(), 0, 'No admin link for anonymous session');
  assert.deepEqual(errors, []);
  console.log('Account admin access: ordinary / malformed / admin / revoked / anonymous sessions OK');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
