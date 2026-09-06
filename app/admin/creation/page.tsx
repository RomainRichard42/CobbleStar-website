"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { StudioContent, StudioQuest, StudioNpc } from "../../../api/src/quest-studio-schema";
import s from "./studio.module.css";
import { StoryEditor } from "./StoryEditor";
import { CharacterEditor } from "./CharacterEditor";
import type { StoryCatalog } from "../../../api/src/quest-events";

type State = { catalog: StoryCatalog | null; content: StudioContent; observed: StudioContent | null; draftRevision: number; publishedRevision: number; appliedRevision: number;
  lastSeenAt: string | null; error: string; canWrite: boolean; placements: { key: string; name: string; templateId: string }[];
  history: { revision: number; actor: string; reason: string; createdAt: string }[] };
type Server = { serverId: string };
type Tab = "quests" | "npcs" | "chapters";
const empty = (): StudioContent => ({ questConfig: { resetHour: 6, quests: [], chapters: [] }, npcs: [] });
const optionLabels: Record<string, string> = { DIALOGUE_ONLY: 'Dialogue uniquement', DIALOGUE_QUEST: 'Dialogue et quêtes', TURN_IN: 'Remise de quêtes', DAYCARE: 'Pension', RANKED: 'Combats classés', SHOP: 'Marchand', STORY: 'Histoire principale', SIDE: 'Aventure secondaire', MERCHANT: 'Marchand', EVENT: 'Événement', NONE: 'Sans couleur', ROLE: 'Selon le rôle', CYAN: 'Cyan', PINK: 'Rose', GOLD: 'Or', GREEN: 'Vert', VIOLET: 'Violet', FACILE: 'Facile', NORMAL: 'Normal', DIFFICILE: 'Difficile', EXPERT: 'Expert', PREVIOUS: 'Après le chapitre précédent', IMMEDIATE: 'Disponible immédiatement', MANUAL: 'Déblocage manuel' };
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
const newQuest = (): StudioQuest => ({ id: makeId("quete"), title: "Nouvelle quête", description: "", category: "AVENTURE", chapterId: "", chapterTitle: "Aventure", kind: "SIDE", sequential: true, difficulty: "NORMAL", icon: "minecraft:book", accent: "#9B8CFF", order: 1, autoStart: false, requires: [], objectives: [{ source: "cobblemon_capture", label: "Capturer un Pokémon", target: 1, unique: false, optional: false, alternativeGroup: "", filters: {} }], rewards: [] });
const newNpc = (): StudioNpc => ({ id: makeId("pnj"), name: "Nouveau personnage", enabled: true, role: "DIALOGUE_QUEST", dialogue: "Bienvenue, Dresseur !", questIds: [], permission: 0, repeatableDialogue: true, skin: "", nameColor: "ROLE", visualRole: "STORY", shopOffers: "", dialogueGraph: { start: "accueil", nodes: [{ id: "accueil", title: "Accueil", text: "Bienvenue, Dresseur !", canvasX: 24, canvasY: 42, choices: [] }] } });
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || ({ AUTH_REQUIRED: "Connecte-toi avec Discord.", GAME_ADMIN_REQUIRED: "Accès réservé aux administrateurs du jeu.", DRAFT_CONFLICT: "Brouillon modifié ailleurs : recharge avant d'enregistrer.", INVALID_INPUT: "Publication invalide : vérifie les identifiants, les branches et les récompenses." } as Record<string, string>)[body.error] || "API indisponible");
  return body as T;
}

