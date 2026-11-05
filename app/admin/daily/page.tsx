"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import s from "./daily.module.css";
type Reward = { label: string; items: { item: string; count: number }[]; cobbleCoins: number; experiencePoints: number; stars: number };
type Data = { month: string; revision: number; publishedRevision: number | null; content: { days: Reward[] }; published: { days: Reward[] } | null; canWrite: boolean; items: { id: string; label: string }[]; claims: { id: string; uuid: string; day: number; claim_date: string; status: string; message: string | null }[]; stats: { status: string; total: number }[] };
const empty = (): Reward => ({ label: "", items: [], cobbleCoins: 0, experiencePoints: 0, stars: 0 });
const ready = (r: Reward) => r.items.length > 0 || r.cobbleCoins > 0 || r.experiencePoints > 0 || r.stars > 0;
const monthLabel = (m: string) => new Date(m + "-01T12:00:00Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" });
const statusLabel: Record<string, string> = { reserved: "À récupérer", dispatched: "Livraison à confirmer", delivered: "Reçue", review: "À vérifier" };
async function api(path: string, init?: RequestInit) {
  const r = await fetch("/api/admin/daily/" + path, { ...init, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json" } });
  const body = await r.json(); if (!r.ok) throw new Error(body.message || "Le calendrier est indisponible."); return body;
}
export default function DailyAdmin() {
  const [month, setMonth] = useState(""), [data, setData] = useState<Data | null>(null), [days, setDays] = useState<Reward[]>([]);
  const [selected, select] = useState(0), [busy, setBusy] = useState(true), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [copyMonth, setCopyMonth] = useState(""), [confirm, setConfirm] = useState(false), [preview, setPreview] = useState(false);
  const editorRef = useRef<HTMLElement>(null), calendarRef = useRef<HTMLElement>(null);
  const reveal = (element: HTMLElement | null) => {
    if (window.matchMedia("(max-width: 1000px)").matches) element?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  const dirty = !!data && JSON.stringify(days) !== JSON.stringify(data.content.days);
  useEffect(() => {
    // Read the live date after hydration; never freeze the month into the static export.
    const timer = setTimeout(() => setMonth(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).format(new Date())), 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    api(month).then((d: Data) => { if (!cancelled) { setData(d); setDays(d.content.days); } }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [month]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const changeMonth = (value: string) => {
    if (value !== month && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value) && (!dirty || window.confirm("Quitter ce mois sans enregistrer les modifications ?"))) {
      setBusy(true); setData(null); setError(""); setMessage(""); setConfirm(false); select(0); setMonth(value);
    }
  };
  const edit = (r: Reward) => { setDays(a => a.map((v, i) => i === selected ? r : v)); setMessage(""); setConfirm(false); };
  async function save() {
    if (!data) return; setBusy(true); setError("");
    try { const result = await api(month, { method: "PUT", body: JSON.stringify({ revision: data.revision, content: { days } }) }); setData({ ...data, revision: result.revision, content: { days } }); setMessage("Brouillon enregistré."); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function publish() {
    if (!data || dirty) return; setBusy(true); setError("");
    try { await api(month + "/publish", { method: "POST", body: JSON.stringify({ revision: data.revision }) }); const d = await api(month); setData(d); setDays(d.content.days); setMessage("Le calendrier est activé. Il sera disponible en jeu pendant ce mois."); setConfirm(false); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function copy() {
    if (!copyMonth || copyMonth === month) return; setBusy(true); setError("");
    try { const source: Data = await api(copyMonth); const values = source.published?.days ?? source.content.days; setDays(days.map((_, i) => values[i] ? structuredClone(values[i]) : empty())); setMessage("Mois copié dans le brouillon. Complète les jours supplémentaires, puis enregistre."); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const reward = days[selected], configured = days.filter(ready).length;
  const summary = (r: Reward) => [r.cobbleCoins ? r.cobbleCoins.toLocaleString("fr-FR") + " CobbleCoins" : "", r.stars ? r.stars + " Stars" : "", r.experiencePoints ? r.experiencePoints + " XP" : "", ...r.items.map(i => i.count + " × " + (data?.items.find(a => a.id === i.item)?.label ?? i.item))].filter(Boolean);
  const canEdit = !!data?.canWrite && !busy && !data.claims.length;
  return <main className={s.page} id="contenu">
    <header className={s.header}><Link href="/admin/">← Centre de contrôle</Link><img src="/astral/assets/logo-cercle-5.png" width="48" height="48" alt="CobbleStar"/><span>Récompenses de connexion</span></header>
    <section className={s.heading}><div><span className={s.eyebrow}>CALENDRIER MENSUEL · /DAILY</span><h1>Une connexion.<br/><em>Une Poké Ball à ouvrir.</em></h1><p>Une récompense par jour, dans l’ordre. Les jours manqués ne font pas avancer la collection. Tout repart au jour 1 le mois suivant.</p></div><div className={s.month}><label htmlFor="daily-month">Mois à préparer</label><input id="daily-month" type="month" min="2026-01" max="2099-12" value={month} onChange={e => changeMonth(e.target.value)} disabled={busy}/><span>Minuit · Europe/Paris</span></div></section>
    {error && <p className={s.error} role="alert">{error}</p>}
    {message && <p className={s.success} role="status">{message}</p>}
    {!data ? <p role="status">{busy ? "Chargement du calendrier…" : "Le calendrier n’a pas pu être chargé."}</p> : <>
      <div className={s.toolbar}><b>{configured} / {days.length} jours préparés</b><span>{data.published ? "Mois activé" : "Brouillon"}{dirty ? " · modifications non enregistrées" : ""}</span><button onClick={() => setPreview(!preview)}>{preview ? "Modifier les récompenses" : "Voir les récompenses"}</button></div>
      <div className={s.workbench}>
        <section ref={calendarRef} className={s.calendar} aria-label="Jours de connexion"><header><h2>{monthLabel(month)}</h2><span>{days.length} récompenses</span></header>
          <div className={s.grid}>{days.map((r, i) => <button key={i} aria-pressed={selected === i} aria-label={"Jour " + (i + 1) + " : " + (r.label || summary(r).join(", ") || "À configurer")} className={[s.day, selected === i ? s.selected : "", ready(r) ? s.configured : ""].join(" ")} onClick={() => { select(i); reveal(editorRef.current); }}>
            <span>JOUR {String(i + 1).padStart(2, "0")}</span><img src="/daily/poke-ball.png" alt="" width="48" height="48"/><b>{r.label || (ready(r) ? "Prêt" : "À remplir")}</b>
          </button>)}</div>
        </section>
        <aside ref={editorRef} className={s.editor}>
          <button className={s.backToDays} onClick={() => reveal(calendarRef.current)}>← Tous les jours</button>
          <div className={s.rewardHead}><img src="/daily/poke-ball.png" alt="" width="64" height="64"/><div><span>JOUR {selected + 1}</span><h2>{reward?.label || "Ta récompense"}</h2></div></div>
          {preview ? <><ul className={s.loot}>{reward && summary(reward).map(v => <li key={v}>{v}</li>)}</ul>{reward && !ready(reward) && <p>Aucune récompense configurée.</p>}<p className={s.note}>Aperçu uniquement. Ce panneau ne distribue aucune récompense.</p></> : reward && <fieldset disabled={!canEdit} className={s.fields}>
            <label>Nom de la récompense<input maxLength={60} value={reward.label} placeholder="Ex. Le plein de Poké Balls" onChange={e => edit({ ...reward, label: e.target.value })}/></label>
            <div className={s.numbers}>{(["cobbleCoins", "experiencePoints", "stars"] as const).map(key => <label key={key}>{({ cobbleCoins: "CobbleCoins", experiencePoints: "XP Minecraft", stars: "Stars" })[key]}<input type="number" min="0" max={key === "cobbleCoins" ? 1000000 : 100000} value={reward[key]} onChange={e => edit({ ...reward, [key]: Math.max(0, Math.min(key === "cobbleCoins" ? 1000000 : 100000, Math.trunc(Number(e.target.value) || 0))) })}/></label>)}</div>
            <h3>Objets du serveur</h3>{!data.items.length && <p>Le catalogue apparaîtra après la première connexion du mod à l’API.</p>}
            {reward.items.map((item, i) => <div key={i} className={s.item}><label>Objet {i + 1}<input list="daily-items" value={item.item} onChange={e => edit({ ...reward, items: reward.items.map((v, j) => j === i ? { ...v, item: e.target.value } : v) })}/></label><label>Quantité<input type="number" min="1" max="64" value={item.count} onChange={e => edit({ ...reward, items: reward.items.map((v, j) => j === i ? { ...v, count: Math.max(1, Math.min(64, Math.trunc(Number(e.target.value) || 1))) } : v) })}/></label><button aria-label={"Retirer l’objet " + (i + 1)} onClick={() => edit({ ...reward, items: reward.items.filter((_, j) => i !== j) })}>×</button></div>)}
            <datalist id="daily-items">{data.items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</datalist>
            <button disabled={reward.items.length >= 8 || !data.items.length} onClick={() => edit({ ...reward, items: [...reward.items, { item: data.items.find(i => i.id === "cobblemon:poke_ball")?.id ?? data.items[0].id, count: 1 }] })}>Ajouter un objet</button>
            <p className={s.note}>Les jetons, boosters et objets personnalisés sont disponibles dans ce même catalogue. Pour les Stars, le joueur devra avoir lié son compte Minecraft.</p>
            <button disabled={selected === days.length - 1} onClick={() => { setDays(a => a.map((v, i) => i === selected + 1 ? structuredClone(reward) : v)); select(selected + 1); }}>Copier vers le jour suivant</button>
          </fieldset>}
          {data.claims.length > 0 && <p className={s.note}>Les premières récompenses ont été récupérées : ce mois est verrouillé. Prépare le prochain mois ou copie ce calendrier.</p>}
        </aside>
      </div>
      <section className={s.actions}><div><label>Reprendre un autre mois<input type="month" value={copyMonth} onChange={e => setCopyMonth(e.target.value)} disabled={!canEdit}/></label><button onClick={copy} disabled={!canEdit || !copyMonth || copyMonth === month}>Copier dans le brouillon</button></div><div><button disabled={!canEdit || !dirty} onClick={save}>Enregistrer le brouillon</button><button className={s.primary} disabled={!data.canWrite || busy || dirty || configured !== days.length || data.claims.length > 0} onClick={() => setConfirm(true)}>Activer ce mois</button></div></section>
      {confirm && <section className={s.confirm} role="region" aria-label="Confirmer l’activation"><h2>Activer {monthLabel(month)} ?</h2><p>{days.length} récompenses seront proposées dans /daily pendant ce mois. Le calendrier sera verrouillé à la première récupération.</p><button onClick={() => setConfirm(false)}>Revenir au calendrier</button><button className={s.primary} onClick={publish} disabled={busy}>Confirmer l’activation</button></section>}
      <section className={s.history}><h2>Dernières récupérations</h2><p>Les livraisons à vérifier ne sont jamais relancées automatiquement, pour éviter de donner deux fois les objets.</p>{!data.claims.length ? <p>Aucune récompense récupérée pour ce mois.</p> : <div className={s.table}><table><thead><tr><th>Joueur</th><th>Jour</th><th>Date</th><th>État</th><th>Détail</th></tr></thead><tbody>{data.claims.map(c => <tr key={c.id}><td><Link href={"/admin/joueurs/?uuid=" + c.uuid}>{c.uuid.slice(0, 8)}…</Link></td><td>{c.day}</td><td>{c.claim_date}</td><td>{statusLabel[c.status] ?? c.status}</td><td>{c.message || "—"}</td></tr>)}</tbody></table></div>}</section>
    </>}
  </main>;
}
