"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { labelFor, STATS, total, type Catalog, type PokemonSpec } from "./model";
import s from "./arenas.module.css";

type Issue = { slot: number; line: number; message: string };
type Preview = { team: PokemonSpec[]; errors: Issue[]; warnings: Issue[]; notes: string[]; source: "text" | "pokepaste" };
export function TeamImport({ serverId, catalog, team, limit, onChange, portrait }: { serverId: string; catalog: Catalog | null; team: PokemonSpec[]; limit: number; onChange: (team: PokemonSpec[]) => void; portrait: (p: PokemonSpec) => ReactNode }) {
  const id = useId(), [open, setOpen] = useState(false), [source, setSource] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null), [acknowledged, setAcknowledged] = useState(false), [baseTeam, setBaseTeam] = useState("");
  const controller = useRef<AbortController | null>(null), button = useRef<HTMLButtonElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const changed = !!preview && baseTeam !== JSON.stringify(team);
  async function analyze() {
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setBusy(true); setError(""); setPreview(null); setAcknowledged(false); setMessage(""); setBaseTeam(JSON.stringify(team));
    try {
      const response = await fetch(`/api/admin/arenas/${encodeURIComponent(serverId)}/import-team`, { method: "POST", credentials: "include", cache: "no-store", signal: request.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Import indisponible. Vérifie ta session admin et la synchronisation du serveur.");
      if (request.signal.aborted || controller.current !== request) return;
      setPreview(data as Preview);
    } catch (e) { if (!request.signal.aborted) setError(e instanceof Error ? e.message : "Impossible d’analyser cette équipe."); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  function cancel() { controller.current?.abort(); setBusy(false); setOpen(false); setPreview(null); setError(""); button.current?.focus(); }
  function apply() {
    if (!preview || changed || preview.errors.length || !preview.team.length || preview.team.length > limit || (preview.warnings.length && !acknowledged)) return;
    onChange(structuredClone(preview.team)); setOpen(false); setPreview(null); setSource(""); setMessage(`Équipe importée dans le brouillon : ${preview.team.length} Pokémon. Enregistre puis publie pour l’envoyer en jeu.`); button.current?.focus();
  }
  return <section className={s.importer} aria-label="Import Poképaste">
    <div className={s.importHeading}><div><b>Ton équipe est déjà sur Poképaste ?</b><p>Un lien ou un export Showdown, puis une vérification avant de remplacer l’équipe.</p></div><button ref={button} type="button" disabled={!catalog} aria-expanded={open} aria-controls={id} onClick={() => open ? cancel() : setOpen(true)}>Importer un Poképaste</button></div>
    {message && <p className={s.notice} role="status">{message}</p>}
    {open && <div id={id} className={s.importBody}>
      <label>Lien Poképaste ou texte Showdown<textarea autoFocus rows={7} maxLength={65536} value={source} disabled={busy} onChange={e => { setSource(e.target.value); setPreview(null); setAcknowledged(false); setError(""); }} placeholder={"https://pokepast.es/…\n\nou colle l’export texte de ton équipe"}/></label>
      <p>De 1 à {limit} Pokémon. Les noms anglais de Showdown sont reconnus grâce aux identifiants du serveur. Le lien est lu depuis l’API ; rien n’est publié automatiquement.</p>
      <div className={s.inlineActions}><button type="button" className={s.primary} disabled={busy || !source.trim()} onClick={() => void analyze()}>{busy ? "Lecture et vérification…" : "Analyser l’équipe"}</button><button type="button" onClick={cancel}>Annuler l’import</button></div>
      {error && <p className={s.error} role="alert">{error}</p>}
      {preview && <div className={s.importPreview} aria-live="polite">
        <h4>Vérifie ton import</h4>
        {preview.notes.map(note => <p key={note}>{note}</p>)}
        {preview.errors.length > 0 && <section className={s.error} role="alert"><b>Import bloqué : corrige ces points dans la source.</b><ul>{preview.errors.map((item, i) => <li key={i}>{item.slot > 0 && `Pokémon ${item.slot} · `}{item.line > 0 && `ligne ${item.line} : `}{item.message}</li>)}</ul><p>L’équipe actuelle est intacte. Aucun Pokémon inconnu n’a été remplacé.</p></section>}
        {preview.team.length > limit && <p className={s.error} role="alert">Cet emplacement accepte {limit} Pokémon, pas {preview.team.length}. Corrige la source ; aucun membre ne sera supprimé automatiquement.</p>}
        <div className={s.importMembers}>{preview.team.map((p, i) => <article key={i}>
          <header>{portrait(p)}<div><b>{labelFor(catalog?.species, p.species)}</b><small>Niv. {p.level} · {p.shiny ? "Shiny" : "Normal"} · {({ random: "Sexe automatique", male: "Mâle", female: "Femelle", genderless: "Asexué" })[p.gender]}</small>{p.aspects.length > 0 && <small>Forme : {catalog?.species.find(c => c.id === p.species)?.forms?.find(f => [...f.aspects].sort().join(",") === [...p.aspects].sort().join(","))?.label ?? p.aspects.join(", ")}</small>}</div></header>
          <dl><div><dt>Talent</dt><dd>{labelFor(catalog?.abilities, p.ability) || "Automatique"}</dd></div><div><dt>Nature</dt><dd>{labelFor(catalog?.natures, p.nature) || "Automatique"}</dd></div><div><dt>Objet</dt><dd>{labelFor(catalog?.items, p.heldItem) || "Aucun"}</dd></div></dl>
          <p><b>Attaques</b><br/>{p.moves.map(m => labelFor(catalog?.moves, m)).join(" · ") || "Automatiques"}</p>
          <div className={s.importStats}><table><caption>IV & EV · {total(p.evs)} / 510 EV</caption><thead><tr><th scope="col">Stat.</th><th scope="col">IV</th><th scope="col">EV</th></tr></thead><tbody>{STATS.map(([key, label]) => <tr key={key}><th scope="row">{label}</th><td>{p.ivs[key]}</td><td>{p.evs[key]}</td></tr>)}</tbody></table></div>
        </article>)}</div>
        {preview.warnings.length > 0 && <section className={s.notice}><b>Différences à valider explicitement</b><ul>{preview.warnings.map((item, i) => <li key={i}>Pokémon {item.slot} · ligne {item.line} : {item.message}</li>)}</ul><label className={s.checkbox}><input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)}/>J’accepte ces différences et les réglages non transférés.</label></section>}
        {changed && <p className={s.error} role="alert">L’équipe a changé depuis l’analyse. Analyse à nouveau pour ne pas écraser tes dernières modifications.</p>}
        <button type="button" className={s.primary} disabled={busy || changed || !!preview.errors.length || !preview.team.length || preview.team.length > limit || (!!preview.warnings.length && !acknowledged)} onClick={apply}>Remplacer l’équipe du brouillon ({preview.team.length})</button>
      </div>}
    </div>}
  </section>;
}
