// Real exported HTML/CSS; synthetic API responses, never a production account.
// node scripts/test-account-link-ui.mjs <absolute path to playwright/index.mjs>
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
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
await new Promise(ready => server.listen(0, "127.0.0.1", ready));
const browser = await chromium.launch({ headless: true });
try {
  await mkdir("ui-review-account", { recursive: true });
  for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 844 }]) {
    for (const initiallyLinked of [false, true]) {
      const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      let completed = false, issued = false;
      const uuid = "a".repeat(32);
      const profile = () => ({ id: completed ? "canonical-test" : "source-test", name: uuid,
        identity: { kind: initiallyLinked || completed ? "minecraft" : "provisional", id: uuid },
        email: "fixture@example.test", admin: false,
        discord: { id: "111111111111111111", username: "FixtureDiscord", globalName: "Compte de test", avatarUrl: null },
        minecraft: { linked: initiallyLinked || completed, uuid: initiallyLinked || completed ? uuid : null, username: initiallyLinked || completed ? "TEST_DRESSEUR" : null } });
      await page.route("**/api/**", async route => {
        const url = new URL(route.request().url());
        let body = {};
        if (url.pathname === "/api/me") body = { user: profile() };
        else if (url.pathname === "/api/wallet") body = { balance: completed ? 48 : 17 };
        else if (url.pathname === "/api/link/status") body = { linked: initiallyLinked || completed, relinkEnabled: true, request: url.searchParams.has("requestId") ? { state: completed ? "completed" : "pending", uuid: completed ? uuid : null } : null };
        else if (url.pathname === "/api/link/code") {
          assert.deepEqual(route.request().postDataJSON(), { allowRelink: true });
          issued = true;
          body = { requestId: "00000000-0000-4000-8000-000000000001", command: "/link CS-ABCDE-FGHJK", expiresInSeconds: 600 };
        }
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/compte/`);
      if (initiallyLinked) await page.getByRole("button", { name: "Récupérer / changer la liaison Minecraft" }).click();
      const generate = page.getByRole("button", { name: "Générer ma commande /link" });
      await generate.waitFor();
      assert.equal(await generate.isDisabled(), true);
      await page.getByRole("checkbox").check();
      await generate.click();
      await page.getByText("/link CS-ABCDE-FGHJK", { exact: true }).waitFor();
      assert.equal(issued, true);
      // In particular, linked=true must NOT prematurely clear a relink command.
      await page.waitForTimeout(2800);
      assert.equal(await page.getByText("/link CS-ABCDE-FGHJK", { exact: true }).isVisible(), true);
      completed = true;
      await page.getByRole("status").filter({ hasText: "Liaison confirmée" }).waitFor();
      assert.equal(await page.getByText("/link CS-ABCDE-FGHJK", { exact: true }).count(), 0);
      assert.ok((await page.locator("main").innerText()).includes("48"));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      if (initiallyLinked) {
        await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
        await page.screenshot({ path: `ui-review-account/${viewport.width}.png`, fullPage: true });
      }
      await page.close();
      console.log(`PASS ${viewport.width}px ${initiallyLinked ? "same UUID relink" : "legacy recovery"}: consent, pending, confirmed, balance, overflow`);
    }
  }
} finally { await browser.close(); await new Promise(done => server.close(done)); }
