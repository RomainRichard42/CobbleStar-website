// Real exported admin page + real parser; isolated HTTP fixtures, no production writes.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { previewArenaPaste } from "../api/dist/arena-pokepaste.js";
import { arenaContent, validateArenaCatalog } from "../api/dist/arena-studio-schema.js";
import { content, catalog as fixtureCatalog } from "../api/test/fixtures/arena-studio.mjs";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root = resolve("out"), server = createServer(async (req, res) => {
  try { const path = new URL(req.url, "http://localhost").pathname, file = resolve(root, `.${path.endsWith("/") ? path + "index.html" : path}`); if (!file.startsWith(root + sep)) return res.writeHead(403).end(); res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" })[extname(file)] ?? "application/octet-stream"); res.end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true });
const catalog = fixtureCatalog(); catalog.items.push({ id: "cobblemon:choice_scarf", label: "Mouchoir Choix" });
let state = { content: content(), observed: content(), catalog, draftRevision: 1, publishedRevision: 0, appliedRevision: 0, hasUnpublishedChanges: true, lastSeenAt: new Date().toISOString(), error: "", history: [], canWrite: true };
const text = "Stella (Eevee) (F) @ Choice Scarf\nAbility: Run Away\nLevel: 68\nShiny: Yes\nEVs: 252 Atk / 4 Def / 252 Spe\nAdamant Nature\nIVs: 0 SpA\nTera Type: Normal\n- Tackle";
let saves = 0, publications = 0, previews = 0; const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.on("pageerror", e => errors.push(e.message));
  await page.route("https://**", route => route.abort());
  await page.route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname === "/api/admin/arenas") return route.fulfill({ json: { servers: [{ serverId: "import-fixture" }], canWrite: state.canWrite } });
    if (url.pathname.endsWith("/import-team")) { previews++; const body = req.postDataJSON(); assert.deepEqual(Object.keys(body), ["source"]); return route.fulfill({ json: previewArenaPaste(body.source.startsWith("https://pokepast.es/") ? text : body.source, catalog) }); }
    if (req.method() === "PUT") { const body = req.postDataJSON(); assert.equal(body.baseRevision, state.draftRevision); const parsed = arenaContent.parse(body.content); assert.deepEqual(validateArenaCatalog(parsed, catalog), []); state.content = parsed; state.draftRevision++; saves++; return route.fulfill({ json: { draftRevision: state.draftRevision } }); }
    if (req.method() === "POST") { publications++; throw Error("Import must not auto-publish"); }
    return route.fulfill({ json: state });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/admin/arenes/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "2 Équipe", exact: true }).click();
  await page.getByRole("button", { name: "Importer un Poképaste", exact: true }).click();
  await page.getByLabel("Lien Poképaste ou texte Showdown").fill(text);
  await page.getByRole("button", { name: "Analyser l’équipe", exact: true }).click();
  await page.getByRole("heading", { name: "Vérifie ton import" }).waitFor();
  const apply = page.getByRole("button", { name: /^Remplacer l’équipe du brouillon/ });
  assert.equal(await apply.isEnabled(), false); assert.equal(await page.getByLabel("Niveau du Pokémon", { exact: true }).inputValue(), "35");
  await page.getByText(/Surnom « Stella » non transféré/).waitFor(); await page.getByText(/Tera Type = Normal/).waitFor();
  await page.getByRole("checkbox", { name: /J’accepte ces différences/ }).check();
  assert.equal(await apply.isEnabled(), true); assert.equal(saves, 0); assert.equal(publications, 0);
  await mkdir("ui-review-arena-studio", { recursive: true }); await page.screenshot({ path: "ui-review-arena-studio/pokepaste-preview-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "No mobile horizontal overflow");
  await page.screenshot({ path: "ui-review-arena-studio/pokepaste-preview-mobile.png", fullPage: true });
  await apply.click(); assert.equal(await page.getByLabel("Niveau du Pokémon", { exact: true }).inputValue(), "68");
  assert.equal(await page.getByLabel("IV · Att. spéciale", { exact: true }).inputValue(), "0"); assert.equal(saves, 0); assert.equal(publications, 0);
  await page.getByRole("button", { name: "↶ Annuler", exact: true }).click(); assert.equal(await page.getByLabel("Niveau du Pokémon", { exact: true }).inputValue(), "35");
  await page.getByRole("button", { name: "↷ Rétablir", exact: true }).click(); assert.equal(await page.getByLabel("Niveau du Pokémon", { exact: true }).inputValue(), "68");
  await page.getByRole("button", { name: /^Enregistrer/ }).click(); await page.getByRole("status").filter({ hasText: "Brouillon enregistré" }).waitFor();
  assert.equal(saves, 1); assert.equal(publications, 0); assert.equal(state.content.stages[0].team[0].level, 68); assert.equal(state.content.stages[1].team[0].level, 35);
  await page.getByRole("button", { name: "Importer un Poképaste", exact: true }).click(); await page.getByLabel("Lien Poképaste ou texte Showdown").fill("Eevee\nLevel: 999\n- Missing Move");
  await page.getByRole("button", { name: "Analyser l’équipe", exact: true }).click(); await page.getByText("Import bloqué : corrige ces points dans la source.").waitFor(); assert.equal(await apply.isEnabled(), false);
  await page.getByRole("button", { name: "Annuler l’import", exact: true }).click(); assert.equal(await page.getByLabel("Niveau du Pokémon", { exact: true }).inputValue(), "68");
  await page.getByRole("button", { name: "Importer un Poképaste", exact: true }).click(); await page.getByLabel("Lien Poképaste ou texte Showdown").fill("https://pokepast.es/0123456789abcdef");
  await page.getByRole("button", { name: "Analyser l’équipe", exact: true }).click(); await page.getByRole("heading", { name: "Vérifie ton import" }).waitFor();
  await page.getByLabel("Niveau du Pokémon", { exact: true }).fill("69"); await page.getByText(/L’équipe a changé depuis l’analyse/).waitFor(); assert.equal(await apply.isEnabled(), false);
  await page.getByRole("button", { name: "Annuler l’import", exact: true }).click();
  await page.locator("aside button").nth(8).click(); await page.getByRole("button", { name: "2 Équipe", exact: true }).click(); assert.equal(await page.getByRole("button", { name: "Importer un Poképaste", exact: true }).isEnabled(), true, "Elite Four share the import editor");
  state.canWrite = false; await page.reload(); await page.getByRole("button", { name: "2 Équipe", exact: true }).click(); assert.equal(await page.getByRole("button", { name: "Importer un Poképaste", exact: true }).isEnabled(), false);
  assert.deepEqual(errors, []); assert.equal(previews, 3); console.log("Pokepaste UI passed: preview/acknowledgement/import/undo/save/no-publish/invalid/cancel/stale/League/read-only/mobile.");
} finally { await browser.close(); await new Promise(r => server.close(r)); }
