// Real exported admin page, isolated API fixtures only. Never contacts production or simulates game screenshots.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { arenaContent, arenaPuzzles, validateArenaCatalog } from '../api/dist/arena-studio-schema.js';
import { content as oldContent, catalog as oldCatalog, pokemon, trainer, rewards } from '../api/test/fixtures/arena-studio.mjs';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root = resolve('out');
const server = createServer(async (req, res) => { try { const pathname = new URL(req.url, 'http://localhost').pathname; const file = resolve(root, `.${pathname.endsWith('/') ? pathname + 'index.html' : pathname}`); if (!file.startsWith(root + sep)) return res.writeHead(403).end(); res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' })[extname(file)] ?? 'application/octet-stream'); res.end(await readFile(file)); } catch { res.writeHead(404).end(); } });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true });
const content = oldContent(), observed = structuredClone(content), catalog = oldCatalog();
content.stages[0].champion = 'Champion historique'; content.stages[0].team[0].level = 71;
for (const stage of observed.stages.filter(a => !a.league)) {
  stage.trainers = [trainer(), { ...trainer(), id: 'second', name: 'Deuxième rencontre', slot: 1 }];
  stage.trial = { enabled: true, puzzleId: arenaPuzzles[stage.id], intro: `Présentation du parcours ${stage.id}.`, hint: `Indice réel du parcours ${stage.id}.`, alpha: { name: `Gardien ${stage.id}`, pokemon: pokemon(), rewards: rewards() } };
}
let state = { content, observed, catalog, runtime: { pendingRewards: 0, reviewRewards: 0, activeBattles: 0, worldReady: true }, draftRevision: 1, publishedRevision: 0, appliedRevision: 0, hasUnpublishedChanges: true, lastSeenAt: new Date().toISOString(), error: '', history: [], canWrite: true };
let saved = 0, published = 0;
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://**', route => route.abort());
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/admin/arenas') return route.fulfill({ json: { servers: [{ serverId: 'adventure-fixture' }], canWrite: true } });
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON(); assert.equal(body.baseRevision, state.draftRevision);
      const parsed = arenaContent.parse(body.content); assert.deepEqual(validateArenaCatalog(parsed, catalog, [observed]), []);
      state.content = parsed; state.draftRevision++; saved++; return route.fulfill({ json: { draftRevision: state.draftRevision } });
    }
    if (route.request().method() === 'POST') { state.publishedRevision++; published++; state.hasUnpublishedChanges = false; return route.fulfill({ json: { publishedRevision: state.publishedRevision } }); }
    return route.fulfill({ json: state });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/admin/arenes/`, { waitUntil: 'networkidle' });
  await page.getByLabel('Nom du champion', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Nom du champion', { exact: true }).inputValue(), 'Champion historique');
  await page.getByText(/Les parcours reçus du nouveau mod ont été ajoutés/).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Enregistrer/ }).isEnabled(), true, 'Hydrated trial values require explicit save');
  assert.equal(saved, 0); assert.equal(published, 0);
  await page.getByRole('button', { name: '5 Parcours', exact: true }).click();
  await page.getByText('Le chant de la canopée', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Présentation de l’épreuve', { exact: false }).inputValue(), 'Présentation du parcours bug.');
  await page.getByLabel('Indice de l’énigme', { exact: false }).fill('Observe le motif lumineux, puis suis-le.');
  await page.getByRole('button', { name: 'Pokémon Alpha / Totem', exact: true }).click();
  await page.getByLabel('Nom affiché du gardien', { exact: true }).fill('Gardien des ailes');
  await page.getByLabel('Niveau du Pokémon', { exact: true }).fill('44');
  assert.equal(await page.getByRole('button', { name: /Ajouter un Pokémon|Dupliquer ce Pokémon|Retirer ce Pokémon/ }).count(), 0, 'A Totem is one Pokemon, not an editable extra team');
  await page.getByRole('button', { name: 'Bonus du Totem', exact: true }).click();
  await page.getByLabel('CobbleCoins offerts', { exact: true }).fill('750');
  await page.getByRole('button', { name: /^4 Dresseurs/ }).click();
  assert.equal(await page.getByLabel('Victoire obligatoire avant le champion', { exact: true }).count(), 0, 'Adventure trainers have no bypass checkbox');
  await page.getByRole('button', { name: /^Enregistrer/ }).click();
  await page.getByRole('status').filter({ hasText: 'Brouillon enregistré' }).waitFor();
  assert.equal(saved, 1); assert.equal(published, 0);
  assert.equal(state.content.stages[0].champion, 'Champion historique'); assert.equal(state.content.stages[0].team[0].level, 71);
  assert.equal(state.content.stages[0].trainers.length, 1, 'Existing trainers are preserved');
  assert.equal(state.content.stages[1].trainers.length, 2, 'Only empty legacy rosters are hydrated from new native defaults');
  assert.equal(state.content.stages[0].trial.alpha.pokemon.level, 44); assert.equal(state.content.stages[0].trial.alpha.rewards.cobbleCoins, 750);
  assert.equal(state.content.stages[0].trial.hint, 'Observe le motif lumineux, puis suis-le.');
  assert.deepEqual(state.content.stages[0].rewards, content.stages[0].rewards, 'Totem bonus does not overwrite champion reward');
  await page.getByRole('button', { name: 'Publier en jeu ↗', exact: true }).click();
  await page.getByLabel('Motif de publication', { exact: true }).fill('Épreuve et Totem du conservatoire');
  await page.getByRole('button', { name: 'Confirmer la publication', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Version 1 publiée' }).waitFor(); assert.equal(published, 1);
  await page.getByText('En attente du serveur', { exact: true }).waitFor(); assert.equal(state.appliedRevision, 0);
  const puzzleHeadings = new Set();
  for (let i = 0; i < 8; i++) { await page.locator('aside button').nth(i).click(); await page.getByRole('button', { name: '5 Parcours', exact: true }).click(); puzzleHeadings.add(await page.locator('fieldset h3').first().textContent()); }
  assert.equal(puzzleHeadings.size, 8);
  await mkdir('ui-review-arena-studio', { recursive: true });
  await page.screenshot({ path: 'ui-review-arena-studio/adventure-desktop.png', fullPage: true });
  await page.locator('aside button').nth(8).click(); await page.getByRole('button', { name: '5 Parcours', exact: true }).click();
  await page.getByText('Les huit badges ouvrent la porte.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Ordre des combats de Ligue', { exact: true }).locator('li').count(), 5);
  await page.getByText(/Une défaite met fin à la tentative/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Pokémon Alpha / Totem', exact: true }).count(), 0);
  await page.screenshot({ path: 'ui-review-arena-studio/league-desktop.png', fullPage: true });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const i of [2, 12]) { await page.locator('aside button').nth(i).click(); await page.getByRole('button', { name: '5 Parcours', exact: true }).click(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `No overflow at ${width}, stage ${i}`); }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('aside button').nth(0).click(); await page.getByRole('button', { name: '5 Parcours', exact: true }).click();
  await page.getByLabel('Conditions pour affronter le champion', { exact: true }).evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForFunction(() => Array.from(document.querySelectorAll('article.cs-scroll-reveal')).every(el => getComputedStyle(el).opacity === '1'));
  await page.screenshot({ path: 'ui-review-arena-studio/adventure-mobile-viewport.png' });
  await page.getByRole('button', { name: 'Pokémon Alpha / Totem', exact: true }).click();
  assert.equal(await page.getByLabel('Nom affiché du gardien', { exact: true }).inputValue(), 'Gardien des ailes');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  assert.deepEqual(errors, []);
  console.log('Adventure UI OK: real export, native-data hydration, custom content preservation, eight unique puzzle sections, single Totem editing, separate bonus, required trainers, save/publish/ack distinction, five League gates, 5 responsive widths.');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
