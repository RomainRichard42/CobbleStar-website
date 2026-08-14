import { randomUUID, timingSafeEqual } from "node:crypto";
import Fastify, { FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { join } from "node:path";
import { config, isProduction } from "./config.js";
import { pool, transaction } from "./db.js";
import { applyMigrations } from "./migrations.js";
import { digest, hashPassword, linkCode, normalizeEmail, normalizeLinkCode, randomToken, verifyPassword } from "./security.js";
<<<<<<< HEAD
import { findShopProduct, getGameShopCatalog, getShopTheme } from "./shop.js";
=======
import { findShopProduct, gameShopCatalog } from "./shop.js";
>>>>>>> 847eed66aff04d92bcc6b161a1a14adc8736b24e

type UserRow = RowDataPacket & {
  id: string; email: string; password_hash: string; minecraft_username: string | null;
  minecraft_uuid: string | null; minecraft_linked_at: Date | null;
};

declare module "fastify" {
  interface FastifyRequest { account?: UserRow }
}

const app = Fastify({ logger: { redact: ["req.headers.authorization", "req.headers.cookie", "body.password"] }, trustProxy: true });
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://mc-heads.net"],
    },
  },
});
await app.register(cookie, { secret: config.COOKIE_SECRET });
await app.register(cors, { origin: config.SITE_ORIGIN, credentials: true, methods: ["GET", "POST", "DELETE"] });
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

const sessionCookie = isProduction ? "__Host-cobblestar_session" : "cobblestar_session";
const registerBody = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128), minecraftUsername: z.string().regex(/^[A-Za-z0-9_]{3,16}$/) });
const loginBody = z.object({ email: z.string().email(), password: z.string().min(1).max(128) });
const confirmLinkBody = z.object({
  code: z.string().transform(normalizeLinkCode).pipe(z.string().regex(/^CS-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/)),
  uuid: z.string().regex(/^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{8}-(?:[a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12})$/),
  username: z.string().regex(/^[A-Za-z0-9_]{3,16}$/),
});
const minecraftUuid = z.string().regex(/^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{8}-(?:[a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12})$/).transform((value) => value.replaceAll("-", "").toLowerCase());
const giveStarsBody = z.object({
  uuid: minecraftUuid,
  amount: z.number().int().min(1).max(1_000_000),
  requestId: z.string().uuid(),
  reason: z.string().trim().min(1).max(120).default("Commande administrateur"),
});
const testRechargeBody = z.object({ starsAmount: z.number().int().refine((value) => [500, 1100, 2400, 6500].includes(value)) });
const rewardClaimBody = z.object({ uuid: minecraftUuid });
const rewardResultBody = z.object({ uuid: minecraftUuid, leaseToken: z.string().min(32).max(200), error: z.string().trim().max(200).optional() });
const rewardParams = z.object({ id: z.string().uuid() });
const gamePurchaseBody = z.object({
  uuid: minecraftUuid,
  productId: z.string().regex(/^[a-z0-9_-]{1,64}$/),
  requestId: z.string().uuid(),
});

function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, minecraft: { username: user.minecraft_username, uuid: user.minecraft_uuid, linked: Boolean(user.minecraft_linked_at) } };
}

