import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { PASTE_MAX_BYTES } from "./arena-pokepaste.js";

export class PasteDownloadError extends Error {}
export function pokepasteUrl(source: string): URL {
  // Fixed hostname, scheme and path. No credentials, ports, queries, fragments or percent escapes.
  const match = source.match(/^https:\/\/pokepast\.es\/([0-9a-f]{16})(?:\/raw|\/)?$/);
  if (!match) throw new PasteDownloadError("Lien accepté : https://pokepast.es/ suivi des 16 caractères de la publication. Sinon colle le texte de l’équipe.");
  return new URL(`https://pokepast.es/${match[1]}/raw`);
}
/** Only routable IPv4; pin the resolved address to prevent a second DNS lookup/rebinding. */
export function publicPasteAddress(address: string): boolean {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return false;
  const [a, b, c, d] = address.split(".").map(Number) as [number, number, number, number];
  if ([a, b, c, d].some(v => v > 255)) return false;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99)))
    || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))
    || (a === 203 && b === 0 && c === 113));
}

// Dependency injection is only for isolated transport tests, never exposed through the API.
export async function downloadPokepaste(source: string, dependencies = { lookup, request }, timeoutMs = 8000): Promise<string> {
  const url = pokepasteUrl(source), controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resolution = await Promise.race([
      dependencies.lookup("pokepast.es", { family: 4, all: true }),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("timeout")), { once: true })),
    ]);
    if (!resolution.length || resolution.some(r => !publicPasteAddress(r.address))) throw new PasteDownloadError("Adresse réseau de Poképaste non autorisée. Colle le texte de l’équipe.");
    if (controller.signal.aborted) throw new Error("timeout");
    const address = resolution[0]!.address;
    return await new Promise<string>((resolve, reject) => {
      const req = dependencies.request(url, {
        method: "GET", agent: false, family: 4, signal: controller.signal,
        lookup: (_host, _options, callback) => callback(null, address, 4),
        headers: { Accept: "text/plain", "Accept-Encoding": "identity", "User-Agent": "CobbleStar-Arena-Import/1.0" },
      }, res => {
        const fail = (message: string) => { reject(new PasteDownloadError(message)); res.destroy(); };
        if (res.statusCode !== 200) { fail(`Poképaste HTTP ${res.statusCode ?? "inconnu"}. Aucune redirection suivie ; colle le texte si le lien est indisponible.`); return; }
        if (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") { fail("Réponse compressée non acceptée. Colle le texte de l’équipe."); return; }
        if (Number(res.headers["content-length"] ?? 0) > PASTE_MAX_BYTES) { fail("Poképaste trop volumineux : 64 Kio maximum."); return; }
        const chunks: Buffer[] = []; let size = 0;
        res.on("data", (chunk: Buffer) => { size += chunk.length; if (size > PASTE_MAX_BYTES) fail("Poképaste trop volumineux : 64 Kio maximum."); else chunks.push(chunk); });
        res.on("error", reject);
        res.on("end", () => { try { resolve(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); } catch { reject(new PasteDownloadError("Le Poképaste doit être du texte UTF-8.")); } });
      });
      req.on("error", reject); req.end();
    });
  } catch (e) {
    if (e instanceof PasteDownloadError) throw e;
    // No raw network details or arbitrary remote response body in logs/client messages.
    throw new PasteDownloadError(controller.signal.aborted ? "Poképaste ne répond pas sous 8 secondes. Réessaie ou colle le texte de l’équipe." : "Impossible de lire Poképaste. Réessaie ou colle le texte de l’équipe.");
  } finally { clearTimeout(timer); }
}
