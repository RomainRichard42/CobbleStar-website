// Real exported admin UI, isolated fixtures only: no live account, server or database writes.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { arenaContent } from "../api/dist/arena-studio-schema.js";
import { content, catalog, pokemon } from "../api/test/fixtures/arena-studio.mjs";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root = resolve("out"), server = createServer(async (req, res) => {
  try { const path = new URL(req.url, "http://localhost").pathname, file = resolve(root, `.${path.endsWith("/") ? path + "index.html" : path}`); if (!file.startsWith(root + sep)) return res.writeHead(403).end(); res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" })[extname(file)] ?? "application/octet-stream"); res.end(await readFile(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ headless: true });
let state = { content: content(), observed: content(), catalog: catalog(), draftRevision: 1, publishedRevision: 0, appliedRevision: 0, hasUnpublishedChanges: true, lastSeenAt: new Date().toISOString(), error: "", history: [], canWrite: true };
state.content.stages[0].team = [pokemon(), { ...pokemon(), level: 55 }];
let saves = 0, publications = 0; const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.on("pageerror", e => errors.push(e.message));
  await page.route("https://**", route => route.abort());
  await page.route("**/api/**", async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname === "/api/admin/arenas") return route.fulfill({ json: { servers: [{ serverId: "signature-fixture" }], canWrite: true } });
    if (url.pathname.endsWith("/import-team")) return route.fulfill({ json: { team: [{ ...pokemon(), memberId: "untrusted-import-id" }], errors: [], warnings: [], notes: [], source: "text" } });
    if (req.method() === "PUT") { state.content = arenaContent.parse(req.postDataJSON().content); state.draftRevision++; saves++; return route.fulfill({ json: { draftRevision: state.draftRevision } }); }
    if (req.method() === "POST") { publications++; throw Error("Principal selection must not auto-publish"); }
    return route.fulfill({ json: state });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/admin/arenes/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "2 Équipe", exact: true }).click();
  const principal = page.getByRole("combobox", { name: "Pokémon principal du Capitaine", exact: true });
  assert.equal(await principal.inputValue(), "", "Legacy team has no automatic selection");
  await principal.selectOption("1");
  await page.getByRole("button", { name: /^Enregistrer/ }).click();
  await page.getByRole("status").filter({ hasText: "Brouillon enregistré" }).waitFor();
  const id = state.content.stages[0].signaturePokemonId;
  assert.ok(id); assert.equal(state.content.stages[0].team[1].memberId, id);
  // Select the second editor card then reorder; both team reference and field follow it.
  await page.getByRole("button", { name: /Niv\. 55/ }).click();
  await page.getByRole("button", { name: "← Avant", exact: true }).click();
  assert.equal(await principal.inputValue(), "0");
  await page.getByRole("button", { name: "Dupliquer ce Pokémon", exact: true }).click();
  await page.getByRole("button", { name: /^Enregistrer/ }).click();
  await page.getByRole("status").filter({ hasText: "Brouillon enregistré" }).waitFor();
  assert.equal(state.content.stages[0].signaturePokemonId, id); assert.equal(state.content.stages[0].team[2].memberId, undefined, "Duplicating does not clone member identity");
  await page.getByRole("button", { name: /Niv\. 55/ }).first().click();
  await page.getByRole("button", { name: "Retirer ce Pokémon", exact: true }).click();
  assert.equal(await principal.inputValue(), "", "Removing principal clears link, not selecting its replacement slot");
  await principal.selectOption("0");
  await page.getByRole("button", { name: "Importer un Poképaste", exact: true }).click();
  await page.getByLabel("Lien Poképaste ou texte Showdown").fill("Eevee\nLevel: 55\n- Tackle");
  await page.getByRole("button", { name: "Analyser l’équipe", exact: true }).click();
  await page.getByRole("button", { name: /^Remplacer l’équipe du brouillon/ }).click();
  assert.equal(await principal.inputValue(), "", "Complete import always needs new explicit principal");
  await page.getByRole("button", { name: /^Enregistrer/ }).click();
  await page.getByRole("status").filter({ hasText: "Brouillon enregistré" }).waitFor();
  assert.equal(state.content.stages[0].signaturePokemonId, undefined); assert.equal(state.content.stages[0].team[0].memberId, undefined);
  await mkdir("ui-review-arena-studio", { recursive: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 }); await principal.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "No horizontal overflow");
    await page.screenshot({ path: `ui-review-arena-studio/captain-signature-${width}.png` });
  }
  assert.equal(publications, 0); assert.equal(saves, 3); assert.deepEqual(errors, []);
  console.log("PASS: explicit choice, stable reorder, duplicate isolation, deletion/import invalidation, saved API contract, desktop/mobile UI; no publication");
} finally { await browser.close(); await new Promise(r => server.close(r)); }
