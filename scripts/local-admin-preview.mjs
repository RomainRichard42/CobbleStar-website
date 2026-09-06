// Standalone, loopback-only preview of the actual exported site.
// No auth bypass is added to the production API; no credentials or database are loaded.
import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, extname, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), "../out"));
const port = Number(process.argv[2] ?? 3001);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local port");
const uuid = "00000000000040008000000000000001";
const started = Date.now();
const iso = new Date(started).toISOString();
const demoProfile = {
  uuid, username: "DEMO_DRESSEUR", serverId: "DEMONSTRATION_LOCALE", snapshotId: "00000000-0000-4000-8000-000000000001",
  observedAt: started, receivedAt: iso, firstSeenAt: iso, online: false, canWrite: false, account: null,
  snapshot: {
    sessionStartedAt: started, health: 20, maxHealth: 20, food: 18, xpLevel: 12, xpProgress: .4,
    dimension: "cobblestar_planets:asteria", x: 100, y: 80, z: -25, gameMode: "survival",
    inventory: [{ slot: 0, id: "minecraft:diamond", name: "Diamant — exemple fictif", count: 4, maxCount: 64, fingerprint: "a".repeat(64), components: '{id:"minecraft:diamond",count:4}' }],
    enderChest: [], pokemon: [{ uuid: "00000000-0000-4000-8000-000000000002", species: "cobblemon:dragonite", name: "Dracolosse — exemple fictif", level: 55, shiny: false, storage: "party", data: { demonstration: true, note: "Données fictives, aucun Pokémon du serveur n’a été lu." } }],
    pokemonTruncated: false, statistics: { "minecraft:custom/minecraft:play_time": 144000 },
    academy: { demonstration: true, cosmetics: ["asteria_aura"], activeCosmetics: [] },
    quests: { demonstration: true, note: "Les vraies quêtes apparaîtront après raccordement de l’API." },
    cosmeticIds: ["asteria_aura"], capabilities: ["xp_level", "health", "food", "inventory_count", "pokemon_level", "cosmetic_unlock", "cosmetics_disable"],
  }, events: [], eventsTotal: 0, eventsPage: 1, actions: [],
};
const zeroes = (keys) => Object.fromEntries(keys.split(" ").map((key) => [key, 0]));
const dashboard = {
  generatedAt: iso,
  overview: zeroes("users discordAccounts discordMembers minecraftLinked newUsers7d newUsers30d activeSessions activeSessionUsers"),
  economy: zeroes("circulatingStars averageBalance largestBalance starsIssued starsSpent transactions orders paidOrders revenueCents starsPurchased"),
  engagement: zeroes("votes voters votes7d votes30d pendingVoteRewards purchases buyers purchases30d shopStarsSpent"),
  deliveries: zeroes("total pending leased delivered failed"), daily: [], players: [], voteSites: [], products: [],
};
const noticeScript = `
const notice = document.createElement('aside');
notice.setAttribute('role','note');
notice.style.cssText='position:sticky;top:0;z-index:2147483647;background:#f4cf72;color:#100b23;padding:14px 20px;font:600 15px/1.5 Arial,sans-serif;text-align:center;';
notice.textContent='APERÇU LOCAL — données fictives, compteurs à zéro. Aucun serveur connecté. Modifications en jeu désactivées.';
document.body.prepend(notice);
document.title='[APERÇU LOCAL] '+document.title;
`;

const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  const json = (status, data) => { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); response.end(JSON.stringify(data)); };
  if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(request.headers.host) || request.headers["sec-fetch-site"] === "cross-site") return json(403, { error: "LOCAL_PREVIEW_ONLY" });
  // Deliberately no mutation endpoint, OAuth endpoint, internal game endpoint or remote proxy.
  if (!["GET", "HEAD"].includes(request.method)) return json(503, { error: "LOCAL_PREVIEW_READ_ONLY", message: "Aucune modification n’a été transmise au jeu." });
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    const route = pathname.replace(/\/+$/, "");
    if (route === "/api/admin/stats") return json(200, dashboard);
    if (route === "/api/admin/game/players") {
      const query = (url.searchParams.get("q") ?? "").toLowerCase();
      const found = !query || demoProfile.username.toLowerCase().includes(query) || uuid.includes(query);
      return json(200, { players: found ? [{ uuid, username: demoProfile.username, online: 0, discordUsername: null, receivedAt: iso }] : [], total: found ? 1 : 0, page: 1, canWrite: false });
    }
    if (route === `/api/admin/game/players/${uuid}`) return json(200, demoProfile);
    if (route.startsWith("/api/")) return json(503, { error: "LOCAL_PREVIEW_ONLY", message: "La vraie API n’est pas raccordée à cet aperçu." });
    if (route === "/__local-admin-notice.js") { response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" }); response.end(noticeScript); return; }
    if (route === "") { response.writeHead(302, { Location: "/admin/" }); response.end(); return; }
    const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
    const target = resolve(root, `.${relative}`);
    if (!target.startsWith(root + sep)) return json(403, { error: "FORBIDDEN_PATH" });
    let canonical;
    try { canonical = await realpath(target); }
    catch {
      // Next's Windows export writes nested segment files while requesting dotted names.
      const segmentPath = pathname.replace(/\/(__next\.[A-Za-z0-9_-]+)((?:\.[A-Za-z0-9_-]+)+)\.txt$/, (_, first, rest) => `/${first}${rest.replaceAll(".", "/")}.txt`);
      canonical = await realpath(resolve(root, `.${segmentPath}`));
    }
    if (!canonical.startsWith(root + sep)) return json(403, { error: "FORBIDDEN_PATH" });
    if ((await stat(canonical)).isDirectory()) { response.writeHead(308, { Location: `${url.pathname}/${url.search}` }); response.end(); return; }
    const extension = extname(canonical);
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".ico": "image/x-icon" };
    let content = await readFile(canonical);
    if (extension === ".html") content = Buffer.from(content.toString("utf8").replace("</body>", '<script src="/__local-admin-notice.js" defer></script></body>'));
    response.writeHead(200, { "Content-Type": types[extension] ?? "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch { json(404, { error: "NOT_FOUND" }); }
});
server.requestTimeout = 10000;
server.headersTimeout = 10000;
server.listen(port, "127.0.0.1", () => console.log(`Local preview (no database, no game writes): http://127.0.0.1:${port}/admin/`));
