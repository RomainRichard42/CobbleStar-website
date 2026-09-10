"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import s from "./players.module.css";
import PokemonWorkspace, { type Pokemon, type PokemonChange } from "./PokemonWorkspace";

type Item = { slot: number; id: string; name: string; count: number; maxCount: number; components: string; fingerprint: string };
type PlayerRow = { uuid: string; username: string; online: number; discordUsername: string | null; receivedAt: string };
type Action = { kind: string; value?: number; slot?: number; storage?: string; pokemonUuid?: string; cosmeticId?: string; change?: PokemonChange };
type Profile = {
  uuid: string; username: string; serverId: string; snapshotId: string; observedAt: number; firstSeenAt: string; online: boolean; canWrite: boolean;
  account: null | { discord_username: string; discord_id: string; stars: number; votes: number; purchases: number; created_at: string; minecraft_linked_at: string };
  snapshot: { sessionStartedAt: number; health: number; maxHealth: number; food: number; xpLevel: number; xpProgress: number; dimension: string; x: number; y: number; z: number; gameMode: string; inventory: Item[]; enderChest: Item[]; pokemon: Pokemon[]; pokemonError?: string; pokemonTruncated: boolean; statistics: Record<string, number>; academy: Record<string, unknown>; quests: Record<string, unknown>; cosmeticIds: string[]; capabilities: string[] };
  events: Array<{ id: string; kind: string; at: number; detail: Record<string, unknown> }>; eventsTotal: number; eventsPage: number;
  actions: Array<{ id: string; actor: string; reason: string; payload: Action; status: string; result: unknown; createdAt: string }>;
};
const tabs = ["Vue d’ensemble", "Inventaires", "Pokémon", "Statistiques", "Collection", "Quêtes", "Historique", "Actions admin"] as const;
type Tab = typeof tabs[number];
const fmt = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
const date = (value: number | string) => new Date(value).toLocaleString("fr-FR");
const labels: Record<string, string> = { join: "Connexion", disconnect: "Déconnexion", death: "Mort constatée", dimension: "Changement de monde", inventory_change: "Inventaire modifié", pokemon_change: "Collection Pokémon modifiée", statistics_change: "Progression", xp_level: "Niveau d’expérience Minecraft", health: "Points de vie", food: "Nourriture", inventory_count: "Quantité d’un objet", pokemon_level: "Niveau Pokémon", cosmetic_unlock: "Débloquer un cosmétique", cosmetics_disable: "Désactiver les cosmétiques", queued: "En attente du serveur", dispatched: "Transmise au serveur", applied: "Appliquée", rejected: "Refusée", expired: "Expirée sans exécution", unknown: "Résultat non confirmé — vérifier en jeu" };
const errors: Record<string, string> = { AUTH_REQUIRED: "Connecte-toi avec ton compte Discord administrateur.", GAME_ADMIN_REQUIRED: "Ton identifiant Discord doit être autorisé dans GAME_ADMIN_DISCORD_IDS (gestion) ou GAME_ADMIN_READ_DISCORD_IDS (lecture).", PLAYER_NOT_OBSERVED: "Ce joueur n’a pas encore été synchronisé par le serveur.", PLAYER_OFFLINE_OR_STALE: "Le joueur est hors ligne ou les données ne sont plus assez récentes.", SNAPSHOT_CHANGED: "Les données ont changé. Actualise puis prépare à nouveau la modification.", ACTION_ALREADY_PENDING: "Une action attend déjà une réponse du serveur pour ce joueur.", INVALID_ORIGIN: "Origine du site non autorisée. Vérifie SITE_ORIGIN dans l’API." };
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => ({ error: "API indisponible : vérifie que le backend est démarré." }));
  if (!response.ok) throw Object.assign(new Error(errors[body.error] ?? (response.status >= 500 ? "Impossible de lire les données du serveur. Réessaie après la remise en service de l’API." : body.error ?? `Erreur HTTP ${response.status}`)), { status: response.status });
  return body as T;
}

