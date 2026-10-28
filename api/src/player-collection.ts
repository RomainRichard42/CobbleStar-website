import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { DexEntry } from './public-dex.js';

type Actor = { id: string; minecraft_uuid: string | null; minecraft_linked_at: unknown };
export type Preference = { species: string; favorite: boolean; wanted: boolean; target: number; shiny: boolean; note: string };
export type Snapshot = { snapshot_json: unknown; observed_at: number };
export type CollectionStore = {
  preferences: (userId: string) => Promise<Preference[]>;
  snapshot: (uuid: string) => Promise<Snapshot | null>;
  save: (userId: string, preference: Preference) => Promise<void>;
};
const preference = z.object({
  species: z.string().regex(/^[a-z0-9_]{1,80}$/), favorite: z.boolean(), wanted: z.boolean(),
  target: z.number().int().min(1).max(999), shiny: z.boolean(), note: z.string().trim().max(160),
}).strict();

// The bridge reports current party/PC ownership, not a lifetime capture history.
// Only aggregate public species; never return raw save data, coordinates or UUIDs.
export function summarizeCollection(row: Snapshot | null, entries: DexEntry[]) {
  if (!row) return { state: 'waiting', observedAt: null, owned: [] };
  let snapshot: any;
  try { snapshot = typeof row.snapshot_json === 'string' ? JSON.parse(row.snapshot_json) : row.snapshot_json; } catch { snapshot = null; }
  if (!snapshot || !Array.isArray(snapshot.pokemon) || snapshot.pokemonError)
    return { state: 'unavailable', observedAt: Number(row.observed_at), owned: [] };
  const publicSpecies = new Set(entries.map(e => e.species));
  const seen = new Set<string>();
  const owned = new Map<string, { species: string; count: number; shiny: number; party: number; pc: number }>();
  for (const p of snapshot.pokemon) {
    if (typeof p?.species !== 'string' || typeof p.uuid !== 'string' || seen.has(p.uuid) || !['party', 'pc'].includes(p.storage)) continue;
    seen.add(p.uuid);
    const species = p.species.replace(/^[a-z0-9_.-]+:/, '');
    if (!publicSpecies.has(species)) continue;
    const item = owned.get(species) ?? { species, count: 0, shiny: 0, party: 0, pc: 0 };
    item.count++; if (p.shiny === true) item.shiny++; item[p.storage as 'party' | 'pc']++;
    owned.set(species, item);
  }
  return { state: snapshot.pokemonTruncated ? 'partial' : 'ready', observedAt: Number(row.observed_at), owned: [...owned.values()] };
}

export function registerPlayerCollection(app: FastifyInstance, dependencies: {
  session: (request: FastifyRequest) => Promise<Actor | null>; origin: string;
  entries: () => Promise<DexEntry[]>; store: CollectionStore;
}) {
  const { session, store, entries } = dependencies;
  app.get('/api/me/collection', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const actor = await session(request);
    if (!actor) return reply.code(401).send({ error: 'AUTH_REQUIRED' });
    const linked = Boolean(actor.minecraft_uuid && actor.minecraft_linked_at);
    const [catalog, preferences, row] = await Promise.all([entries(), store.preferences(actor.id), linked ? store.snapshot(actor.minecraft_uuid!) : null]);
    const visible = new Set(catalog.map(e => e.species));
    return { userId: actor.id, linked, ...summarizeCollection(row, catalog), preferences: preferences.filter(p => visible.has(p.species)) };
  });
  app.put('/api/me/collection', { bodyLimit: 4096, config: { rateLimit: { max: 90, timeWindow: '1 minute' } } }, async (request, reply) => {
    reply.header('Cache-Control', 'private, no-store');
    const actor = await session(request);
    if (!actor) return reply.code(401).send({ error: 'AUTH_REQUIRED' });
    if (request.headers.origin !== new URL(dependencies.origin).origin) return reply.code(403).send({ error: 'INVALID_ORIGIN' });
    if (request.headers['x-collection-account'] !== actor.id) return reply.code(409).send({ error: 'ACCOUNT_CHANGED' });
    const parsed = preference.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_COLLECTION_GOAL' });
    if (!(await entries()).some(e => e.species === parsed.data.species)) return reply.code(404).send({ error: 'POKEMON_NOT_PUBLISHED' });
    await store.save(actor.id, parsed.data);
    return { userId: actor.id, preference: parsed.data };
  });
}
