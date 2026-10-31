import Stripe from "stripe";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { starPacks } from "./star-packs.js";
import { PaymentError, type PaymentMode, type PaymentSnapshot, type PaymentStore } from "./stripe-store.js";

type PaymentAccount = { id: string; discord_id: string | null; minecraft_uuid: string | null; minecraft_linked_at: Date | null };
type Settings = {
  enabled: boolean; mode: PaymentMode; secretKey: string; webhookSecret: string;
  siteOrigin: string; testerIds: string[]; legacyTestPurchases: boolean;
};
type Dependencies = {
  session(request: FastifyRequest): Promise<PaymentAccount | null>;
  sessionHash(request: FastifyRequest): string | null;
  store: PaymentStore;
  // SDK injection is used by tests only; production always constructs the official Stripe client.
  stripe?: Pick<Stripe, "checkout" | "webhooks">;
};
const checkoutBody = z.object({ packId: z.string().max(32), requestId: z.string().uuid() }).strict();
const orderParams = z.object({ id: z.string().uuid() });
const sessionEvents = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed", "checkout.session.expired"]);

export function stripeConfigurationValid(settings: Pick<Settings, "mode" | "secretKey" | "webhookSecret">) {
  return settings.secretKey.startsWith(`sk_${settings.mode}_`) && settings.secretKey.length > 20
    && settings.webhookSecret.startsWith("whsec_") && settings.webhookSecret.length > 20;
}
export function checkoutAddressValid(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "checkout.stripe.com" && !url.username && !url.password; }
  catch { return false; }
}
function snapshot(session: Stripe.Checkout.Session): PaymentSnapshot {
  const metadata = session.metadata;
  if (session.mode !== "payment" || metadata?.product !== "cobblestar_stars" || !z.string().uuid().safeParse(metadata.order_id).success
    || !session.id.startsWith(`cs_${session.livemode ? "live" : "test"}_`)) throw new PaymentError("PAYMENT_METADATA_INVALID");
  const first = session.line_items?.data[0];
  return {
    id: session.id, orderId: metadata.order_id!, packId: metadata.pack_id ?? "",
    mode: session.livemode ? "live" : "test", currency: session.currency,
    total: session.amount_total, subtotal: session.amount_subtotal,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    paid: session.payment_status === "paid", complete: session.status === "complete", expired: session.status === "expired",
    lineCount: session.line_items?.has_more ? -1 : session.line_items?.data.length ?? 0,
    lineQuantity: first?.quantity ?? null, lineTotal: first?.amount_total ?? null,
    lineCurrency: first?.currency ?? null, clientReference: session.client_reference_id,
  };
}

