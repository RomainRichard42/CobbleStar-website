import { createHash } from "node:crypto";
import { z } from "zod";

export const CHUNK_BYTES = 128 * 1024;
export const MAX_SYNC_BYTES = 2 * 1024 * 1024;
export const CHUNK_BODY_LIMIT = 180 * 1024;
const TTL = 120_000;
const MAX_TRANSFERS = 8;
export const arenaChunk = z.object({
  serverId: z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/),
  uploadId: z.string().uuid(),
  index: z.number().int().min(0).max(15),
  total: z.number().int().min(1).max(16),
  bytes: z.number().int().min(1).max(MAX_SYNC_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  data: z.string().min(4).max(4 * Math.ceil(CHUNK_BYTES / 3)),
}).strict();
type Chunk = z.infer<typeof arenaChunk>;
type Transfer = { id: string; created: number; total: number; bytes: number; hash: string; parts: Map<number, Buffer> };
export class ChunkFailure extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

/** Temporary, authenticated transfers only. No database writes until the entire envelope validates.
 * Hard cap: eight transfers of <=2 MiB; fixed TTL, one upload per server. A process restart merely
 * makes the mod resend its snapshot; it never replays player actions or partial publications. */
export class ArenaChunks {
  private readonly transfers = new Map<string, Transfer>();
  constructor(private readonly now = Date.now) {}
  clear() { this.transfers.clear(); }
  accept(chunk: Chunk): unknown | null {
    const now = this.now();
    for (const [server, transfer] of this.transfers) if (now - transfer.created >= TTL) this.transfers.delete(server);
    if (chunk.total !== Math.ceil(chunk.bytes / CHUNK_BYTES) || chunk.index >= chunk.total)
      throw new ChunkFailure(400, "Métadonnées de transfert invalides.");
    const part = Buffer.from(chunk.data, "base64");
    const expected = Math.min(CHUNK_BYTES, chunk.bytes - chunk.index * CHUNK_BYTES);
    if (part.length !== expected || part.toString("base64") !== chunk.data)
      throw new ChunkFailure(400, "Taille ou encodage du fragment invalide.");
    let transfer = this.transfers.get(chunk.serverId);
    if (!transfer || transfer.id !== chunk.uploadId) {
      if (chunk.index !== 0) throw new ChunkFailure(409, "Transfert absent ou expiré : renvoyer depuis le premier fragment.");
      if (!transfer && this.transfers.size >= MAX_TRANSFERS) throw new ChunkFailure(429, "Trop de transferts simultanés.");
      transfer = { id: chunk.uploadId, created: now, total: chunk.total, bytes: chunk.bytes, hash: chunk.sha256, parts: new Map() };
      this.transfers.set(chunk.serverId, transfer);
    }
    if (transfer.total !== chunk.total || transfer.bytes !== chunk.bytes || transfer.hash !== chunk.sha256)
      throw new ChunkFailure(409, "Les métadonnées du transfert ont changé.");
    const previous = transfer.parts.get(chunk.index);
    if (previous && !previous.equals(part)) throw new ChunkFailure(409, "Un fragment reçu diffère du précédent.");
    transfer.parts.set(chunk.index, part);
    if (transfer.parts.size !== transfer.total) return null;
    this.transfers.delete(chunk.serverId);
    const bytes = Buffer.concat(Array.from({ length: transfer.total }, (_, i) => transfer!.parts.get(i)!));
    if (bytes.length !== transfer.bytes || createHash("sha256").update(bytes).digest("hex") !== transfer.hash)
      throw new ChunkFailure(400, "Empreinte du transfert invalide.");
    try {
      const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("Object required");
      return value;
    }
    catch { throw new ChunkFailure(400, "Le transfert complet n'est pas un JSON UTF-8 valide."); }
  }
}
