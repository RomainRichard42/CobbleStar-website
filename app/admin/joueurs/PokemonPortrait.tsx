"use client";

import { useEffect, useState } from "react";
import type { Pokemon } from "./PokemonWorkspace";
import s from "./pokemon.module.css";

type Art = { front_default?: string | null; front_shiny?: string | null; front_female?: string | null; front_shiny_female?: string | null };
type SpriteResponse = { sprites?: { other?: { "official-artwork"?: Art; home?: Art } } };
const cache = new Map<string, Promise<SpriteResponse | null>>();
const aliases: Record<string, string> = { mrmime: "mr-mime", mimejr: "mime-jr", mrrime: "mr-rime", nidoranf: "nidoran-f", nidoranm: "nidoran-m", typenull: "type-null", tapukoko: "tapu-koko", tapulele: "tapu-lele", tapubulu: "tapu-bulu", tapufini: "tapu-fini", greattusk: "great-tusk", screamtail: "scream-tail", brutebonnet: "brute-bonnet", fluttermane: "flutter-mane", slitherwing: "slither-wing", sandyshocks: "sandy-shocks", roaringmoon: "roaring-moon" };
const regions: Record<string, string> = { alolan: "alola", galarian: "galar", hisuian: "hisui", paldean: "paldea" };
function artworkKey(p: Pokemon): string | null {
  if (!p.species.startsWith("cobblemon:")) return null;
  const raw = p.species.slice(10), species = aliases[raw] ?? raw.replaceAll("_", "-");
  const form = p.editor?.form.toLowerCase().replaceAll("_", "-") ?? "normal";
  if (["normal", "standard", "default", ""].includes(form)) return p.editor?.dexNumber ? String(p.editor.dexNumber) : species;
  return `${species}-${regions[form] ?? form}`;
}
function load(key: string) {
  if (!cache.has(key)) cache.set(key, fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(key)}/`, { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(8000), cache: "force-cache" }).then(r => r.ok ? r.json() as Promise<SpriteResponse> : null).catch(() => { cache.delete(key); return null; }));
  return cache.get(key)!;
}
function Portrait({ pokemon: p, compact }: { pokemon: Pokemon; compact: boolean }) {
  const key = artworkKey(p);
  const [src, setSrc] = useState<string | null>(null), [finished, setFinished] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    if (key) void load(key).then(data => {
      if (!live) return;
      const art = data?.sprites?.other?.["official-artwork"], home = data?.sprites?.other?.home;
      const female = p.editor?.values.gender === "FEMALE";
      const candidate = (female ? (p.shiny ? home?.front_shiny_female : home?.front_female) : null) ?? (p.shiny ? art?.front_shiny : art?.front_default) ?? (p.shiny ? home?.front_shiny : home?.front_default);
      // No untrusted image host, no silent shiny-to-normal fallback.
      setSrc(candidate?.startsWith("https://raw.githubusercontent.com/PokeAPI/sprites/") ? candidate : null); setFinished(true);
    });
    return () => { live = false; };
  }, [key, p.shiny, p.editor?.values.gender]);
  return <span className={`${s.portrait} ${compact ? s.compactPortrait : ""}`}>
    {src && !failed ? <img src={src} alt={`${p.name}${p.shiny ? " chromatique" : ""} — illustration Pokémon`} width={compact ? 64 : 180} height={compact ? 64 : 180} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)}/> : <span aria-label="Illustration indisponible">{!key || finished || failed ? compact ? "—" : "Visuel indisponible pour cette forme" : compact ? "…" : "Chargement du visuel…"}</span>}
  </span>;
}
export default function PokemonPortrait(props: { pokemon: Pokemon; compact?: boolean }) {
  return <Portrait key={`${props.pokemon.species}:${props.pokemon.editor?.form}:${props.pokemon.shiny}:${props.pokemon.editor?.values.gender}`} pokemon={props.pokemon} compact={props.compact ?? false}/>;
}
