import { createHmac } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { findVoteSite, playerVoteUrl } from './votes.js';
import { providerReady, VoteError, voteClientIp, voteProviders, type VoteSettings } from './vote-providers.js';

export type VoteActor = { id: string; minecraft_uuid: string | null; minecraft_username: string | null; minecraft_linked_at: unknown };
export type VoteAttempt = { id: string; user_id: string; vote_site: string; minecraft_uuid: string; username: string; otp: string | null; ip_hash: string | null; created_at: Date; expires_at: Date; claim_id: string | null };
export type VoteStore = {
  active(userId: string, site: string): Promise<VoteAttempt | null>;
  get(userId: string, id: string): Promise<VoteAttempt | null>;
  create(actor: VoteActor, site: string, otp: string | null, ipHash: string | null, expires: Date): Promise<VoteAttempt>;
  claim(actor: VoteActor, attempt: VoteAttempt, reference: string): Promise<string>;
};
const startBody = z.object({ siteId: z.enum(['top_serveurs','serveur_prive','serveursminecraft']) }).strict();
const checkBody = z.object({ attemptId: z.string().uuid() }).strict();
export function registerVoteVerification(app: FastifyInstance, deps: { settings: VoteSettings; origin: string; session(request: FastifyRequest): Promise<VoteActor | null>; store: VoteStore; providers?: ReturnType<typeof voteProviders> }) {
  const providers = deps.providers ?? voteProviders(deps.settings);
  const ipOf = (req: FastifyRequest) => voteClientIp(req.raw.socket.remoteAddress, req.headers['x-forwarded-for'], deps.settings.proxyPeers);
  const hash = (ip: string | null) => ip ? createHmac('sha256', deps.settings.ipSecret).update('vote-ip:'+ip).digest('hex') : null;
  const publicAttempt = (a: VoteAttempt) => {
    const site = findVoteSite(a.vote_site)!; const url = new URL(playerVoteUrl(site, a.username)!);
    if (a.otp) url.searchParams.set('token', a.otp);
    return { id: a.id, url: url.href, expiresAt: a.expires_at.toISOString() };
  };
  const route = (path: string, work: (actor: VoteActor, req: FastifyRequest) => Promise<unknown>) => {
    app.post(path, { bodyLimit: 1024, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
      reply.header('Cache-Control','private, no-store');
      const actor = await deps.session(req);
      if (!actor) return reply.code(401).send({ error: 'AUTH_REQUIRED' });
      if (req.headers.origin !== new URL(deps.origin).origin || req.headers['sec-fetch-site'] === 'cross-site') return reply.code(403).send({ error:'INVALID_ORIGIN' });
      if (!actor.minecraft_uuid || !actor.minecraft_linked_at || !/^[A-Za-z0-9_]{3,16}$/.test(actor.minecraft_username ?? '')) return reply.code(409).send({ error:'MINECRAFT_LINK_REQUIRED' });
      try { return await work(actor,req); }
      catch (e) {
        const code = e instanceof VoteError ? e.code : 'VOTE_SERVICE_UNAVAILABLE';
        const status = code === 'INVALID_INPUT' ? 400 : code === 'VOTE_ATTEMPT_NOT_FOUND' ? 404 : /UNAVAILABLE/.test(code) ? 503 : 409;
        // Do not pass fetch/database errors or URLs (which may contain API keys) to the logger.
        return reply.code(status).send({ error: code });
      }
    });
  };
  route('/api/votes/start', async (actor, req) => {
    const parsed = startBody.safeParse(req.body); if (!parsed.success) throw new VoteError('INVALID_INPUT');
    const site = findVoteSite(parsed.data.siteId);
    if (!site?.enabled || !site.url || !providerReady(site.id,deps.settings)) throw new VoteError('VOTE_PROVIDER_UNAVAILABLE');
    const ip = site.id === 'serveursminecraft' ? ipOf(req) : null;
    const ipHash = hash(ip);
    const active = await deps.store.active(actor.id,site.id);
    if (active && active.minecraft_uuid === actor.minecraft_uuid && active.username === actor.minecraft_username && active.ip_hash === ipHash) return { attempt: publicAttempt(active) };
    // Top/SM must first report "no vote". An old vote cannot become a new reward.
    const otp = site.id === 'serveur_prive' ? await providers.otp() : null;
    if (!otp && (await providers.check(site.id,actor.minecraft_username!,null,ip)).voted) throw new VoteError('VOTE_PROVIDER_COOLDOWN');
    const expires = new Date(Date.now() + (otp ? 280_000 : 900_000));
    const attempt = await deps.store.create(actor,site.id,otp,ipHash,expires);
    return { attempt: publicAttempt(attempt) };
  });
  route('/api/votes/check', async (actor,req) => {
    const parsed = checkBody.safeParse(req.body); if (!parsed.success) throw new VoteError('INVALID_INPUT');
    const attempt = await deps.store.get(actor.id,parsed.data.attemptId);
    if (!attempt) throw new VoteError('VOTE_ATTEMPT_NOT_FOUND');
    if (attempt.minecraft_uuid !== actor.minecraft_uuid || attempt.username !== actor.minecraft_username) throw new VoteError('VOTE_ACCOUNT_CHANGED');
    if (attempt.claim_id) return { verified:true, claimId:attempt.claim_id, rewardKeys:1 };
    if (attempt.expires_at.getTime() <= Date.now()) throw new VoteError('VOTE_ATTEMPT_EXPIRED');
    if (!providerReady(attempt.vote_site,deps.settings)) throw new VoteError('VOTE_PROVIDER_UNAVAILABLE');
    const ip = attempt.vote_site === 'serveursminecraft' ? ipOf(req) : null;
    if (attempt.ip_hash !== hash(ip)) throw new VoteError('VOTE_NETWORK_CHANGED');
    const proof = await providers.check(attempt.vote_site,attempt.username,attempt.otp,ip);
    if (!proof.voted) return { verified:false };
    if (proof.username && proof.username.toLowerCase() !== attempt.username.toLowerCase()) throw new VoteError('VOTE_USERNAME_MISMATCH');
    if (proof.votedAt && (proof.votedAt < attempt.created_at.getTime()-30_000 || proof.votedAt > Date.now()+30_000)) throw new VoteError('VOTE_PROOF_EXPIRED');
    const reference = proof.votedAt ? `${attempt.vote_site}:${attempt.minecraft_uuid}:${proof.votedAt}` : `${attempt.vote_site}:${attempt.id}`;
    const claimId = await deps.store.claim(actor,attempt,reference);
    return { verified:true, claimId, rewardKeys:1 };
  });
}
