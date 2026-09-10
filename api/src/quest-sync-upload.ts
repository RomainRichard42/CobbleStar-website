import { createHash } from 'node:crypto';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import { z } from 'zod';

const unzip = promisify(gunzip);
const maxInflated = 16 * 1024 * 1024;
const maxCompressed = 17 * 1024 * 1024;
const memoryBudget = 32 * 1024 * 1024;
const chunkSchema = z.object({
  serverId: z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/),
  uploadId: z.string().uuid(), digest: z.string().regex(/^[a-f0-9]{64}$/),
  index: z.number().int().min(0).max(383), count: z.number().int().min(1).max(384),
  data: z.string().min(4).max(65536).regex(/^[A-Za-z0-9+/]+={0,2}$/),
}).strict().refine(v => v.index < v.count);
type Pending = { count: number; digest: string; expires: number; size: number; parts: Map<number, Buffer> };
const fail = (code: string, statusCode = 400): never => { throw Object.assign(new Error(code), { statusCode }); };

/** Per application instance. No database updates until verified, complete JSON. */
export function createQuestUploadReceiver(clock = Date.now) {
  const pending = new Map<string, Pending>();
  let total = 0, decoding = 0;
  function remove(key: string) { const entry = pending.get(key); if (entry) total -= entry.size; pending.delete(key); }
  return async (value: unknown): Promise<{ complete: false; uploadId: string; index: number; accepted: true } | { complete: true; body: unknown }> => {
    for (const [key, entry] of pending) if (entry.expires <= clock()) remove(key);
    const parsed = chunkSchema.safeParse(value);
    if (!parsed.success) return fail('INVALID_QUEST_CHUNK');
    const chunk = parsed.data, key = `${chunk.serverId}/${chunk.uploadId}`;
    const bytes = Buffer.from(chunk.data, 'base64');
    if (bytes.toString('base64') !== chunk.data) return fail('INVALID_QUEST_CHUNK');
    let entry = pending.get(key);
    if (!entry) {
      if (pending.size >= 64) return fail('QUEST_UPLOAD_BUSY', 503);
      entry = { count: chunk.count, digest: chunk.digest, expires: clock() + 120000, size: 0, parts: new Map() };
      pending.set(key, entry);
    }
    if (entry.count !== chunk.count || entry.digest !== chunk.digest) { remove(key); return fail('QUEST_UPLOAD_CONFLICT', 409); }
    const previous = entry.parts.get(chunk.index);
    if (previous && !previous.equals(bytes)) { remove(key); return fail('QUEST_UPLOAD_CONFLICT', 409); }
    if (!previous) {
      if (entry.size + bytes.length > maxCompressed) { remove(key); return fail('QUEST_UPLOAD_TOO_LARGE', 413); }
      if (total + bytes.length > memoryBudget) return fail('QUEST_UPLOAD_BUSY', 503);
      entry.parts.set(chunk.index, bytes); entry.size += bytes.length; total += bytes.length;
    }
    if (entry.parts.size !== entry.count) return { complete: false, uploadId: chunk.uploadId, index: chunk.index, accepted: true };
    if (decoding >= 2) return fail('QUEST_UPLOAD_BUSY', 503);
    const compressed = Buffer.concat(Array.from({ length: entry.count }, (_, i) => entry.parts.get(i)!));
    remove(key);
    if (createHash('sha256').update(compressed).digest('hex') !== chunk.digest) return fail('QUEST_UPLOAD_CHECKSUM');
    decoding++;
    try {
      const expanded = await unzip(compressed, { maxOutputLength: maxInflated });
      const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(expanded));
      if (body?.serverId !== chunk.serverId) return fail('QUEST_UPLOAD_SERVER_MISMATCH');
      return { complete: true, body };
    } catch { return fail('INVALID_QUEST_COMPRESSED_PAYLOAD'); }
    finally { decoding--; }
  };
}
