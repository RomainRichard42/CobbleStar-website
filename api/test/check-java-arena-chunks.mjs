import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ArenaChunks, arenaChunk, CHUNK_BODY_LIMIT } from "../dist/arena-chunks.js";
if (!process.argv[2]) throw Error("Pass the explicit JSON fixture emitted by ArenaBridgeProtocolTest");
const parts = JSON.parse(await readFile(process.argv[2], "utf8"));
const store = new ArenaChunks(); let result;
for (const part of parts) {
  assert.ok(Buffer.byteLength(JSON.stringify(part)) < CHUNK_BODY_LIMIT);
  result = store.accept(arenaChunk.parse(part));
  if (part.index < parts.length - 1) assert.equal(result, null);
}
assert.deepEqual(result, { serverId: "main", text: "Évoli 🌟".repeat(110000) });
console.log(`PASS: ${parts.length} real Java fragments assembled byte-for-byte by the production TypeScript receiver`);
