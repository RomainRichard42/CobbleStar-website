import type { FastifyInstance, FastifyRequest } from 'fastify';
import sharp from 'sharp';

const uuidPattern = /^[a-f0-9]{32}$/;
const skinPattern = /^https?:\/\/textures\.minecraft\.net\/texture\/([a-f0-9]{64})$/i;
const freshFor = 30 * 60_000;
const staleFor = 24 * 60 * 60_000;

async function limitedBody(response: Response, maxBytes: number) {
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > maxBytes) throw new Error('Skin source unavailable');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new Error('Skin source too large');
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(parts);
}

export async function renderMinecraftFace(skin: Buffer) {
  const image = sharp(skin, { limitInputPixels: 4096, animated: false });
  const metadata = await image.metadata();
  if (metadata.format !== 'png' || metadata.width !== 64 || ![32, 64].includes(metadata.height ?? 0)) throw new Error('Invalid Minecraft skin');
  const hat = await image.clone().extract({ left: 40, top: 8, width: 8, height: 8 }).png().toBuffer();
  return image.extract({ left: 8, top: 8, width: 8, height: 8 }).ensureAlpha()
    .composite([{ input: hat }]).png().toBuffer()
    .then(face => sharp(face).resize(64, 64, { kernel: 'nearest' }).png().toBuffer());
}

// Only an official profile for this UUID can supply a skin. Image services can
// return Steve with HTTP 200, which cannot trigger the browser's Discord fallback.
export function createMinecraftAvatarStore(options: { fetch?: typeof fetch; now?: () => number } = {}) {
  const request = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const cache = new Map<string, { image?: Buffer; fetchedAt: number; retryAt: number }>();
  const pending = new Map<string, Promise<Buffer | undefined>>();
  async function load(uuid: string) {
    const profileResponse = await request(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`, {
      signal: AbortSignal.timeout(3500), redirect: 'error', headers: { Accept: 'application/json' },
    });
    const profile = JSON.parse((await limitedBody(profileResponse, 32_768)).toString('utf8'));
    if (profile.id !== uuid || !Array.isArray(profile.properties)) throw new Error('Unverified Minecraft profile');
    const encoded = profile.properties.find((property: { name?: string }) => property.name === 'textures')?.value;
    if (typeof encoded !== 'string') throw new Error('Minecraft skin unavailable');
    const textures = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    const texture = skinPattern.exec(textures?.textures?.SKIN?.url ?? '');
    if (textures.profileId !== uuid || !texture) throw new Error('Unverified Minecraft texture');
    const skinResponse = await request(`https://textures.minecraft.net/texture/${texture[1]}`, {
      signal: AbortSignal.timeout(3500), redirect: 'error', headers: { Accept: 'image/png' },
    });
    return renderMinecraftFace(await limitedBody(skinResponse, 262_144));
  }
  return {
    async get(uuid: string): Promise<Buffer | undefined> {
      if (!uuidPattern.test(uuid)) return undefined;
      const cached = cache.get(uuid);
      if (cached && (now() < cached.retryAt || (cached.image && now() - cached.fetchedAt < freshFor))) {
        return cached.image && now() - cached.fetchedAt < staleFor ? cached.image : undefined;
      }
      if (pending.has(uuid)) return pending.get(uuid);
      if (pending.size >= 8) return undefined;
      const operation = (async () => {
        try {
          const image = await load(uuid);
          cache.set(uuid, { image, fetchedAt: now(), retryAt: 0 });
          return image;
        } catch {
          const image = cached?.image && now() - cached.fetchedAt < staleFor ? cached.image : undefined;
          cache.set(uuid, { image, fetchedAt: cached?.fetchedAt ?? 0, retryAt: now() + 60_000 });
          return image;
        } finally {
          if (cache.size > 200) cache.delete(cache.keys().next().value!);
          pending.delete(uuid);
        }
      })();
      pending.set(uuid, operation);
      return operation;
    },
  };
}

type Player = { minecraft_uuid: string | null; minecraft_linked_at: Date | null };
export function registerMinecraftAvatars(app: FastifyInstance, auth: {
  session: (request: FastifyRequest) => Promise<Player | null>;
  publicVoter?: (uuid: string) => Promise<boolean>;
}, avatars = createMinecraftAvatarStore()) {
  app.get('/api/votes/avatars/:uuid', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const { uuid } = request.params as { uuid: string };
    if (!uuidPattern.test(uuid) || !await auth.publicVoter?.(uuid)) return reply.code(404).send({ error: 'VOTER_NOT_FOUND' });
    const image = await avatars.get(uuid);
    if (!image) return reply.header('Retry-After', '60').code(503).send({ error: 'MINECRAFT_SKIN_UNAVAILABLE' });
    return reply.header('Cache-Control', 'public, max-age=300').type('image/png').send(image);
  });
  app.get('/api/me/avatar', async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const player = await auth.session(request);
    if (!player) return reply.code(401).send({ error: 'AUTH_REQUIRED' });
    const uuid = player.minecraft_uuid;
    const supplied = (request.query as { uuid?: unknown }).uuid;
    if (!uuid || !player.minecraft_linked_at) return reply.code(409).send({ error: 'MINECRAFT_NOT_LINKED' });
    if (supplied !== uuid) return reply.code(400).send({ error: 'AVATAR_IDENTITY_MISMATCH' });
    const image = await avatars.get(uuid);
    if (!image) return reply.header('Retry-After', '60').code(503).send({ error: 'MINECRAFT_SKIN_UNAVAILABLE' });
    return reply.header('Cache-Control', 'private, max-age=300').type('image/png').send(image);
  });
}
