// Browser regression test against the actual static build, with explicitly synthetic API fixtures.
// Usage: node scripts/test-game-admin-ui.mjs <absolute path to playwright/index.mjs>
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { siteSecurity } from "../api/dist/site-security.js";

const requireApi = createRequire(new URL("../api/package.json", import.meta.url));
const securityApp = requireApi("fastify")();
await securityApp.register(requireApi("@fastify/helmet"), siteSecurity);
securityApp.get("/", async () => "policy");
const productionCsp = (await securityApp.inject("/")).headers["content-security-policy"];
await securityApp.close();

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root = resolve("out");
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const target = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
    if (!target.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
    response.setHeader("Content-Type", types[extname(target)] ?? "application/octet-stream");
    response.setHeader("Content-Security-Policy", productionCsp);
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
const statBlock = n => ({ hp: n, attack: n, defence: n, special_attack: n, special_defence: n, speed: n });
function editorSample() {
  const data = sample(); data.snapshot.capabilities.push("pokemon_edit");
  data.snapshot.pokemon[0].editor = { fingerprint: "d".repeat(64), maxHealth: 190, stats: { hp: 190, attack: 170, defence: 125, special_attack: 132, special_defence: 125, speed: 110 }, effectiveIvs: statBlock(31), types: ["dragon", "flying"], dexNumber: 149, form: "Normal", values: { species: "cobblemon:dragonite", experience: 160000, status: "", hyperIvs: statBlock(-1), level: 55, nickname: "Dracolosse de test", shiny: false, gender: "MALE", friendship: 160, nature: "cobblemon:adamant", mintedNature: "", ability: "innerfocus", ivs: statBlock(31), evs: { ...statBlock(0), attack: 252, speed: 252, hp: 6 }, moves: [{ id: "dragonclaw", pp: 15, ppUps: 0 }, { id: "thunderbolt", pp: 15, ppUps: 0 }], currentHealth: 170, heldItem: "", caughtBall: "cobblemon:poke_ball", teraType: "cobblemon:dragon", scale: 1, dmaxLevel: 0, gmaxFactor: false, tradeable: true } };
  return data;
}
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = []; page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", event => window.__cspViolations.push(event.blockedURI));
  });
  await page.route("**/api/**", async (route) => {
    if (new URL(route.request().url()).hostname === "pokeapi.co") {
      if (process.env.TEST_POKEMON_ART === "1") return route.continue();
      return route.fulfill({ json: { sprites: { other: { "official-artwork": { front_default: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png", front_shiny: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/149.png" } } } } });
    }
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
  profile = editorSample();
  await page.reload(); await page.getByRole("heading", { name: "TEST_DRESSEUR", exact: true }).waitFor();
  await page.getByRole("button", { name: "Pokémon", exact: true }).click();
  await page.getByLabel("Attaque EV", { exact: true }).waitFor();
  await page.getByLabel("PV EV", { exact: true }).fill("252");
  await page.getByRole("button", { name: "Préparer · EV", exact: true }).click();
  await page.getByRole("alert").getByText("Le total des EV ne peut pas dépasser 510.").waitFor();
  assert.equal(sent.length, 1);
  await page.getByLabel("PV EV", { exact: true }).fill("6");
  await page.getByLabel("Attaque IV", { exact: true }).fill("30");
  if (process.env.TEST_POKEMON_ART === "1") await page.waitForFunction(() => [...document.querySelectorAll('img[alt*="illustration Pokémon"]')].some(img => img.complete && img.naturalWidth > 0));
  assert.equal(await page.evaluate(() => window.__cspViolations.some(url => /pokeapi|PokeAPI/.test(url))), false, "Production CSP must allow metadata and portraits");
  await page.screenshot({ path: "ui-review-pokemon-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "Pokemon mobile layout must not overflow");
  await page.screenshot({ path: "ui-review-pokemon-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Préparer · IV", exact: true }).click();
  await page.getByLabel("Motif obligatoire").fill("Correction IV sur fixture sans Minecraft");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmer et transmettre" }).click();
  await page.getByText("En attente du serveur", { exact: true }).waitFor();
  assert.equal(sent.length, 2); assert.equal(sent[1].expected, "d".repeat(64));
  assert.deepEqual(sent[1].action, { kind: "pokemon_edit", pokemonUuid: profile.snapshot.pokemon[0].uuid, change: { field: "ivs", value: { ...statBlock(31), attack: 30 } } });
  profile = editorSample(); await page.reload(); await page.getByRole("button", { name: "Pokémon", exact: true }).click();
  await page.getByLabel("Attaque IV", { exact: true }).fill("29");
  profile.snapshot.pokemon[0].editor.fingerprint = "e".repeat(64);
  await page.getByRole("button", { name: "Actualiser ↻", exact: true }).click();
  await page.getByRole("button", { name: "Recharger les valeurs du serveur" }).waitFor();
  assert.equal(await page.getByLabel("Attaque IV", { exact: true }).inputValue(), "29");
  assert.equal(await page.getByRole("button", { name: "Préparer · IV", exact: true }).isEnabled(), false);
  await page.getByRole("button", { name: "Recharger les valeurs du serveur" }).click();
  assert.equal(await page.getByLabel("Attaque IV", { exact: true }).inputValue(), "31");
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
  console.log("PASS: actual UI with synthetic fixtures — inventory and Pokemon requests, IV/EV validation, confirmation, stale-draft lock/reload, pending lock, read-only, 390px layout, denied access, API 500 vs zero players, missing player vs loading, no browser errors. No live game mutation tested.");
} finally { await browser.close(); await new Promise((done) => server.close(done)); }
