import { isIP } from 'node:net';

export type VoteSettings = { topToken: string; privateToken: string; minecraftId: string; minecraftEnabled: boolean; proxyPeers: string[]; ipSecret: string };
export type VoteProof = { voted: false } | { voted: true; username?: string; votedAt?: number; remainingSeconds?: number };
export class VoteError extends Error { constructor(public code: string) { super(code); } }

// Fixed HTTPS hosts, bounded replies, no redirects, no provider URLs in errors/logs.
async function response(url: URL, fetcher: typeof fetch) {
  try {
    const res = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(6000), headers: { accept: 'application/json,text/plain' } });
    if (![200,404].includes(res.status)) throw new Error('status');
    const reader = res.body?.getReader(); if (!reader) throw new Error('empty');
    let size = 0; const chunks: Uint8Array[] = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 32_768) { await reader.cancel(); throw new Error('oversized'); } chunks.push(value); }
    return { status: res.status, text: Buffer.concat(chunks).toString('utf8') };
  } catch { throw new VoteError('VOTE_PROVIDER_UNAVAILABLE'); }
}
export function providerReady(id: string, s: VoteSettings) {
  return id === 'top_serveurs' ? Boolean(s.topToken) : id === 'serveur_prive' ? Boolean(s.privateToken)
    : id === 'serveursminecraft' && s.minecraftEnabled && /^\d+$/.test(s.minecraftId);
}
export function voteClientIp(peer: string | undefined, forwarded: unknown, trustedPeers: string[]) {
  const normalize = (ip: string) => ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  const direct = normalize(peer ?? '');
  if (!isIP(direct)) return null;
  if (!trustedPeers.map(normalize).includes(direct)) return direct;
  if (typeof forwarded !== 'string') return null;
  // Only the rightmost address appended by an explicitly trusted reverse proxy.
  const ip = normalize(forwarded.split(',').at(-1)!.trim());
  return isIP(ip) ? ip : null;
}
export function parseMinecraftEligibility(text: string): VoteProof {
  const value = text.trim();
  if (value === 'true') return { voted: false };
  if (/^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 86400)
    return { voted: true, remainingSeconds: Number(value) };
  throw new VoteError('VOTE_PROVIDER_UNAVAILABLE');
}
export function voteProviders(settings: VoteSettings, fetcher: typeof fetch = fetch) {
  return {
    async otp() {
      const { text, status } = await response(new URL(`https://serveur-prive.net/api/v1/servers/${encodeURIComponent(settings.privateToken)}/otp`), fetcher);
      try { const json = JSON.parse(text); const token = json.data?.token;
        if (status !== 200 || json.success !== true || typeof token !== 'string' || !/^[a-zA-Z0-9_-]{6,200}$/.test(token)) throw new Error();
        return token as string;
      } catch { throw new VoteError('VOTE_PROVIDER_UNAVAILABLE'); }
    },
    async check(id: string, username: string, otp: string | null, ip: string | null): Promise<VoteProof> {
      if (id === 'serveursminecraft') {
        if (!ip || !isIP(ip)) throw new VoteError('VOTE_IP_UNAVAILABLE');
        const url = new URL('https://www.serveursminecraft.org/sm_api/peutVoter.php');
        url.searchParams.set('id', settings.minecraftId); url.searchParams.set('ip', ip);
        const res = await response(url, fetcher); if (res.status !== 200) throw new VoteError('VOTE_PROVIDER_UNAVAILABLE');
        return parseMinecraftEligibility(res.text);
      }
      const url = id === 'top_serveurs' ? new URL('https://api.top-serveurs.net/v1/votes/check')
        : new URL(`https://serveur-prive.net/api/v1/servers/${encodeURIComponent(settings.privateToken)}/votes/otp/${encodeURIComponent(otp ?? '')}`);
      if (id === 'top_serveurs') { url.searchParams.set('server_token', settings.topToken); url.searchParams.set('playername', username); }
      const { text, status } = await response(url, fetcher);
      try {
        const json = JSON.parse(text);
        if (status === 404 && json.success === false && (id === 'top_serveurs' ? json.code === 404 : json.message === 'User not voted')) return { voted: false };
        if (status !== 200 || json.success !== true) throw new Error();
        if (id === 'top_serveurs') {
          if (json.code !== 200 || typeof json.duration !== 'number' || !Number.isFinite(json.duration) || json.duration < 0 || json.duration > 120) throw new Error();
          return { voted: true, remainingSeconds: Math.ceil(json.duration * 60) };
        }
        const d = json.data;
        if (typeof d?.username !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(d.username) || !Number.isSafeInteger(d.voted_at) || !Number.isInteger(d.next_vote_seconds) || d.next_vote_seconds < 0 || d.next_vote_seconds > 5400) throw new Error();
        return { voted: true, username: d.username, votedAt: d.voted_at * 1000, remainingSeconds: d.next_vote_seconds };
      } catch { throw new VoteError('VOTE_PROVIDER_UNAVAILABLE'); }
    }
  };
}
