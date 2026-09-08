"use client";

import { useState } from "react";
import PokemonPortrait from "../joueurs/PokemonPortrait";
import type { Pokemon } from "../joueurs/PokemonWorkspace";
import { allStats, labelFor, newPokemon, normalized, STATS, total, type Catalog, type PokemonSpec } from "./model";
import { ChoiceField, NumberField } from "./Fields";
import s from "./arenas.module.css";

function formFor(p: PokemonSpec, catalog: Catalog | null) {
  return catalog?.species.find(c => normalized(c.id) === normalized(p.species))?.forms?.find(f => [...f.aspects].sort().join("|") === [...p.aspects].sort().join("|"));
}
export function TeamPortrait({ pokemon: p, catalog, compact = true }: { pokemon: PokemonSpec; catalog: Catalog | null; compact?: boolean }) {
  const form = formFor(p, catalog);
  const model: Pokemon = { uuid: "arena-preview", species: p.species.includes(":") ? p.species : `cobblemon:${p.species}`, name: labelFor(catalog?.species, p.species), level: p.level, shiny: p.shiny, storage: "party", data: {}, editor: { fingerprint: "", values: { gender: p.gender.toUpperCase() }, stats: {}, effectiveIvs: {}, maxHealth: 1, types: [], dexNumber: 0, form: form?.id || (p.aspects.length ? p.aspects.join("-") : "normal") } };
  return <PokemonPortrait pokemon={model} compact={compact}/>;
}
export function TeamEditor({ team, catalog, level, onChange }: { team: PokemonSpec[]; catalog: Catalog | null; level: number; onChange: (team: PokemonSpec[]) => void }) {
  const [selected, setSelected] = useState(0);
  const active = Math.max(0, Math.min(selected, team.length - 1)), p = team[active];
  const patch = (value: Partial<PokemonSpec>) => onChange(team.map((entry, i) => i === active ? { ...entry, ...value } : entry));
  const forms = p ? catalog?.species.find(c => normalized(c.id) === normalized(p.species))?.forms : undefined;
  const currentForm = p ? formFor(p, catalog) : undefined;
  const evTotal = p ? total(p.evs) : 0;
  return <section className={s.teamEditor}>
    <div className={s.sectionHeading}><div><h3>Une équipe, une identité.</h3><p>De 1 à 6 Pokémon. Clique sur un membre pour préparer son combat.</p></div><span className={s.pill}>{team.length} / 6</span></div>
    <div className={s.roster} aria-label="Équipe du dresseur">{team.map((entry, i) => <button key={i} type="button" aria-pressed={active === i} onClick={() => setSelected(i)}><TeamPortrait pokemon={entry} catalog={catalog}/><span><b>{labelFor(catalog?.species, entry.species)}</b><small>Niv. {entry.level}{entry.shiny && " · Shiny"}</small></span><span className={s.teamIndex}>{i + 1}</span></button>)}
      {team.length < 6 && <button type="button" className={s.addPokemon} disabled={!catalog?.species.length} onClick={() => { setSelected(team.length); onChange([...team, newPokemon(catalog!.species[0].id, level)]); }}><span>＋</span>Ajouter un Pokémon</button>}
    </div>
    {!catalog && <p className={s.notice}>Le catalogue doit être synchronisé par le serveur pour choisir ses Pokémon, talents et objets.</p>}
    {p && <div className={s.pokemonEditor}>
      <header className={s.pokemonHeading}><div className={s.largePortrait}><TeamPortrait pokemon={p} catalog={catalog} compact={false}/></div><div><small>MEMBRE {active + 1} · {p.shiny ? "CHROMATIQUE" : "ÉQUIPE"}</small><h3>{labelFor(catalog?.species, p.species)}</h3><p>Niveau {p.level} · {p.moves.length ? `${p.moves.length} attaque(s) choisie(s)` : "Attaques automatiques"}</p><small>Illustration Pokémon ; modèle et animations rendus par Cobblemon en jeu.</small></div></header>
      {p.legacyProperties && <p className={s.notice}>Ce Pokémon conserve des réglages historiques du serveur. Les champs ci-dessous les remplacent lorsqu’ils sont définis ; les autres réglages restent conservés.</p>}
      <div className={s.grid}>
        <ChoiceField label="Espèce du Pokémon" choices={catalog?.species} value={p.species} onChange={species => patch({ species, aspects: [], ability: "", moves: [], legacyProperties: undefined })}/>
        <NumberField label="Niveau du Pokémon" min={1} max={100} value={p.level} onChange={level => patch({ level })}/>
        <ChoiceField label="Nature" choices={catalog?.natures} value={p.nature} optional empty="Automatique" onChange={nature => patch({ nature })}/>
        <ChoiceField label="Talent" choices={catalog?.abilities} value={p.ability} optional empty="Talent naturel du Pokémon" onChange={ability => patch({ ability })}/>
        <ChoiceField label="Objet tenu" choices={catalog?.items} value={p.heldItem} optional empty="Aucun objet" onChange={heldItem => patch({ heldItem })}/>
        <label>Sexe<select aria-label="Sexe" value={p.gender} onChange={e => patch({ gender: e.target.value as PokemonSpec["gender"] })}><option value="random">Aléatoire</option><option value="male">Mâle</option><option value="female">Femelle</option><option value="genderless">Asexué</option></select></label>
        {forms?.length ? <label>Forme<select aria-label="Forme" value={currentForm?.id ?? "__observed"} onChange={e => patch({ aspects: forms.find(f => f.id === e.target.value)?.aspects ?? [], legacyProperties: undefined })}>{!currentForm && <option value="__observed">Forme observée sur le serveur</option>}{forms.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label> : <div className={s.hint}><b>Forme conservée</b><small>{p.aspects.length ? "La forme enregistrée sera conservée. Le serveur ne propose pas encore de catalogue des formes pour cette espèce." : "Forme normale. Les variantes apparaîtront ici si le serveur les propose."}</small></div>}
        <label className={s.checkbox}><input type="checkbox" checked={p.shiny} onChange={e => patch({ shiny: e.target.checked })}/>Pokémon chromatique (shiny)</label>
      </div>
      <section className={s.subsection}><h4>Attaques</h4><p>Laisse les quatre emplacements vides pour les attaques automatiques du serveur. Une sélection personnalisée peut contenir de 1 à 4 attaques.</p><div className={s.grid}>{Array.from({ length: 4 }, (_, i) => <ChoiceField key={i} label={`Attaque ${i + 1}`} choices={catalog?.moves.filter(m => !p.moves.includes(m.id) || p.moves[i] === m.id)} value={p.moves[i] ?? ""} optional empty="Aucune · automatique si tout est vide" onChange={move => { const moves = [...p.moves]; moves[i] = move; patch({ moves: moves.filter(Boolean) }); }}/>)}</div></section>
      <section className={s.subsection}><div className={s.sectionHeading}><div><h4>Potentiel & entraînement</h4><p>IV : potentiel de base. EV : répartition de l’entraînement.</p></div><div className={s.inlineActions}><button type="button" onClick={() => patch({ ivs: allStats(31) })}>IV à 31</button><button type="button" onClick={() => patch({ evs: allStats(0) })}>Réinitialiser les EV</button></div></div>
        <div className={s.evBudget}><span>Budget EV <b>{evTotal} / 510</b></span><progress max={510} value={Math.min(510, evTotal)} aria-label="Budget EV utilisé"/>{evTotal > 510 && <small role="alert">Retire {evTotal - 510} EV avant d’enregistrer.</small>}</div>
        <div className={s.statGrid}>{STATS.map(([key, label]) => <div key={key}><b>{label}</b><NumberField label={`IV · ${label}`} max={31} value={p.ivs[key]} onChange={value => patch({ ivs: { ...p.ivs, [key]: value } })}/><NumberField label={`EV · ${label}`} max={252} value={p.evs[key]} onChange={value => patch({ evs: { ...p.evs, [key]: value } })}/></div>)}</div>
      </section>
      <footer className={s.inlineActions}><button type="button" disabled={active === 0} onClick={() => { const next = [...team]; [next[active - 1], next[active]] = [next[active], next[active - 1]]; onChange(next); setSelected(active - 1); }}>← Avant</button><button type="button" disabled={active === team.length - 1} onClick={() => { const next = [...team]; [next[active + 1], next[active]] = [next[active], next[active + 1]]; onChange(next); setSelected(active + 1); }}>Après →</button><button type="button" disabled={team.length >= 6} onClick={() => { onChange([...team, structuredClone(p)]); setSelected(team.length); }}>Dupliquer ce Pokémon</button><button type="button" className={s.danger} disabled={team.length <= 1} onClick={() => { onChange(team.filter((_, i) => i !== active)); setSelected(Math.max(0, active - 1)); }}>Retirer ce Pokémon</button></footer>
    </div>}
  </section>;
}
