import { createHash, randomUUID } from "node:crypto";
import { CHUNK_BYTES } from "../../dist/arena-chunks.js";
export function chunkEnvelope(value, serverId = value.serverId ?? "main") {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  const total = Math.ceil(bytes.length / CHUNK_BYTES), uploadId = randomUUID();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return Array.from({ length: total }, (_, index) => ({ serverId, uploadId, index, total, bytes: bytes.length, sha256,
    data: bytes.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES).toString("base64") }));
}