async function loadSession(request: FastifyRequest) {
  const raw = request.cookies[sessionCookie];
  if (!raw) return null;
  const [rows] = await pool.execute<UserRow[]>(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() LIMIT 1`, [digest(raw)]);
  return rows[0] ?? null;
}

async function requireAccount(request: FastifyRequest, reply: { code: (status: number) => { send: (body: unknown) => unknown } }) {
  const user = await loadSession(request);
  if (!user) return reply.code(401).send({ error: "AUTH_REQUIRED" });
  request.account = user;
}

async function createSession(reply: { setCookie: (name: string, value: string, options: object) => unknown }, userId: string) {
  const raw = randomToken();
  await pool.execute(`INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY))`, [digest(raw), userId]);
  reply.setCookie(sessionCookie, raw, { path: "/", httpOnly: true, secure: isProduction, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
}

function serverKeyMatches(candidate: string | undefined) {
  if (!candidate) return false;
  const expected = Buffer.from(config.MINECRAFT_SERVER_KEY);
  const actual = Buffer.from(candidate);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function serverKeyFrom(request: FastifyRequest) {
  const dedicatedHeader = request.headers["x-cobblestar-server-key"];
  if (typeof dedicatedHeader === "string") return dedicatedHeader;
  const authorization = request.headers.authorization;
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

app.get("/api/health", async () => {
  await pool.query("SELECT 1");
  return { status: "ok", service: "cobblestar-api" };
});

app.get("/api/minecraft-profile", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request, reply) => {
  const parsed = z.object({ name: z.string().regex(/^[A-Za-z0-9_]{3,16}$/) }).safeParse(request.query);
  if (!parsed.success) return reply.code(400).send({ error: "Pseudo Minecraft invalide." });
  try {
    const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(parsed.data.name)}`, { headers: { Accept: "application/json" } });
    if (response.status === 404 || response.status === 204) return reply.code(404).send({ error: "Aucun compte Minecraft officiel trouvé avec ce pseudo." });
    if (!response.ok) throw new Error(`Mojang returned ${response.status}`);
    const profile = await response.json() as { id?: string; name?: string };
    if (!profile.id || !profile.name) throw new Error("Incomplete Mojang profile");
    reply.header("Cache-Control", "public, max-age=300");
    return { id: profile.id, name: profile.name };
  } catch {
    return reply.code(503).send({ error: "La vérification Minecraft est temporairement indisponible." });
  }
});

