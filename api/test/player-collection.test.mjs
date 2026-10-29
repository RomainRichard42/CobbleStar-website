import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerPlayerCollection, summarizeCollection } from '../dist/player-collection.js';

const entries = [{ species: 'eevee', id: 'native-eevee' }, { species: 'dragonite', id: 'native-dragonite' }, { species: 'dragonite', id: 'star-dragonite-base', collection: 'Star' }];
const preference = { species: 'eevee', favorite: true, wanted: true, target: 3, shiny: false, note: 'Mon équipe' };
const snapshot = { observed_at: 1000, snapshot_json: { pokemonTruncated: false, x: 900, inventory: ['private'], pokemon: [
 { uuid: 'one', species: 'cobblemon:eevee', storage: 'party', shiny: false, data: { secret: true } },
 { uuid: 'two', species: 'cobblemon:eevee', storage: 'pc', shiny: true },
 { uuid: 'two', species: 'cobblemon:eevee', storage: 'pc', shiny: true },
 { uuid: 'three', species: 'private_species', storage: 'pc', shiny: false },
 ] } };
test('collection is a public species projection of current ownership, deduplicated across storage', () => {
 assert.deepEqual(summarizeCollection(snapshot, entries), { state: 'ready', observedAt: 1000, owned: [{ species: 'eevee', count: 2, shiny: 1, star: 0, party: 1, pc: 1 }] });
 assert.equal(summarizeCollection(null, entries).state, 'waiting');
 assert.equal(summarizeCollection({ ...snapshot, snapshot_json: { ...snapshot.snapshot_json, pokemonTruncated: true } }, entries).state, 'partial');
 assert.equal(summarizeCollection({ ...snapshot, snapshot_json: { ...snapshot.snapshot_json, pokemonError: 'private error' } }, entries).state, 'unavailable');
 assert.equal(summarizeCollection({ ...snapshot, snapshot_json: '{bad' }, entries).state, 'unavailable');
 assert.deepEqual(summarizeCollection({ ...snapshot, snapshot_json: { pokemon: [] } }, entries).owned, []);
});

async function appFor(actor) {
 const reads = [], writes = []; const app = Fastify();
 registerPlayerCollection(app, { origin: 'https://example.test', session: async () => actor,
 entries: async () => entries, store: {
  preferences: async id => { reads.push(['preferences', id]); return [preference, { ...preference, species: 'private_species' }]; },
  snapshot: async uuid => { reads.push(['snapshot', uuid]); return snapshot; },
  save: async (id, p) => { writes.push([id, p]); },
 } });
 return { app, reads, writes };
}
const actor = { id: 'owner', minecraft_uuid: 'a'.repeat(32), minecraft_linked_at: new Date() };

test('Star counts use the game marker, not the species or nickname, without exposing save data', () => {
 const row = { observed_at: 2000, snapshot_json: { pokemon: [
  {uuid:'1',species:'dragonite',storage:'party',data:{PersistentData:{cobblestar_star:1,secret:'hidden'}}},
  {uuid:'2',species:'dragonite',storage:'pc',data:{ForcedAspects:['cobblestar-star']}},
  {uuid:'2',species:'dragonite',storage:'pc',data:{ForcedAspects:['cobblestar-star']}},
  {uuid:'3',species:'dragonite',storage:'pc',name:'Star',shiny:true,data:{PersistentData:{cobblestar_star:0}}},
 ]}};
 const result = summarizeCollection(row,entries);
 assert.deepEqual(result.owned,[{species:'dragonite',count:3,shiny:1,star:2,party:1,pc:2}]);
 assert.doesNotMatch(JSON.stringify(result),/hidden|PersistentData|ForcedAspects/);
});

test('Star goals require a published Star and keep hunt stage server-side', async t => {
 const {app,writes} = await appFor(actor);t.after(()=>app.close());
 const send = payload => app.inject({method:'PUT',url:'/api/me/collection',headers:{origin:'https://example.test','x-collection-account':'owner'},payload});
 assert.equal((await send({...preference,star:true})).statusCode,400);
 assert.equal((await send({...preference,species:'dragonite',star:true,shiny:true})).statusCode,400);
 assert.equal((await send({...preference,stage:'done'})).statusCode,400);
 const valid={...preference,species:'dragonite',star:true,stage:'active'};
 assert.equal((await send(valid)).statusCode,200);
 assert.deepEqual(writes,[['owner',valid]]);
});
test('unauthenticated requests never read or write player data', async t => {
 const { app, reads, writes } = await appFor(null); t.after(() => app.close());
 for (const method of ['GET', 'PUT']) {
  const r = await app.inject({ method, url: '/api/me/collection', ...(method === 'PUT' ? { payload: preference } : {}) });
  assert.equal(r.statusCode, 401); assert.match(r.headers['cache-control'], /no-store/);
 }
 assert.deepEqual(reads, []); assert.deepEqual(writes, []);
});
test('only the session owner and verified Minecraft UUID determine the collection', async t => {
 const { app, reads } = await appFor(actor); t.after(() => app.close());
 const r = await app.inject('/api/me/collection?userId=other&uuid=other');
 assert.equal(r.statusCode, 200); assert.deepEqual(reads, [['preferences', 'owner'], ['snapshot', actor.minecraft_uuid]]);
 assert.deepEqual(r.json().preferences, [preference]); assert.equal(r.json().owned[0].count, 2);
 assert.doesNotMatch(r.body, /private_species|inventory|secret|private error/);
});
test('unlinked accounts keep wishlists without reading game data', async t => {
 const { app, reads } = await appFor({ ...actor, minecraft_linked_at: null }); t.after(() => app.close());
 const r = await app.inject('/api/me/collection'); assert.equal(r.json().linked, false); assert.equal(r.json().state, 'waiting');
 assert.deepEqual(reads, [['preferences', 'owner']]);
});
test('writes require same origin and reject forged ownership, possession or invalid goals', async t => {
 const { app, writes } = await appFor(actor); t.after(() => app.close());
 for (const origin of [undefined, 'https://attacker.test', 'null']) {
  const r = await app.inject({ method: 'PUT', url: '/api/me/collection', headers: origin ? { origin } : {}, payload: preference }); assert.equal(r.statusCode, 403);
 }
 for (const change of [{ userId: 'other' }, { owned: true }, { target: 0 }, { target: 1000 }, { target: 1.5 }, { note: 'x'.repeat(161) }, { shiny: 'true' }]) {
  const r = await app.inject({ method: 'PUT', url: '/api/me/collection', headers: { origin: 'https://example.test', 'x-collection-account': 'owner' }, payload: { ...preference, ...change } }); assert.equal(r.statusCode, 400);
 }
 const hidden = await app.inject({ method: 'PUT', url: '/api/me/collection', headers: { origin: 'https://example.test', 'x-collection-account': 'owner' }, payload: { ...preference, species: 'private_species' } }); assert.equal(hidden.statusCode, 404);
 assert.deepEqual(writes, []);
 const ok = await app.inject({ method: 'PUT', url: '/api/me/collection', headers: { origin: 'https://example.test', 'x-collection-account': 'owner' }, payload: preference });
 assert.equal(ok.statusCode, 200); assert.deepEqual(writes, [['owner', preference]]);
});

test('an old tab cannot write a wishlist into a newly signed-in account', async t => {
 const { app, writes } = await appFor(actor); t.after(() => app.close());
 const r = await app.inject({ method: 'PUT', url: '/api/me/collection', headers: { origin: 'https://example.test', 'x-collection-account': 'previous-owner' }, payload: preference });
 assert.equal(r.statusCode, 409); assert.deepEqual(writes, []);
});