export default function PlayersAdmin() {
  const [players, setPlayers] = useState<PlayerRow[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1);
  const [query, setQuery] = useState(""), [selected, setSelected] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null), [tab, setTab] = useState<Tab>("Vue d’ensemble");
  const [eventPage, setEventPage] = useState(1), [filter, setFilter] = useState("");
  const [error, setError] = useState(""), [listError, setListError] = useState(""), [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false);
  const [proposal, setProposal] = useState<{ requestId: string; uuid: string; snapshotId: string; expected?: number | string; action: Action; description: string } | null>(null);
  const [reason, setReason] = useState(""), [confirmed, setConfirmed] = useState(false);
  const [kind, setKind] = useState("xp_level"), [value, setValue] = useState("1"), [cosmetic, setCosmetic] = useState("");
  const [itemTarget, setItemTarget] = useState<Item | null>(null), [itemStorage, setItemStorage] = useState("inventory");
  const [pokemonTarget, setPokemonTarget] = useState<Pokemon | null>(null);
  const loadId = useRef(0);
  const [now, setNow] = useState(0);

  useEffect(() => { const timer = setTimeout(() => { const uuid = new URLSearchParams(window.location.search).get("uuid"); if (uuid && /^[a-f0-9]{32}$/.test(uuid)) setSelected(uuid); setNow(Date.now()); }, 0); const clock = setInterval(() => setNow(Date.now()), 1000); return () => { clearTimeout(timer); clearInterval(clock); }; }, []);
  const loadList = useCallback(async () => {
    try { const data = await api<{ players: PlayerRow[]; total: number }>(`/api/admin/game/players?page=${page}&q=${encodeURIComponent(query)}`); setPlayers(data.players); setTotal(data.total); setListError(""); }
    catch (caught) { setListError((caught as Error).message); if ([401, 403].includes((caught as { status: number }).status)) { setPlayers([]); setTotal(0); } }
    finally { setLoading(false); }
  }, [page, query]);
  useEffect(() => { const timer = setTimeout(() => void loadList(), 250); return () => clearTimeout(timer); }, [loadList]);
  const loadProfile = useCallback(async () => {
    if (!selected) return;
    const id = ++loadId.current;
    try { const data = await api<Profile>(`/api/admin/game/players/${selected}?page=${eventPage}`); if (id === loadId.current) { setProfile(data); setError(""); } }
    catch (caught) { if (id === loadId.current) { setError((caught as Error).message); if ([401, 403].includes((caught as { status: number }).status)) { setProfile(null); setProposal(null); } } }
  }, [selected, eventPage]);
  useEffect(() => {
    const initial = setTimeout(() => void loadProfile(), 0);
    const interval = setInterval(() => { if (!document.hidden) { void loadProfile(); void loadList(); } }, 15_000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [loadProfile, loadList]);
  const choose = (uuid: string) => { loadId.current++; setSelected(uuid); setProfile(null); setTab("Vue d’ensemble"); setEventPage(1); setProposal(null); setItemTarget(null); setPokemonTarget(null); setError(""); setNotice(""); window.history.replaceState(null, "", `?uuid=${uuid}`); };
  const propose = (action: Action, description: string, pokemonFingerprint?: string) => {
    if (!profile) return;
    if (action.kind === "pokemon_edit" && profile.snapshot.pokemon.find(p => p.uuid === action.pokemonUuid)?.editor?.fingerprint !== pokemonFingerprint) { setNotice("Ce Pokémon a changé. Recharge ses valeurs avant de préparer une modification."); return; }
    if (action.kind === "inventory_count" && profile.snapshot[itemStorage as "inventory" | "enderChest"].find((item) => item.slot === itemTarget?.slot)?.fingerprint !== itemTarget?.fingerprint) {
      setNotice("Cet objet a changé depuis sa sélection. Sélectionne-le à nouveau dans Inventaires."); return;
    }
    if (action.kind === "pokemon_level" && profile.snapshot.pokemon.find((pokemon) => pokemon.uuid === pokemonTarget?.uuid)?.level !== pokemonTarget?.level) {
      setNotice("Ce Pokémon a changé depuis sa sélection. Sélectionne-le à nouveau."); return;
    }
    const expected = action.kind === "inventory_count" ? itemTarget?.fingerprint : action.kind === "pokemon_level" ? pokemonTarget?.level : action.kind === "xp_level" ? profile.snapshot.xpLevel : action.kind === "health" ? profile.snapshot.health : action.kind === "food" ? profile.snapshot.food : undefined;
    setProposal({ requestId: crypto.randomUUID(), uuid: profile.uuid, snapshotId: profile.snapshotId, expected: pokemonFingerprint ?? expected, action, description }); setReason(""); setConfirmed(false); setNotice("");
  };
  async function submit() {
    if (!proposal || pending || !confirmed || reason.trim().length < 5) return;
    setPending(true);
    try {
      await api(`/api/admin/game/players/${proposal.uuid}/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: proposal.requestId, snapshotId: proposal.snapshotId, expected: proposal.expected, reason, action: proposal.action }) });
      setProposal(null); setNotice("Action enregistrée. Attends le statut « Appliquée » dans le journal avant de considérer le changement effectué."); setTab("Actions admin"); await loadProfile();
    } catch (caught) { setNotice((caught as Error).message); }
    finally { setPending(false); }
  }
  const fresh = !!profile && profile.online && now - profile.observedAt < 45000 && !error;
  const writable = fresh && !!profile?.canWrite && !profile.actions.some((action) => ["queued", "dispatched"].includes(action.status));
  const snapshot = profile?.snapshot;
  const matches = (text: string) => text.toLowerCase().includes(filter.toLowerCase());

  return <main className={s.page} id="contenu">
    <header className={s.header}><Link href="/admin/">← Centre de contrôle</Link><span>COBBLESTAR / JOUEURS</span><Link href="/compte/">Mon compte</Link></header>
    <section className={s.title}><div><span className={s.eyebrow}>OBSERVATOIRE DES DRESSEURS</span><h1>Le jeu, côté <em>coulisses.</em></h1><p>Une fiche par joueur. Des données du serveur, des modifications tracées.</p></div><button onClick={() => { void loadList(); void loadProfile(); }}>Actualiser ↻</button></section>
    <div className={s.workspace}>
      <aside className={s.directory}><label htmlFor="player-search">Rechercher un joueur</label><input id="player-search" placeholder="Pseudo, UUID, Discord…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}/><small>{listError ? "Nombre de joueurs indisponible" : loading ? "Lecture du nombre de joueurs…" : `${fmt(total)} joueurs observés · même sans /link`}</small>
        {listError && <p role="alert" className={s.warning}>{listError}</p>}
        {loading && <p role="status">Chargement des joueurs…</p>}
        {!loading && !listError && !players.length && <p>Aucun joueur synchronisé. Active la passerelle serveur ; les fiches apparaîtront lors de leurs connexions.</p>}
        <div className={s.playerList}>{players.map((player) => <button key={player.uuid} className={selected === player.uuid ? s.selected : ""} onClick={() => choose(player.uuid)}><span className={s.avatar}>{player.username.slice(0, 2).toUpperCase()}</span><span><b>{player.username}</b><small>{player.discordUsername ? `@${player.discordUsername}` : "Compte web non lié"}</small></span><i className={player.online ? s.online : s.offline} title={player.online ? "Présence confirmée récemment" : "Hors ligne ou présence inconnue"}/></button>)}</div>
        {!listError && !loading && <Pagination page={page} pages={Math.max(1, Math.ceil(total / 24))} onPage={setPage}/>}
      </aside>
      <section className={s.dossier} aria-label="Fiche du joueur">
        {error && <p role="alert" className={s.warning}>{error} {profile && "Les données affichées peuvent être périmées ; modifications désactivées."}</p>}
        {notice && <p role="status" className={s.notice}>{notice}</p>}
        {!profile ? <div className={s.empty}><span>✦</span><h2>{error ? "Fiche indisponible" : selected ? "Lecture de la fiche…" : "Ouvre une fiche joueur"}</h2><p>{error ? "La fiche n’a pas pu être chargée. Aucune modification ne peut être envoyée. Utilise Actualiser pour réessayer." : "Équipe Pokémon, inventaires, progression et historique, au même endroit. Aucune donnée fictive n’est affichée."}</p></div> : <>
          <div className={s.identity}><div><span className={s.eyebrow}>{profile.serverId} · {fresh ? "PRÉSENCE RÉCENTE" : "HORS LIGNE / NON CONFIRMÉ"}</span><h2>{profile.username}</h2><code>{profile.uuid}</code><p>Dernier relevé : {date(profile.observedAt)} · Suivi commencé le {date(profile.firstSeenAt)}</p></div><span className={s.access}>{profile.canWrite ? "GESTION JOUEUR" : "LECTURE SEULE"}</span></div>
          <nav className={s.tabs} aria-label="Sections de la fiche">{tabs.map((item) => <button key={item} aria-current={tab === item ? "page" : undefined} onClick={() => { setTab(item); setFilter(""); }}>{item}</button>)}</nav>
          {snapshot && <div className={s.content}>
            {tab === "Vue d’ensemble" && <>
              <div className={s.metrics}><Metric label="Temps de jeu cumulé" value={`${fmt((snapshot.statistics["minecraft:custom/minecraft:play_time"] ?? 0) / 72000)} h`}/><Metric label="Pokémon recensés" value={fmt(snapshot.pokemon.length)}/><Metric label="Expérience" value={`Niveau ${snapshot.xpLevel}`}/><Metric label="Solde web" value={profile.account ? `${fmt(profile.account.stars)} Stars` : "Compte non lié"}/></div>
              <div className={s.columns}><article className={s.panel}><h3>En jeu</h3><dl><dt>Monde</dt><dd>{snapshot.dimension}</dd><dt>Position</dt><dd>{[snapshot.x, snapshot.y, snapshot.z].map(fmt).join(" / ")}</dd><dt>Mode de jeu</dt><dd>{snapshot.gameMode}</dd><dt>Vie · Nourriture</dt><dd>{fmt(snapshot.health)} / {fmt(snapshot.maxHealth)} PV · {snapshot.food} / 20</dd><dt>Session du dernier relevé</dt><dd>Depuis {date(snapshot.sessionStartedAt)}</dd></dl></article><article className={s.panel}><h3>Compte & communauté</h3>{profile.account ? <dl><dt>Discord</dt><dd>@{profile.account.discord_username}</dd><dt>Identifiant Discord</dt><dd>{profile.account.discord_id}</dd><dt>Compte créé le</dt><dd>{date(profile.account.created_at)}</dd><dt>Minecraft lié le</dt><dd>{date(profile.account.minecraft_linked_at)}</dd><dt>Votes · Achats</dt><dd>{fmt(profile.account.votes)} votes · {fmt(profile.account.purchases)} achats</dd></dl> : <p>Ce joueur est connu du serveur, mais n’a pas encore lié son compte Discord avec /link.</p>}</article></div>
              <p className={s.hint}>Relevés périodiques, pas une vidéo de chaque action. Les anciens compteurs Minecraft sont consultables ; l’historique détaillé commence à l’activation de la passerelle.</p>
            </>}
            {tab === "Inventaires" && <><h3>Objets réellement présents</h3><p className={s.hint}>Inventaire principal, barre rapide, armure, seconde main et coffre de l’End. Les métadonnées sont conservées ; modifier une quantité ne remplace pas l’objet.</p>{(["inventory", "enderChest"] as const).map((storage) => <section key={storage}><h4>{storage === "inventory" ? "Inventaire & équipement" : "Coffre de l’End"} · {snapshot[storage].length} emplacements occupés</h4><div className={s.items}>{snapshot[storage].map((item) => <article key={item.slot} className={s.item}><header><small>SLOT {item.slot}</small><b>×{item.count}</b></header><h4>{item.name}</h4><code>{item.id}</code><details><summary>Composants de l’objet</summary><pre>{item.components}</pre></details><button disabled={!writable} onClick={() => { setItemTarget(item); setItemStorage(storage); setValue(String(item.count)); setKind("inventory_count"); setTab("Actions admin"); }}>Modifier la quantité</button></article>)}</div>{!snapshot[storage].length && <p>Inventaire vide.</p>}</section>)}</>}
            {tab === "Pokémon" && <>{snapshot.pokemonError && <p className={s.warning}>{snapshot.pokemonError} La liste peut être incomplète.</p>}{snapshot.pokemonTruncated && <p className={s.warning}>Relevé Pokémon incomplet : limite de taille ou de nombre atteinte. Les Pokémon restent conservés en jeu.</p>}<PokemonWorkspace key={profile.uuid} pokemon={snapshot.pokemon} writable={writable} capable={snapshot.capabilities.includes("pokemon_edit")} onLegacy={pokemon => { setPokemonTarget(pokemon); setValue(String(pokemon.level)); setKind("pokemon_level"); setTab("Actions admin"); }} onEdit={(pokemon, change, fingerprint, description) => { propose({ kind: "pokemon_edit", pokemonUuid: pokemon.uuid, change }, description, fingerprint); setTab("Actions admin"); }}/></>}
            {tab === "Statistiques" && <><h3>Compteurs Minecraft</h3><p className={s.hint}>Valeurs brutes du serveur : temps en ticks, distances en centimètres. Seuls les compteurs non nuls sont présents.</p><input aria-label="Filtrer les statistiques" placeholder="Ex. mined, killed, play_time, jump…" value={filter} onChange={(e) => setFilter(e.target.value)}/><div className={s.statList}>{Object.entries(snapshot.statistics).filter(([key]) => matches(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => <div key={key}><code>{key}</code><strong>{fmt(count)}</strong></div>)}</div></>}
            {tab === "Collection" && <><h3>Collection CobbleStar</h3><p>Cartes et exemplaires, cosmétiques possédés et actifs, noms des compagnons, historique des coffres et profil de dresseur.</p><DataTree value={snapshot.academy} label="Données de collection" expanded/></>}
            {tab === "Quêtes" && <><h3>Progression enregistrée</h3><p>Quêtes acceptées, objectifs, récompenses et rotations présents dans la sauvegarde du joueur. Consultation seule pour préserver les règles de progression.</p><DataTree value={snapshot.quests} label="Sauvegarde des quêtes" expanded/></>}
            {tab === "Historique" && <><h3>Journal d’activité · {fmt(profile.eventsTotal)} événements</h3><p className={s.hint}>Connexions et déconnexions, morts constatées et différences entre relevés. Un objet acquis puis utilisé entre deux relevés peut ne pas apparaître. Conservation : 90 jours.</p><div className={s.timeline}>{profile.events.map((event) => <article key={event.id}><time>{date(event.at)}</time><h4>{labels[event.kind] ?? event.kind}</h4><DataTree value={event.detail} label="Détails du relevé"/></article>)}</div>{!profile.events.length && <p>Aucun événement enregistré pour cette période.</p>}<Pagination page={eventPage} pages={Math.max(1, Math.ceil(profile.eventsTotal / 40))} onPage={setEventPage}/></>}
            {tab === "Actions admin" && <>
              <div className={s.panel}><h3>Modifier en jeu</h3><p>{!profile.canWrite ? "Ce compte dispose uniquement d’un accès en lecture." : !writable ? "Actions désactivées : présence non confirmée, données périmées ou action déjà en attente." : "Le joueur est présent. Chaque changement sera revérifié par le serveur."}</p>
                <div className={s.form}><label>Action<select value={kind} onChange={(e) => setKind(e.target.value)}>{snapshot.capabilities.filter(capability => capability !== "pokemon_edit").map((capability) => <option key={capability} value={capability}>{labels[capability] ?? capability}</option>)}</select></label>
                  {kind === "cosmetic_unlock" ? <label>Cosmétique<select value={cosmetic} onChange={(e) => setCosmetic(e.target.value)}><option value="">Choisir un cosmétique</option>{snapshot.cosmeticIds.map((id) => <option key={id}>{id}</option>)}</select></label> : kind !== "cosmetics_disable" && <label>Nouvelle valeur<input type="number" min={kind === "health" || kind === "pokemon_level" ? 1 : 0} max={kind === "pokemon_level" ? 100 : kind === "xp_level" ? 1000 : kind === "health" ? snapshot.maxHealth : kind === "food" ? 20 : itemTarget?.maxCount ?? 99} value={value} onChange={(e) => setValue(e.target.value)}/></label>}
                  {kind === "inventory_count" && <p>{itemTarget ? `${itemTarget.name} · ${itemStorage} / slot ${itemTarget.slot} · aperçu ×${itemTarget.count}` : "Choisis d’abord un objet dans l’onglet Inventaires."}</p>}
                  {kind === "pokemon_level" && <p>{pokemonTarget ? `${pokemonTarget.name} · ${pokemonTarget.uuid} · aperçu niveau ${pokemonTarget.level}` : "Choisis d’abord un Pokémon dans l’onglet Pokémon."}</p>}
                  <button className={s.primary} disabled={!writable || (kind === "inventory_count" && !itemTarget) || (kind === "pokemon_level" && !pokemonTarget) || (kind === "cosmetic_unlock" && !cosmetic) || (!["cosmetic_unlock", "cosmetics_disable"].includes(kind) && (!value.trim() || !Number.isFinite(Number(value))))} onClick={() => {
                    const action: Action = { kind };
                    if (!["cosmetic_unlock", "cosmetics_disable"].includes(kind)) action.value = Number(value);
                    if (kind === "inventory_count" && itemTarget) { action.slot = itemTarget.slot; action.storage = itemStorage; }
                    if (kind === "pokemon_level" && pokemonTarget) action.pokemonUuid = pokemonTarget.uuid;
                    if (kind === "cosmetic_unlock") action.cosmeticId = cosmetic;
                    const target = kind === "inventory_count" ? `${itemTarget?.name} (${itemStorage}, slot ${itemTarget?.slot})` : kind === "pokemon_level" ? `${pokemonTarget?.name} (${pokemonTarget?.uuid})` : kind === "cosmetic_unlock" ? cosmetic : profile.username;
                    propose(action, `${labels[kind]} — ${target}${action.value !== undefined ? ` → ${action.value}` : ""}`);
                  }}>Préparer la modification</button>
                </div>
                <p className={s.hint}>Pas de commandes libres, pas d’édition hors ligne. Quantité 0 = suppression de la pile. Un cosmétique acheté peut être restauré par la boutique : la révocation commerciale n’est pas proposée ici.</p>
              </div>
              {proposal && <section className={s.confirmation} aria-labelledby="confirm-title"><h3 id="confirm-title">Vérifier avant d’envoyer</h3><p><b>{proposal.description}</b></p><p>Cible : {profile.username} · {proposal.uuid}</p><label>Motif obligatoire<textarea maxLength={300} minLength={5} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. Correction après vérification du ticket…"/></label><label className={s.checkbox}><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}/>Je confirme cette modification du joueur en jeu.</label><div><button onClick={() => setProposal(null)} disabled={pending}>Annuler</button><button className={s.primary} disabled={!confirmed || reason.trim().length < 5 || pending || !writable} onClick={() => void submit()}>{pending ? "Envoi…" : "Confirmer et transmettre"}</button></div></section>}
              <h3>Journal des interventions · 100 dernières</h3><p className={s.hint}>Conservation : 365 jours. « Résultat non confirmé » ne signifie pas « échec » : ne rejoue pas l’action sans vérifier l’état réel.</p><div className={s.timeline}>{profile.actions.map((action) => <article key={action.id}><div className={s.actionHeading}><h4>{labels[action.payload.kind] ?? action.payload.kind}</h4><strong className={action.status === "applied" ? s.success : s.status}>{labels[action.status] ?? action.status}</strong></div><p>{action.reason}</p><small>{date(action.createdAt)} · Admin Discord {action.actor}</small><DataTree value={{ id: action.id, demande: action.payload, resultat: action.result }} label="Demande et résultat serveur"/></article>)}</div>{!profile.actions.length && <p>Aucune intervention enregistrée.</p>}
            </>}
          </div>}
        </>}
      </section>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className={s.metric}><small>{label}</small><strong>{value}</strong></article>; }
function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) { return <div className={s.pagination}><button aria-label="Page précédente" disabled={page <= 1} onClick={() => onPage(page - 1)}>←</button><span>{page} / {pages}</span><button aria-label="Page suivante" disabled={page >= pages} onClick={() => onPage(page + 1)}>→</button></div>; }
function DataTree({ value, label, expanded = false }: { value: unknown; label: string; expanded?: boolean }) {
  const [open, setOpen] = useState(expanded);
  if (value === null || typeof value !== "object") return <div className={s.datum}><span>{label}</span><b>{value === null ? "—" : typeof value === "boolean" ? value ? "Oui" : "Non" : String(value)}</b></div>;
  const entries = Object.entries(value);
  return <details className={s.tree} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}><summary>{label} <small>({entries.length})</small></summary>{open && (entries.length ? entries.map(([key, child]) => <DataTree key={key} label={key} value={child}/>) : <p>Aucune entrée.</p>)}</details>;
}