export default function CreationStudio() {
  const [servers, setServers] = useState<Server[]>([]), [server, setServer] = useState("");
  const [state, setState] = useState<State | null>(null), [content, setContent] = useState<StudioContent>(empty);
  const [tab, setTab] = useState<Tab>("quests"), [selected, setSelected] = useState(0), [query, setQuery] = useState("");
  const [message, setMessage] = useState("Chargement du studio…"), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const [reason, setReason] = useState(""), [publishOpen, setPublishOpen] = useState(false);
  const [now, setNow] = useState(0);
  const [undo, setUndo] = useState<StudioContent[]>([]), [redo, setRedo] = useState<StudioContent[]>([]);
  const load = useCallback(async (id: string) => {
    const result = await api<State>(`/api/admin/quests/${id}`); setNow(Date.now());
    setState(result); setContent(result.content); setDirty(false); setMessage(""); setSelected(0); setUndo([]); setRedo([]);
  }, []);
  useEffect(() => { let active = true;
    void api<{ servers: Server[] }>("/api/admin/quests").then(async r => {
      if (!active) return; setServers(r.servers);
      if (r.servers[0]) { setServer(r.servers[0].serverId); await load(r.servers[0].serverId); }
      else setMessage("Aucun serveur connecté au Studio. Installe le nouveau JAR et active la passerelle admin, puis actualise cette page.");
    }).catch(e => { if (active) setMessage(e.message); }); return () => { active = false; };
  }, [load]);
  useEffect(() => {
    if (!server) return;
    let active = true;
    const timer = window.setInterval(() => { setNow(Date.now()); void api<State>(`/api/admin/quests/${server}`).then(r => {
      if (active) setState(old => old ? { ...old, canWrite: r.canWrite, appliedRevision: r.appliedRevision, publishedRevision: r.publishedRevision, lastSeenAt: r.lastSeenAt, error: r.error, placements: r.placements, catalog: r.catalog } : old);
    }).catch(() => undefined); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [server]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!publishOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setPublishOpen(false);
      if (e.key !== "Tab") return;
      const elements = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] textarea, [role="dialog"] button:not(:disabled)'));
      const first = elements[0], last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keyboard); };
  }, [publishOpen, busy]);
  function commit(draft: StudioContent) { setUndo(values => [...values.slice(-19), content]); setRedo([]); setContent(draft); setDirty(true); }
  function edit(fn: (draft: StudioContent) => void) { const draft = structuredClone(content); fn(draft); commit(draft); }
  function patchQuest(patch: Partial<StudioQuest>) { edit(d => Object.assign(d.questConfig.quests[selected], patch)); }
  function patchNpc(patch: Partial<StudioNpc>) { edit(d => Object.assign(d.npcs[selected], patch)); }
  async function task(fn: () => Promise<void>) { setBusy(true); try { await fn(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }
  async function save() {
    const result = await api<{ draftRevision: number }>(`/api/admin/quests/${server}`, { method: "PUT", body: JSON.stringify({ baseRevision: state!.draftRevision, content }) });
    setState(old => old ? { ...old, draftRevision: result.draftRevision } : old); setDirty(false); setMessage("Brouillon enregistré. Rien n'a changé en jeu.");
  }
  const quest = tab === "quests" ? content.questConfig.quests[selected] : null;
  const npc = tab === "npcs" ? content.npcs[selected] : null;
  const chapter = tab === "chapters" ? content.questConfig.chapters[selected] : null;
  const entries = tab === "quests" ? content.questConfig.quests.map(q => ({ id: q.id, title: q.title, detail: q.kind === "STORY" ? "Histoire principale" : "Aventure secondaire" })) : tab === "npcs" ? content.npcs.map(n => ({ id: n.id, title: n.name, detail: n.enabled ? (optionLabels[n.role] ?? n.role) : "Synchro en pause" })) : content.questConfig.chapters.map(c => ({ id: c.id, title: c.title, detail: `${c.questIds.length} quêtes` }));
  const fresh = state?.lastSeenAt && now - new Date(state.lastSeenAt).getTime() < 60000;

  return <main className={s.page} id="contenu">
    <header className={s.header}><Link href="/admin/">← Centre de contrôle</Link><span>COBBLESTAR · STUDIO NARRATIF</span><Link href="/compte/">Mon compte</Link></header>
    <section className={s.hero}><div><p>LES HISTOIRES COMMENCENT ICI</p><h1>Écris la prochaine<br/><em>aventure CobbleStar.</em></h1><p>Des personnages, des scènes et des rencontres. Tu racontes l’histoire, le jeu en suit les étapes.</p></div><aside><b>Site → nom du PNJ → jeu</b><p>Place un PNJ avec le bâton, saisis le nom du personnage, puis enregistre. La liaison survit aux renommages sur le site.</p></aside></section>
    {message && <p className={s.notice} role="status">{message}</p>}
    {state && <>
      <div className={s.toolbar}><label>Serveur<select value={server} disabled={busy} onChange={e => { if (dirty && !confirm("Abandonner les modifications non enregistrées ?")) return; const id = e.target.value; setServer(id); void task(() => load(id)); }}>{servers.map(x => <option key={x.serverId}>{x.serverId}</option>)}</select></label>
        <span className={s.sync}>{!fresh ? "Serveur hors ligne / réponse ancienne" : state.error ? "Application refusée" : state.appliedRevision === state.publishedRevision ? "Serveur à jour" : "En attente du serveur"}<small>Brouillon {state.draftRevision} · publié {state.publishedRevision} · appliqué {state.appliedRevision}</small></span>
        <button disabled={busy} onClick={() => { if (!dirty || confirm("Recharger et abandonner le brouillon local ?")) void task(() => load(server)); }}>Actualiser</button>
        {state.canWrite && <><button disabled={busy || !undo.length} onClick={() => { setRedo(values => [...values,content]); setContent(undo[undo.length-1]); setUndo(values => values.slice(0,-1)); setDirty(true); }}>↶ Annuler la modification</button><button disabled={busy || !redo.length} onClick={() => { setUndo(values => [...values,content]); setContent(redo[redo.length-1]); setRedo(values => values.slice(0,-1)); setDirty(true); }}>↷ Rétablir</button></>}
        {state.canWrite && <><button disabled={busy || !dirty} onClick={() => void task(save)}>Enregistrer{dirty ? " *" : ""}</button><button className={s.primary} disabled={busy || dirty || state.draftRevision === 0} onClick={() => setPublishOpen(true)}>Publier en jeu</button></>}
      </div>
      {state.error && <p className={s.notice} role="alert">{state.error}</p>}
      <div className={s.workspace}>
        <aside className={s.directory}><nav>{([['quests', 'Histoires'], ['npcs', 'Personnages'], ['chapters', 'Chapitres']] as const).map(([id, title]) => <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setSelected(0); }}>{title}</button>)}</nav>
          <input aria-label="Rechercher dans le studio" placeholder="Rechercher…" value={query} onChange={e => setQuery(e.target.value)} />
          {entries.map((entry, i) => `${entry.title} ${entry.id}`.toLowerCase().includes(query.toLowerCase()) && <button className={s.entry} aria-pressed={selected === i} key={entry.id + i} onClick={() => { setSelected(i); }}><b>{entry.title}</b><small>{entry.detail}</small></button>)}
          {state.canWrite && <button className={s.add} onClick={() => edit(d => {
            if (tab === 'quests') { setSelected(d.questConfig.quests.length); d.questConfig.quests.push(newQuest()); }
            else if (tab === 'npcs') { setSelected(d.npcs.length); d.npcs.push(newNpc()); }
            else { setSelected(d.questConfig.chapters.length); d.questConfig.chapters.push({ id: makeId('chapitre'), title: 'Nouveau chapitre', order: d.questConfig.chapters.length + 1, unlockMode: 'IMMEDIATE', questIds: [] }); }
          })}>+ Créer {tab === 'quests' ? 'une histoire' : tab === 'npcs' ? 'un personnage' : 'un chapitre'}</button>}
          {state.canWrite && state.observed && <button onClick={() => { if (confirm("Importer les quêtes et modèles connus du serveur dans ce brouillon ? Tes changements locaux seront remplacés, pas le contenu en jeu.")) { setContent({ questConfig: structuredClone(state.observed!.questConfig), npcs: structuredClone(state.observed!.npcs) }); setDirty(true); setSelected(0); } }}>Importer l’existant du serveur</button>}
          <p>Importer permet de reprendre les quêtes existantes. Publier fusionne les identifiants : aucune progression ni quête locale n’est supprimée.</p>
        </aside>
        <fieldset className={s.editor} disabled={!state.canWrite || busy}>
          {!quest && !npc && !chapter && <div className={s.empty}><h2>Ton prochain chapitre t’attend.</h2><p>Crée une première fiche ou importe le catalogue du serveur.</p></div>}
          {quest && <StoryEditor key={quest.id} quest={quest} content={content} catalog={state.catalog} onChange={q => patchQuest(q)} onContent={commit} onDuplicate={() => edit(d => { const copy = structuredClone(quest); copy.id = makeId('quete'); copy.title += ' · copie'; d.questConfig.quests.push(copy); setSelected(d.questConfig.quests.length - 1); })}/>}
          {npc && <CharacterEditor key={npc.id} npc={npc} content={content} catalog={state.catalog} onChange={n => patchNpc(n)} onDuplicate={() => edit(d => { const copy = structuredClone(npc); copy.id = makeId('pnj'); copy.name += ' · copie'; d.npcs.push(copy); setSelected(d.npcs.length - 1); })}/>}
          {chapter && <><h2>{chapter.title}</h2><div className={s.grid}><Field title="Titre du chapitre" value={chapter.title} onChange={v => edit(d => { d.questConfig.chapters[selected].title = v; })}/><Select title="Déblocage" value={chapter.unlockMode} options={['PREVIOUS','IMMEDIATE']} onChange={v => edit(d => { d.questConfig.chapters[selected].unlockMode = v as typeof chapter.unlockMode; })}/></div><h3>Ordre des quêtes</h3><p>Range les histoires dans l’ordre où tu souhaites les raconter.</p>{chapter.questIds.map((id, i) => <div className={s.choice} key={id}><b>{i+1}. {content.questConfig.quests.find(q => q.id === id)?.title ?? id}</b><button disabled={i === 0} onClick={() => edit(d => { const ids = d.questConfig.chapters[selected].questIds; [ids[i-1], ids[i]] = [ids[i], ids[i-1]]; })}>Monter</button><button onClick={() => edit(d => { d.questConfig.chapters[selected].questIds.splice(i,1); })}>Retirer</button></div>)}<label>Ajouter une quête<select value="" onChange={e => { const id = e.target.value; if (id) edit(d => { d.questConfig.chapters.forEach(c => { c.questIds = c.questIds.filter(q => q !== id); }); d.questConfig.chapters[selected].questIds.push(id); }); }}><option value="">Choisir…</option>{content.questConfig.quests.filter(q => ['STORY','SIDE'].includes(q.kind) && !chapter.questIds.includes(q.id)).map(q => <option key={q.id} value={q.id}>{q.title}</option>)}</select></label><button disabled={selected === 0} onClick={() => edit(d => { const cs = d.questConfig.chapters; [cs[selected-1], cs[selected]] = [cs[selected], cs[selected-1]]; setSelected(selected-1); })}>Monter ce chapitre</button></>}
        </fieldset>
      </div>
      <section className={s.audit}><div><h2>PNJ placés sur le serveur</h2>{state.placements.length === 0 && <p>Aucun PNJ remonté par le bâton.</p>}{state.placements.map(p => <p key={p.key}><b>{p.name}</b> · {content.npcs.find(n => n.id === p.templateId)?.name || 'Local · pas encore lié'}</p>)}</div><div><h2>Publications tracées</h2>{state.history.map(h => <article key={h.revision}><b>Version {h.revision}</b><p>{h.reason}</p><small>{h.actor} · {new Date(h.createdAt).toLocaleString('fr-FR')}</small>{state.canWrite && <button disabled={busy} onClick={() => { if (confirm('Reprendre cette version dans le brouillon ? Il faudra enregistrer et publier pour l’appliquer.')) void task(async () => { const r = await api<{ content: StudioContent }>(`/api/admin/quests/${server}/history/${h.revision}`); setContent(r.content); setDirty(true); setSelected(0); }); }}>Reprendre en brouillon</button>}</article>)}</div></section>
    </>}
    {publishOpen && <div className={s.overlay}><section role="dialog" aria-modal="true" aria-labelledby="publish-title"><h2 id="publish-title">Publier sur {server} ?</h2><p>{content.questConfig.quests.length} quêtes et {content.npcs.filter(n => n.enabled).length} modèles PNJ actifs. Les PNJ liés recevront ces réglages au prochain échange avec le serveur.</p><label>Motif de publication<textarea autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex. ajout de la rencontre avec le professeur"/></label><button disabled={busy} onClick={() => setPublishOpen(false)}>Annuler</button><button className={s.primary} disabled={busy || reason.trim().length < 5} onClick={() => void task(async () => { const r = await api<{ publishedRevision: number }>(`/api/admin/quests/${server}/publish`, { method: 'POST', body: JSON.stringify({ baseRevision: state!.draftRevision, reason }) }); setPublishOpen(false); setReason(''); await load(server); setMessage(`Version ${r.publishedRevision} publiée. Attends la confirmation « Serveur à jour » avant le test en jeu.`); })}>Confirmer la publication</button></section></div>}
  </main>;
}

function Field({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void }) { return <label>{title}<input value={value ?? ''} onChange={e => onChange(e.target.value)}/></label>; }
function Select({ title, value, options, onChange }: { title: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label>{title}<select value={value} onChange={e => onChange(e.target.value)}>{options.map(x => <option key={x} value={x}>{optionLabels[x] ?? x}</option>)}</select></label>; }
