import test from "node:test";
import assert from "node:assert/strict";
import { ArenaChunks, arenaChunk, CHUNK_BODY_LIMIT, MAX_SYNC_BYTES } from "../dist/arena-chunks.js";
import { chunkEnvelope } from "./fixtures/arena-chunks.mjs";
const large = () => ({ serverId: "main", text: "Évoli 🌟".repeat(110000) });
const failure = (fn, status) => assert.throws(fn, e => e.status === status);

test("large UTF-8 transfer, out-of-order parts after start and duplicates preserve exact content", () => {
  const value = large(), parts = chunkEnvelope(value), store = new ArenaChunks();
  assert.ok(Buffer.byteLength(JSON.stringify(value)) > 1024 * 1024);
  for (const part of parts) { arenaChunk.parse(part); assert.ok(Buffer.byteLength(JSON.stringify(part)) < CHUNK_BODY_LIMIT); }
  assert.equal(store.accept(parts[0]), null);
  assert.equal(store.accept(parts[0]), null);
  for (let i = parts.length - 1; i > 1; i--) assert.equal(store.accept(parts[i]), null);
  assert.deepEqual(store.accept(parts[1]), value);
});
test("fixed expiry, process restart and new upload all require a new first part", () => {
  let clock = 0; const store = new ArenaChunks(() => clock), parts = chunkEnvelope(large());
  store.accept(parts[0]); clock = 119999; store.accept(parts[0]); clock = 120000;
  failure(() => store.accept(parts[1]), 409);
  failure(() => new ArenaChunks().accept(parts[1]), 409);
  store.accept(parts[0]); const next = chunkEnvelope(large()); store.accept(next[0]);
  failure(() => store.accept(parts[1]), 409);
  for (const part of next.slice(1, -1)) store.accept(part);
  assert.deepEqual(store.accept(next.at(-1)), large());
});
test("invalid encodings, size, metadata, duplicate conflicts and hash corruption are rejected", () => {
  const parts = chunkEnvelope(large());
  for (const patch of [{ total: 1 }, { index: 15 }, { data: "!!!!" }, { data: parts[0].data + "\n" }])
    failure(() => new ArenaChunks().accept({ ...parts[0], ...patch }), 400);
  const store = new ArenaChunks(); store.accept(parts[0]);
  failure(() => store.accept({ ...parts[1], sha256: "0".repeat(64) }), 409);
  const altered = Buffer.from(parts[0].data, "base64"); altered[0] ^= 1;
  failure(() => store.accept({ ...parts[0], data: altered.toString("base64") }), 409);
  const corrupt = new ArenaChunks();
  for (const part of parts.slice(0, -1)) corrupt.accept({ ...part, sha256: "0".repeat(64) });
  failure(() => corrupt.accept({ ...parts.at(-1), sha256: "0".repeat(64) }), 400);
  assert.equal(arenaChunk.safeParse({ ...parts[0], bytes: MAX_SYNC_BYTES + 1 }).success, false);
  for (const raw of [Buffer.from("null"), Buffer.from("[]"), Buffer.from("not json"), Buffer.from([0xff])])
    failure(() => new ArenaChunks().accept(chunkEnvelope(raw)[0]), 400);
});
test("memory cap, server isolation and expiry cleanup", () => {
  let clock = 0; const store = new ArenaChunks(() => clock);
  for (let i = 0; i < 8; i++) store.accept(chunkEnvelope(large(), "server" + i)[0]);
  const main = chunkEnvelope(large()); failure(() => store.accept(main[0]), 429);
  clock = 120000; assert.equal(store.accept(main[0]), null);
  failure(() => store.accept({ ...main[1], serverId: "other" }), 409);
  store.clear(); failure(() => store.accept(main[1]), 409);
});
