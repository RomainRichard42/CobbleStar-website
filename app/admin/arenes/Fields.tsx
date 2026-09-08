"use client";

import { useId, useState } from "react";
import { normalized, type Choice } from "./model";
import s from "./arenas.module.css";

/** Search reduces the real server catalogue; selection never introduces an arbitrary identifier. */
export function ChoiceField({ label, value, choices = [], onChange, empty = "Choisir…", optional = false }: { label: string; value: string; choices?: Choice[]; onChange: (id: string) => void; empty?: string; optional?: boolean }) {
  const id = useId(), [query, setQuery] = useState("");
  const results = choices.filter(c => `${c.label} ${c.id}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")));
  const current = choices.find(c => normalized(c.id) === normalized(value));
  return <div className={s.picker}><label htmlFor={id}>{label}</label>
    {choices.length > 10 && <input type="search" aria-label={`Rechercher : ${label}`} placeholder="Rechercher dans le serveur…" value={query} onChange={e => setQuery(e.target.value)}/>}
    <select id={id} value={current?.id ?? value} onChange={e => onChange(e.target.value)}>
      <option value="" disabled={!optional}>{empty}</option>
      {value && !current && <option value={value}>{value} · indisponible dans le catalogue</option>}
      {current && !results.some(c => c.id === current.id) && <option value={current.id}>{current.label} · sélection actuelle</option>}
      {results.slice(0, 200).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      {current && results.findIndex(c => c.id === current.id) >= 200 && <option value={current.id}>{current.label} · sélection actuelle</option>}
    </select>{results.length > 200 && <small>200 résultats affichés sur {results.length}. Affine la recherche.</small>}
    {query && !results.length && <small>Aucun résultat pour cette recherche.</small>}
  </div>;
}
export function NumberField({ label, value, onChange, min = 0, max, ...props }: { label: string; value: number; onChange: (n: number) => void; min?: number; max: number; disabled?: boolean }) {
  return <label>{label}<input type="number" inputMode="numeric" min={min} max={max} step={1} value={value} onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))} {...props}/></label>;
}