app.post("/api/auth/register", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (request, reply) => {
  const parsed = registerBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT", details: parsed.error.flatten().fieldErrors });
  const { password, minecraftUsername } = parsed.data;
  const email = normalizeEmail(parsed.data.email);
  const mojang = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(minecraftUsername)}`);
  if (!mojang.ok) return reply.code(400).send({ error: "MINECRAFT_ACCOUNT_NOT_FOUND" });
  const profile = await mojang.json() as { id: string; name: string };
  const userId = randomUUID();
  try {
    await transaction(async (connection) => {
      await connection.execute(`INSERT INTO users(id,email,password_hash,minecraft_username) VALUES(?,?,?,?)`, [userId, email, await hashPassword(password), profile.name]);
      await connection.execute(`INSERT INTO wallets(user_id,balance) VALUES(?,0)`, [userId]);
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return reply.code(409).send({ error: "EMAIL_ALREADY_USED" });
    throw error;
  }
  await createSession(reply, userId);
  return reply.code(201).send({ user: { id: userId, email, minecraft: { username: profile.name, uuid: null, linked: false } } });
});

app.post("/api/auth/login", { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } }, async (request, reply) => {
  const parsed = loginBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const [rows] = await pool.execute<UserRow[]>(`SELECT * FROM users WHERE email=? LIMIT 1`, [normalizeEmail(parsed.data.email)]);
  const user = rows[0];
  if (!user || !(await verifyPassword(user.password_hash, parsed.data.password))) return reply.code(401).send({ error: "INVALID_CREDENTIALS" });
  await createSession(reply, user.id);
  return { user: publicUser(user) };
});

app.post("/api/auth/logout", async (request, reply) => {
  const raw = request.cookies[sessionCookie];
  if (raw) await pool.execute(`DELETE FROM sessions WHERE token_hash=?`, [digest(raw)]);
  reply.clearCookie(sessionCookie, { path: "/" });
  return { ok: true };
});

app.get("/api/me", { preHandler: requireAccount }, async (request) => ({ user: publicUser(request.account!) }));

app.get("/api/wallet", { preHandler: requireAccount }, async (request) => {
  const [rows] = await pool.execute<(RowDataPacket & { balance: number })[]>(`SELECT balance FROM wallets WHERE user_id=? LIMIT 1`, [request.account!.id]);
  return { balance: rows[0]?.balance ?? 0, currency: "Stars" };
});

app.get("/api/shop/status", async () => ({ testPurchasesEnabled: config.ENABLE_TEST_PURCHASES }));

app.post("/api/shop/test-recharge", { preHandler: requireAccount, config: { rateLimit: { max: 4, timeWindow: "15 minutes" } } }, async (request, reply) => {
  if (!config.ENABLE_TEST_PURCHASES) return reply.code(404).send({ error: "TEST_PURCHASES_DISABLED" });
  if (!request.account!.minecraft_linked_at || !request.account!.minecraft_uuid) return reply.code(409).send({ error: "MINECRAFT_LINK_REQUIRED" });
  const parsed = testRechargeBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const providerReference = `test:${request.account!.id}`;
  const result = await transaction(async (connection) => {
    const [wallets] = await connection.execute<(RowDataPacket & { balance: number })[]>(`SELECT balance FROM wallets WHERE user_id=? FOR UPDATE`, [request.account!.id]);
    const balance = wallets[0]?.balance ?? 0;
    const [existing] = await connection.execute<(RowDataPacket & { id: string })[]>(`SELECT id FROM orders WHERE provider_reference=? LIMIT 1`, [providerReference]);
    if (existing[0]) return null;
    const orderId = randomUUID();
    await connection.execute(`INSERT INTO orders(id,user_id,provider,provider_reference,amount_cents,stars_amount,status,paid_at) VALUES(?,?,?,?,0,?,'paid',UTC_TIMESTAMP())`, [orderId, request.account!.id, "test", providerReference, parsed.data.starsAmount]);
    await connection.execute(`UPDATE wallets SET balance=balance+? WHERE user_id=?`, [parsed.data.starsAmount, request.account!.id]);
    await connection.execute(`INSERT INTO star_transactions(id,user_id,delta,kind,reference_id,metadata_json) VALUES(?,?,?,?,?,?)`, [randomUUID(), request.account!.id, parsed.data.starsAmount, "test_purchase", `order:${orderId}`, JSON.stringify({ simulated: true })]);
    return { orderId, balance: balance + parsed.data.starsAmount };
  });
  if (!result) return reply.code(409).send({ error: "TEST_PURCHASE_ALREADY_USED" });
  return reply.code(201).send({ ok: true, simulated: true, starsAdded: parsed.data.starsAmount, ...result });
});

app.post("/api/link/code", { preHandler: requireAccount, config: { rateLimit: { max: 6, timeWindow: "10 minutes" } } }, async (request, reply) => {
  if (request.account!.minecraft_linked_at) return reply.code(409).send({ error: "ALREADY_LINKED" });
  const code = linkCode();
  await transaction(async (connection) => {
    await connection.execute(`UPDATE link_codes SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND used_at IS NULL`, [request.account!.id]);
    await connection.execute(`INSERT INTO link_codes(id,user_id,code_hash,expires_at) VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`, [randomUUID(), request.account!.id, digest(code)]);
  });
  return { code, command: `/link ${code}`, expiresInSeconds: 600 };
});

app.get("/api/link/status", { preHandler: requireAccount }, async (request) => ({ linked: Boolean(request.account!.minecraft_linked_at), minecraft: request.account!.minecraft_uuid ? { uuid: request.account!.minecraft_uuid, username: request.account!.minecraft_username } : null }));

app.post("/api/internal/link/confirm", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!serverKeyMatches(serverKeyFrom(request))) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
  const parsed = confirmLinkBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const uuid = parsed.data.uuid.replaceAll("-", "").toLowerCase();
  try {
    const linked = await transaction(async (connection) => {
      const [codes] = await connection.execute<(RowDataPacket & { id: string; user_id: string })[]>(`SELECT id,user_id FROM link_codes WHERE code_hash=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() FOR UPDATE`, [digest(parsed.data.code)]);
      const match = codes[0];
      if (!match) return false;
      const [result] = await connection.execute<ResultSetHeader>(`UPDATE users SET minecraft_uuid=?,minecraft_username=?,minecraft_linked_at=UTC_TIMESTAMP() WHERE id=? AND minecraft_linked_at IS NULL`, [uuid, parsed.data.username, match.user_id]);
      if (result.affectedRows !== 1) return false;
      await connection.execute(`UPDATE link_codes SET used_at=UTC_TIMESTAMP() WHERE id=?`, [match.id]);
      return true;
    });
    if (!linked) return reply.code(404).send({ error: "INVALID_OR_EXPIRED_CODE" });
    return { linked: true, minecraft: { uuid, username: parsed.data.username } };
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return reply.code(409).send({ error: "MINECRAFT_ACCOUNT_ALREADY_LINKED" });
    throw error;
  }
});

app.post("/api/internal/stars/give", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!serverKeyMatches(serverKeyFrom(request))) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
  const parsed = giveStarsBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const referenceId = `admin:${parsed.data.requestId}`;
  const result = await transaction(async (connection) => {
    const [users] = await connection.execute<(RowDataPacket & { id: string; minecraft_username: string | null; balance: number })[]>(`SELECT u.id,u.minecraft_username,w.balance FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.minecraft_uuid=? FOR UPDATE`, [parsed.data.uuid]);
    const user = users[0];
    if (!user) return null;
    const [existing] = await connection.execute<(RowDataPacket & { id: string })[]>(`SELECT id FROM star_transactions WHERE reference_id=? LIMIT 1`, [referenceId]);
    if (existing[0]) return { balance: user.balance, username: user.minecraft_username, duplicate: true };
    await connection.execute(`UPDATE wallets SET balance=balance+? WHERE user_id=?`, [parsed.data.amount, user.id]);
    await connection.execute(`INSERT INTO star_transactions(id,user_id,delta,kind,reference_id,metadata_json) VALUES(?,?,?,?,?,?)`, [randomUUID(), user.id, parsed.data.amount, "admin_grant", referenceId, JSON.stringify({ reason: parsed.data.reason })]);
    return { balance: user.balance + parsed.data.amount, username: user.minecraft_username, duplicate: false };
  });
  if (!result) return reply.code(404).send({ error: "MINECRAFT_ACCOUNT_NOT_LINKED" });
  return { ok: true, ...result };
});

app.get("/api/internal/stars/balance", { config: { rateLimit: { max: 180, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!serverKeyMatches(serverKeyFrom(request))) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
  const parsed = z.object({ uuid: minecraftUuid }).safeParse(request.query);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const [rows] = await pool.execute<(RowDataPacket & { balance: number })[]>(`SELECT w.balance FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.minecraft_uuid=? LIMIT 1`, [parsed.data.uuid]);
  if (!rows[0]) return reply.code(404).send({ error: "MINECRAFT_ACCOUNT_NOT_LINKED" });
  return { balance: rows[0].balance, currency: "Stars" };
});

app.get("/api/internal/shop/catalog", { config: { rateLimit: { max: 180, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!serverKeyMatches(serverKeyFrom(request))) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
<<<<<<< HEAD
  return {
    currency: "Stars",
    theme: getShopTheme(),
    products: getGameShopCatalog().filter((product) => !product.testOnly),
  };
=======
  return { currency: "Stars", products: gameShopCatalog.filter((product) => !product.testOnly || config.ENABLE_TEST_PURCHASES) };
>>>>>>> 847eed66aff04d92bcc6b161a1a14adc8736b24e
});

app.post("/api/internal/shop/purchase", { config: { rateLimit: { max: 90, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!serverKeyMatches(serverKeyFrom(request))) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
  const parsed = gamePurchaseBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const product = findShopProduct(parsed.data.productId);
  if (!product || (product.testOnly && !config.ENABLE_TEST_PURCHASES)) return reply.code(404).send({ error: "PRODUCT_NOT_FOUND" });

  const result = await transaction(async (connection) => {
    const [users] = await connection.execute<(RowDataPacket & { id: string; balance: number })[]>(
      `SELECT u.id,w.balance FROM users u JOIN wallets w ON w.user_id=u.id WHERE u.minecraft_uuid=? FOR UPDATE`,
      [parsed.data.uuid],
    );
    const user = users[0];
    if (!user) return { error: "MINECRAFT_ACCOUNT_NOT_LINKED" as const };

    const [existing] = await connection.execute<(RowDataPacket & { id: string })[]>(
      `SELECT id FROM shop_purchases WHERE id=? LIMIT 1`, [parsed.data.requestId],
    );
    if (existing[0]) return { balance: user.balance, purchaseId: parsed.data.requestId, duplicate: true };
    if (user.balance < product.starsPrice) return { error: "INSUFFICIENT_STARS" as const, balance: user.balance };

    await connection.execute(`UPDATE wallets SET balance=balance-? WHERE user_id=?`, [product.starsPrice, user.id]);
    await connection.execute(
      `INSERT INTO shop_purchases(id,user_id,product_id,stars_spent) VALUES(?,?,?,?)`,
      [parsed.data.requestId, user.id, product.id, product.starsPrice],
    );
    await connection.execute(
      `INSERT INTO star_transactions(id,user_id,delta,kind,reference_id,metadata_json) VALUES(?,?,?,?,?,?)`,
      [randomUUID(), user.id, -product.starsPrice, "shop_purchase", `shop:${parsed.data.requestId}`, JSON.stringify({ productId: product.id })],
    );
    await connection.execute(
      `INSERT INTO reward_deliveries(id,purchase_id,user_id,product_id,item_id,item_count) VALUES(?,?,?,?,?,?)`,
      [randomUUID(), parsed.data.requestId, user.id, product.id, product.itemId, product.itemCount],
    );
    return { balance: user.balance - product.starsPrice, purchaseId: parsed.data.requestId, duplicate: false };
  });

  if ("error" in result) {
    return reply.code(result.error === "MINECRAFT_ACCOUNT_NOT_LINKED" ? 404 : 409).send(result);
  }
  return { ok: true, product: { id: product.id, name: product.name }, ...result };
});

app.post("/api/internal/rewards/claim", { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!serverKeyMatches(serverKeyFrom(request))) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
  const parsed = rewardClaimBody.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const leaseToken = randomToken();
  const reward = await transaction(async (connection) => {
    const [rows] = await connection.execute<(RowDataPacket & { id: string; product_id: string; item_id: string; item_count: number })[]>(`
      SELECT d.id,d.product_id,d.item_id,d.item_count
      FROM reward_deliveries d JOIN users u ON u.id=d.user_id
      WHERE u.minecraft_uuid=? AND d.failure_count<5
        AND (d.status='pending' OR (d.status='leased' AND d.lease_expires_at<UTC_TIMESTAMP()))
      ORDER BY d.created_at ASC LIMIT 1 FOR UPDATE`, [parsed.data.uuid]);
    const found = rows[0];
    if (!found) return null;
    await connection.execute(`UPDATE reward_deliveries SET status='leased',lease_token_hash=?,lease_expires_at=DATE_ADD(UTC_TIMESTAMP(), INTERVAL 2 MINUTE) WHERE id=?`, [digest(leaseToken), found.id]);
    return found;
  });
  if (!reward) return reply.code(204).send();
  return { reward: { id: reward.id, productId: reward.product_id, itemId: reward.item_id, itemCount: reward.item_count, leaseToken } };
});

app.post("/api/internal/rewards/:id/complete", { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!serverKeyMatches(serverKeyFrom(request))) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
  const params = rewardParams.safeParse(request.params);
  const body = rewardResultBody.safeParse(request.body);
  if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const [result] = await pool.execute<ResultSetHeader>(`UPDATE reward_deliveries d JOIN users u ON u.id=d.user_id SET d.status='delivered',d.delivered_at=UTC_TIMESTAMP(),d.lease_token_hash=NULL,d.lease_expires_at=NULL WHERE d.id=? AND u.minecraft_uuid=? AND d.status='leased' AND d.lease_token_hash=?`, [params.data.id, body.data.uuid, digest(body.data.leaseToken)]);
  if (result.affectedRows !== 1) return reply.code(409).send({ error: "LEASE_INVALID_OR_EXPIRED" });
  return { delivered: true };
});

app.post("/api/internal/rewards/:id/fail", { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } }, async (request, reply) => {
  if (!serverKeyMatches(serverKeyFrom(request))) return reply.code(401).send({ error: "INVALID_SERVER_KEY" });
  const params = rewardParams.safeParse(request.params);
  const body = rewardResultBody.safeParse(request.body);
  if (!params.success || !body.success) return reply.code(400).send({ error: "INVALID_INPUT" });
  const [result] = await pool.execute<ResultSetHeader>(`UPDATE reward_deliveries d JOIN users u ON u.id=d.user_id SET d.failure_count=d.failure_count+1,d.status=IF(d.failure_count>=5,'failed','pending'),d.last_error=?,d.lease_token_hash=NULL,d.lease_expires_at=NULL WHERE d.id=? AND u.minecraft_uuid=? AND d.status='leased' AND d.lease_token_hash=?`, [body.data.error ?? "Erreur de livraison Minecraft", params.data.id, body.data.uuid, digest(body.data.leaseToken)]);
  if (result.affectedRows !== 1) return reply.code(409).send({ error: "LEASE_INVALID_OR_EXPIRED" });
  return { released: true };
});

await app.register(staticFiles, {
  root: join(process.cwd(), "site"),
  prefix: "/",
  index: ["index.html"],
  wildcard: true,
});

app.setNotFoundHandler((request, reply) => {
  if (request.headers.accept?.includes("text/html")) return reply.code(404).sendFile("404.html");
  return reply.code(404).send({ error: "NOT_FOUND" });
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.code(500).send({ error: "INTERNAL_ERROR" });
});

await applyMigrations();
await app.listen({ host: config.HOST, port: config.PORT });
