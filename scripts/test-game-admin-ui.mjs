// Browser regression test against the actual static build, with explicitly synthetic API fixtures.
// Usage: node scripts/test-game-admin-ui.mjs <absolute path to playwright/index.mjs>
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root = resolve("out");
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const target = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
    if (!target.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
    response.setHeader("Content-Type", types[extname(target)] ?? "application/octet-stream");
    response.end(await readFile(target));
  } catch { response.writeHead(404).end(); }
});
await new Promise((ready) => server.listen(0, "127.0.0.1", ready));
const origin = `http://127.0.0.1:${server.address().port}`;
const uuid = "a".repeat(32), snapshotId = "00000000-0000-4000-8000-000000000001";
const sample = () => ({
  uuid, username: "TEST_DRESSEUR", serverId: "fixture-not-live", snapshotId, observedAt: Date.now(), firstSeenAt: new Date().toISOString(), online: true, canWrite: true, account: null,
  snapshot: { sessionStartedAt: Date.now(), health: 20, maxHealth: 20, food: 18, xpLevel: 12, xpProgress: .2, dimension: "cobblestar_planets:asteria", x: 100, y: 80, z: -25, gameMode: "survival",
    inventory: [{ slot: 0, id: "minecraft:diamond", name: "Diamant de test", count: 4, maxCount: 64, fingerprint: "b".repeat(64), components: '{id:"minecraft:diamond",count:4}' }], enderChest: [],
    pokemon: [{ uuid: "00000000-0000-4000-8000-000000000002", species: "cobblemon:dragonite", name: "Dracolosse de test", level: 55, shiny: false, storage: "party", data: { ivs: { hp: 31 }, moves: ["dragonclaw"] } }], pokemonTruncated: false,
    statistics: { "minecraft:custom/minecraft:play_time": 144000 }, academy: { cosmetics: ["asteria_aura"], activeCosmetics: [] }, quests: { completed: ["test"] }, cosmeticIds: ["asteria_aura"], capabilities: ["xp_level", "health", "food", "inventory_count", "pokemon_level", "cosmetic_unlock", "cosmetics_disable"] },
  events: [{ id: "event", kind: "join", at: Date.now(), detail: {} }], eventsTotal: 1, eventsPage: 1, actions: [],
});
let profile = sample(), deny = false, unavailable = false, missing = false, sent = [];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = []; page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/**", async (route) => {
    if (deny) return route.fulfill({ status: 403, json: { error: "GAME_ADMIN_REQUIRED" } });
    if (unavailable) return route.fulfill({ status: 500, json: { error: "Internal Server Error", code: "ER_CANT_AGGREGATE_2COLLATIONS" } });
    const request = route.request(), url = new URL(request.url());
    if (missing && url.pathname.endsWith(`/players/${uuid}`)) return route.fulfill({ status: 404, json: { error: "PLAYER_NOT_OBSERVED" } });
    if (request.method() === "POST") {
      const body = request.postDataJSON(); sent.push(body);
      profile.actions = [{ id: body.requestId, actor: "111111111111111111", reason: body.reason, payload: body.action, status: "queued", result: null, createdAt: new Date().toISOString() }];
      return route.fulfill({ status: 202, json: { id: body.requestId, status: "queued" } });
    }
    return route.fulfill({ json: url.pathname.endsWith(`/players/${uuid}`) ? profile : { players: [{ uuid, username: profile.username, online: 1, discordUsername: null }], total: 1, page: 1 } });
  });
  await page.goto(`${origin}/admin/joueurs/?uuid=${uuid}`);
  await page.getByRole("heading", { name: "TEST_DRESSEUR", exact: true }).waitFor();
  await page.getByRole("button", { name: /TEST_DRESSEUR/ }).waitFor();
  await page.getByRole("button", { name: "Inventaires", exact: true }).click();
  await page.getByRole("heading", { name: "Diamant de test", exact: true }).waitFor();
  await page.getByRole("button", { name: "Modifier la quantité", exact: true }).click();
  await page.getByLabel("Nouvelle valeur").fill("3");
  await page.getByRole("button", { name: "Préparer la modification" }).click();
  assert.equal(await page.getByRole("button", { name: "Confirmer et transmettre" }).isEnabled(), false);
  await page.getByLabel("Motif obligatoire").fill("Test automatisé sans serveur Minecraft");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmer et transmettre" }).click();
  await page.getByText("En attente du serveur", { exact: true }).waitFor();
  assert.equal(sent.length, 1); assert.equal(sent[0].snapshotId, snapshotId);
  assert.equal(sent[0].expected, "b".repeat(64));
  assert.deepEqual(sent[0].action, { kind: "inventory_count", value: 3, slot: 0, storage: "inventory" });
  assert.equal(await page.getByRole("button", { name: "Préparer la modification" }).isEnabled(), false);
  profile = sample(); profile.canWrite = false;
  await page.reload(); await page.getByRole("heading", { name: "TEST_DRESSEUR", exact: true }).waitFor();
  await page.getByRole("button", { name: /TEST_DRESSEUR/ }).waitFor();
  await page.getByRole("button", { name: "Inventaires", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Modifier la quantité", exact: true }).isEnabled(), false);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: "ui-review-game-admin-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Vue d’ensemble", exact: true }).click();
  await page.screenshot({ path: "ui-review-game-admin-desktop.png", fullPage: true });
  deny = true; await page.reload(); await page.getByRole("alert").first().waitFor();
  assert.equal(await page.getByRole("heading", { name: "TEST_DRESSEUR", exact: true }).count(), 0);
  deny = false; unavailable = true; await page.reload();
  await page.getByText("Nombre de joueurs indisponible", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Fiche indisponible", exact: true }).waitFor();
  assert.equal(await page.getByText(/^0 joueurs observés/).count(), 0);
  assert.equal(await page.getByRole("heading", { name: "Lecture de la fiche…", exact: true }).count(), 0);
  unavailable = false; missing = true; await page.reload();
  await page.getByText("Ce joueur n’a pas encore été synchronisé par le serveur.", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Fiche indisponible", exact: true }).waitFor();
  assert.deepEqual(pageErrors, []);
  console.log("PASS: actual UI with synthetic fixtures — detail, inventory, confirmation, one request, pending lock, read-only, 390px layout, denied access, API 500 distinguished from zero players, missing player distinguished from loading, no browser errors. No live game mutation tested.");
} finally { await browser.close(); await new Promise((done) => server.close(done)); }
