"use client";

import { captainSignaturePatch, labelFor, signaturePokemon, type ArenaStage, type Catalog } from "./model";
import { TeamPortrait } from "./TeamEditor";
import s from "./arenas.module.css";

export function CaptainSignature({ stage, catalog, onChange }: { stage: ArenaStage; catalog: Catalog | null; onChange: (patch: Partial<ArenaStage>) => void }) {
  if (stage.league) return null;
  const principal = signaturePokemon(stage);
  return <section className={s.signature} aria-label="Pokémon principal du Capitaine">
    <div className={s.sectionHeading}><div><span className={s.eyebrow}>ÉPREUVES V3 · LIEN DU TOTEM</span><h3>Son Pokémon emblématique.</h3><p>Choisis explicitement le membre qui devient le Totem du parcours V3. Aucun choix automatique.</p></div>{principal && <div className={s.signaturePortrait}><TeamPortrait pokemon={principal} catalog={catalog}/></div>}</div>
    <label>Pokémon principal du Capitaine<select value={principal ? String(stage.team.indexOf(principal)) : ""} onChange={e => onChange(captainSignaturePatch(stage, e.target.value === "" ? -1 : Number(e.target.value)))}><option value="">À choisir dans l’équipe</option>{stage.team.map((p, i) => <option key={p.memberId ?? i} value={i}>{i + 1}. {labelFor(catalog?.species, p.species)} · niveau {p.level}{p.aspects.length ? ` · ${p.aspects.join(", ")}` : ""}</option>)}</select></label>
    <p className={s.hint} role="status">{principal ? `Totem V3 lié à ${labelFor(catalog?.species, principal.species)} : même forme, niveau, attaques et statistiques, sans bonus caché.` : "Aucun Pokémon principal sélectionné. Le parcours V3 refusera de démarrer tant que ce lien n’est pas préparé."}</p>
    <small>Déplacer ce membre dans l’équipe conserve le lien. Le retirer ou importer un nouveau Poképaste demande un nouveau choix. Une seule équipe définit cette rencontre.</small>
  </section>;
}