export function registerStripePayments(app: FastifyInstance, settings: Settings, dependencies: Dependencies) {
  const configured = stripeConfigurationValid(settings);
  const stripe = configured ? dependencies.stripe ?? new Stripe(settings.secretKey, { maxNetworkRetries: 2, timeout: 15_000 }) : null;
  if (settings.enabled && !configured) app.log.error("Stripe désactivé : vérifier le mode, STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET.");
  const canCheckout = (user: PaymentAccount | null) => Boolean(stripe && settings.enabled &&
    (settings.mode === "live" || user?.discord_id && settings.testerIds.includes(user.discord_id)));
  const fail = (error: unknown, reply: FastifyReply) => {
    if (error instanceof PaymentError) return reply.code(error.status).send({ error: error.code });
    // Never log an SDK error object: it may contain request headers or customer/payment details.
    app.log.error({ code: "STRIPE_REQUEST_FAILED" }, "Le paiement Stripe nécessite une nouvelle tentative.");
    return reply.code(503).send({ error: "PAYMENT_TEMPORARILY_UNAVAILABLE" });
  };

  app.get("/api/shop/status", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const user = settings.mode === "test" && configured && settings.enabled ? await dependencies.session(request) : null;
    const enabled = canCheckout(user);
    return { testPurchasesEnabled: settings.legacyTestPurchases, checkoutEnabled: enabled,
      checkoutMode: enabled ? settings.mode : null, packs: starPacks };
  });
  app.post("/api/shop/checkout", { config: { rateLimit: { max: 6, timeWindow: "10 minutes" } } }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (request.headers.origin !== new URL(settings.siteOrigin).origin || request.headers["sec-fetch-site"] === "cross-site")
      return reply.code(403).send({ error: "ORIGIN_REJECTED" });
    const user = await dependencies.session(request);
    const sessionHash = dependencies.sessionHash(request);
    if (!user || !sessionHash) return reply.code(401).send({ error: "AUTH_REQUIRED" });
    if (!canCheckout(user) || !stripe) return reply.code(503).send({ error: "CHECKOUT_UNAVAILABLE" });
    if (!user.minecraft_uuid || !user.minecraft_linked_at) return reply.code(409).send({ error: "MINECRAFT_LINK_REQUIRED" });
    const parsed = checkoutBody.safeParse(request.body);
    const pack = parsed.success ? starPacks.find(p => p.id === parsed.data.packId) : null;
    if (!parsed.success || !pack) return reply.code(400).send({ error: "INVALID_PACK" });
    try {
      const order = await dependencies.store.reserve(user.id, sessionHash, parsed.data.requestId, pack, settings.mode);
      if (order.status === "paid" || order.status === "test_paid") return { orderId: order.id, status: order.status };
      if (order.expiresAt <= Date.now() || order.status !== "pending") throw new PaymentError("CHECKOUT_EXPIRED");
      if (order.url && checkoutAddressValid(order.url)) return { orderId: order.id, url: order.url };
      if (order.expiresAt - Date.now() < 31 * 60_000) throw new PaymentError("CHECKOUT_EXPIRED");
      const metadata = { product: "cobblestar_stars", order_id: order.id, pack_id: order.packId };
      const checkout = await stripe.checkout.sessions.create({
        mode: "payment", locale: "fr", allowed_payment_method_types: ["card"],
        client_reference_id: order.id, metadata, payment_intent_data: { metadata },
        line_items: [{ quantity: 1, price_data: { currency: order.currency, unit_amount: order.amountCents,
          product_data: { name: `${order.stars.toLocaleString("fr-FR")} Stars — CobbleStar`,
            description: "Monnaie virtuelle CobbleStar. Paiement unique, sans abonnement." } } }],
        success_url: new URL(`/boutique/?commande=${order.id}#stars`, settings.siteOrigin).toString(),
        cancel_url: new URL(`/boutique/?paiement=annule&commande=${order.id}#stars`, settings.siteOrigin).toString(),
        expires_at: Math.floor(order.expiresAt / 1000),
      }, { idempotencyKey: `stars:${order.id}` });
      if (!checkout.url || !checkoutAddressValid(checkout.url) || checkout.livemode !== (settings.mode === "live")
        || !checkout.id.startsWith(`cs_${settings.mode}_`)) throw new PaymentError("CHECKOUT_SESSION_INVALID", 503);
      await dependencies.store.attach(order, { id: checkout.id, url: checkout.url });
      return reply.code(201).send({ orderId: order.id, url: checkout.url });
    } catch (error) { return fail(error, reply); }
  });

  app.get("/api/shop/orders/:id", { config: { rateLimit: { max: 40, timeWindow: "1 minute" } } }, async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const user = await dependencies.session(request);
    if (!user) return reply.code(401).send({ error: "AUTH_REQUIRED" });
    const parsed = orderParams.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_ORDER" });
    const order = await dependencies.store.read(parsed.data.id, user.id);
    if (!order) return reply.code(404).send({ error: "ORDER_NOT_FOUND" });
    // Reading the return URL never grants Stars. Only a signed, reconciled payment can do that.
    return { orderId: order.id, status: order.status, stars: order.stars,
      amountCents: order.amountCents, currency: order.currency, test: order.mode === "test" };
  });

  // Encapsulation keeps raw-body parsing local to this one route; other APIs keep their JSON parser.
  app.register(async scope => {
    scope.removeContentTypeParser("application/json");
    scope.addContentTypeParser("application/json", { parseAs: "buffer" }, (_request, body, done) => done(null, body));
    scope.post("/api/payments/stripe/webhook", { bodyLimit: 256 * 1024,
      config: { rateLimit: { max: 180, timeWindow: "1 minute" } } }, async (request, reply) => {
      if (!stripe) return reply.code(503).send({ error: "STRIPE_UNCONFIGURED" });
      const signature = request.headers["stripe-signature"];
      if (typeof signature !== "string" || !Buffer.isBuffer(request.body))
        return reply.code(400).send({ error: "INVALID_SIGNATURE" });
      let event: Stripe.Event;
      try { event = stripe.webhooks.constructEvent(request.body, signature, settings.webhookSecret); }
      catch { return reply.code(400).send({ error: "INVALID_SIGNATURE" }); }
      if (event.livemode !== (settings.mode === "live")) return reply.code(400).send({ error: "PAYMENT_MODE_MISMATCH" });
      if (!sessionEvents.has(event.type)) return { received: true, ignored: true };
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.product !== "cobblestar_stars") return { received: true, ignored: true };
      if (!/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(session.id)) return reply.code(400).send({ error: "INVALID_SESSION" });
      try {
        // Re-read Stripe rather than fulfilling an old event snapshot (delayed/out-of-order deliveries).
        const current = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items"] });
        const result = await dependencies.store.settle(snapshot(current), event.id, event.type);
        return { received: true, ...result };
      } catch (error) {
        if (error instanceof PaymentError) app.log.warn({ code: error.code, eventId: event.id }, "Paiement Stripe à vérifier.");
        return fail(error, reply);
      }
    });
  });
}
