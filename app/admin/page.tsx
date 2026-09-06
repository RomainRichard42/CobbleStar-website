"use client";

import Link from "next/link";
import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import styles from "./admin.module.css";

type Player = {
  id: string; discordId: string | null; discordUsername: string | null; discordName: string | null;
  discordAvatarUrl: string | null; discordJoinedAt: string | null; minecraftUsername: string | null;
  minecraftUuid: string | null; minecraftLinkedAt: string | null; createdAt: string; balance: number;
  votes: number; lastVote: string | null; purchases: number; starsSpent: number; lastPurchase: string | null;
};
type Dashboard = {
  generatedAt: string;
  overview: { users: number; discordAccounts: number; discordMembers: number; minecraftLinked: number; newUsers7d: number; newUsers30d: number; activeSessions: number; activeSessionUsers: number };
  economy: { circulatingStars: number; averageBalance: number; largestBalance: number; starsIssued: number; starsSpent: number; transactions: number; orders: number; paidOrders: number; revenueCents: number; starsPurchased: number };
  engagement: { votes: number; voters: number; votes7d: number; votes30d: number; pendingVoteRewards: number; purchases: number; buyers: number; purchases30d: number; shopStarsSpent: number };
  deliveries: { total: number; pending: number; leased: number; delivered: number; failed: number };
  daily: Array<{ day: string; accounts: number; links: number; votes: number; purchases: number }>;
  players: Player[];
  voteSites: Array<{ vote_site: string; votes: number; voters: number; last_vote: string | null }>;
  products: Array<{ product_id: string; purchases: number; buyers: number; starsSpent: number; last_purchase: string | null }>;
};

type Series = "accounts" | "links" | "votes" | "purchases";
type PlayerFilter = "all" | "linked" | "unlinked" | "voters" | "buyers";
type PlayerSort = "recent" | "stars" | "votes" | "purchases";
const SERIES: Array<{ id: Series; label: string }> = [
  { id: "accounts", label: "Comptes" }, { id: "links", label: "Liaisons" },
  { id: "votes", label: "Votes" }, { id: "purchases", label: "Achats" },
];
const number = new Intl.NumberFormat("fr-FR");
const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const percent = (value: number, total: number) => total > 0 ? Math.round(value / total * 100) : 0;
const date = (value: string | null) => value ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "Jamais";
const shortDay = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00Z`));

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<Series[]>(["accounts", "links", "votes"]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PlayerFilter>("all");
  const [sort, setSort] = useState<PlayerSort>("recent");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/stats", { credentials: "include", cache: "no-store" });
      if (response.status === 401) throw new Error("Connecte-toi avec ton compte administrateur.");
      if (response.status === 403) throw new Error("Ce compte n’a pas accès au centre de contrôle.");
      if (!response.ok) throw new Error("Les statistiques sont momentanément indisponibles.");
      setData(await response.json() as Dashboard);
    } catch (caught) { setError((caught as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const players = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.players.filter((player) => {
      const matchesQuery = !needle || [player.discordName, player.discordUsername, player.minecraftUsername, player.discordId, player.minecraftUuid].some((value) => value?.toLowerCase().includes(needle));
      const matchesFilter = filter === "all" || (filter === "linked" && player.minecraftUuid) || (filter === "unlinked" && !player.minecraftUuid) || (filter === "voters" && player.votes > 0) || (filter === "buyers" && player.purchases > 0);
      return matchesQuery && matchesFilter;
    }).sort((left, right) => {
      if (sort === "stars") return right.balance - left.balance;
      if (sort === "votes") return right.votes - left.votes;
      if (sort === "purchases") return right.purchases - left.purchases;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [data, query, filter, sort]);
  const pages = Math.max(1, Math.ceil(players.length / 12));
  const visiblePlayers = players.slice((page - 1) * 12, page * 12);
  const chartMax = data ? Math.max(1, ...data.daily.flatMap((item) => series.map((key) => item[key]))) : 1;

  if (loading && !data) return <StateScreen label="SYNCHRONISATION" title="Lecture de l’écosystème CobbleStar…" />;
  if (error && !data) return <StateScreen label="ACCÈS IMPOSSIBLE" title={error} error onRetry={() => void load()} />;
  if (!data) return null;

  const funnel = [
    ["Comptes Discord", data.overview.discordAccounts, "Profil reconnu"],
    ["Discord rejoint", data.overview.discordMembers, "Communauté intégrée"],
    ["Minecraft lié", data.overview.minecraftLinked, "Commande /link"],
    ["A déjà voté", data.engagement.voters, "Engagement"],
    ["A déjà acheté", data.engagement.buyers, "Conversion boutique"],
  ] as const;

  return <main className={styles.page} id="contenu">
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/"><img src="/cobblestar-logo.png" alt=""/><span><small>COBBLESTAR</small><b>CONTROL CENTER</b></span></Link>
      <div className={styles.live}><i/><span><small>DONNÉES ACTUALISÉES</small><b>{new Date(data.generatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b></span></div>
      <nav><Link href="/admin/joueurs/">Joueurs en jeu</Link><Link href="/compte/">Mon compte</Link><Link href="/wiki/admin/">Studio wiki</Link><button onClick={() => void load()} disabled={loading}>{loading ? "Actualisation…" : "Actualiser ↻"}</button></nav>
    </header>

    {error && <p role="alert">{error} Les données affichées proviennent du dernier chargement réussi.</p>}
    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>ADMINISTRATION · VUE GLOBALE</span><h1>L’écosystème<br/><em>en un regard.</em></h1><p>De la première connexion Discord jusqu’aux votes, achats et livraisons en jeu.</p></div>
      <div className={styles.heroPulse}><span>{number.format(data.overview.newUsers7d)}</span><p><b>NOUVEAUX DRESSEURS</b><small>sur les 7 derniers jours</small></p></div>
    </section>

    <section className={styles.kpis} aria-label="Indicateurs principaux">
      <Kpi code="01" label="Dresseurs" value={data.overview.users} detail={`+${data.overview.newUsers30d} ce mois`} tone="cyan" />
      <Kpi code="02" label="Minecraft liés" value={data.overview.minecraftLinked} detail={`${percent(data.overview.minecraftLinked, data.overview.users)}% des comptes`} tone="mint" />
      <Kpi code="03" label="Votes cumulés" value={data.engagement.votes} detail={`${data.engagement.votes7d} cette semaine`} tone="pink" />
      <Kpi code="04" label="Achats boutique" value={data.engagement.purchases} detail={`${number.format(data.engagement.shopStarsSpent)} Stars dépensées`} tone="gold" />
      <Kpi code="05" label="Stars en circulation" value={data.economy.circulatingStars} detail={`${number.format(Math.round(data.economy.averageBalance))} par portefeuille`} tone="violet" />
      <Kpi code="06" label="Revenu confirmé" value={currency.format(data.economy.revenueCents / 100)} detail={`${data.economy.paidOrders} commande(s) payée(s)`} tone="orange" raw />
    </section>

    <section className={styles.dashboardGrid}>
      <article className={styles.chartCard}>
        <header><div><small>30 DERNIERS JOURS</small><h2>Rythme de la communauté</h2></div><div className={styles.legend}>{SERIES.map((item) => <button key={item.id} className={`${styles[item.id]} ${series.includes(item.id) ? styles.selected : ""}`} onClick={() => setSeries((current) => current.includes(item.id) ? current.length > 1 ? current.filter((key) => key !== item.id) : current : [...current, item.id])}><i/>{item.label}</button>)}</div></header>
        <div className={styles.chart}>
          {data.daily.map((item, index) => <div className={styles.chartDay} key={item.day} title={`${shortDay(item.day)} · ${item.accounts} comptes · ${item.links} liaisons · ${item.votes} votes · ${item.purchases} achats`}>
            <div>{series.map((key) => <i key={key} className={styles[key]} style={{ "--height": `${Math.max(item[key] ? 5 : 0, item[key] / chartMax * 100)}%` } as CSSProperties}/>)}</div>
            {(index % 5 === 0 || index === 29) && <small>{shortDay(item.day)}</small>}
          </div>)}
        </div>
      </article>

      <article className={styles.funnelCard}>
        <header><small>PARCOURS JOUEUR</small><h2>Conversion réelle</h2><p>Où les joueurs s’arrêtent entre Discord et la boutique.</p></header>
        <div className={styles.funnel}>{funnel.map(([label, value, detail], index) => <div key={label} style={{ "--width": `${Math.max(18, percent(value, funnel[0][1]))}%` } as CSSProperties}><span>{String(index + 1).padStart(2, "0")}</span><p><b>{label}</b><small>{detail}</small></p><strong>{number.format(value)}<small>{percent(value, funnel[0][1])}%</small></strong></div>)}</div>
      </article>
    </section>

    <section className={styles.operations}>
      <article><header><div><small>ÉCONOMIE</small><h2>Flux de Stars</h2></div><span>✦</span></header><div className={styles.metricRows}><Metric label="Stars créées" value={data.economy.starsIssued}/><Metric label="Stars consommées" value={data.economy.starsSpent}/><Metric label="Plus gros solde" value={data.economy.largestBalance}/><Metric label="Transactions" value={data.economy.transactions}/></div></article>
      <article><header><div><small>LIVRAISON EN JEU</small><h2>État opérationnel</h2></div><span className={data.deliveries.failed ? styles.danger : styles.ok}>{data.deliveries.failed ? "!" : "✓"}</span></header><div className={styles.deliveryRing} style={{ "--delivery": `${percent(data.deliveries.delivered, data.deliveries.total)}%` } as CSSProperties}><strong>{percent(data.deliveries.delivered, data.deliveries.total)}%</strong><small>livré</small></div><div className={styles.deliveryLegend}><span><i className={styles.done}/>Livrés <b>{data.deliveries.delivered}</b></span><span><i className={styles.wait}/>En attente <b>{data.deliveries.pending + data.deliveries.leased}</b></span><span><i className={styles.fail}/>Échecs <b>{data.deliveries.failed}</b></span></div></article>
      <article><header><div><small>ENGAGEMENT</small><h2>Votes & communauté</h2></div><span>◆</span></header><div className={styles.metricRows}><Metric label="Votants uniques" value={data.engagement.voters}/><Metric label="Votes sur 30 jours" value={data.engagement.votes30d}/><Metric label="Récompenses en attente" value={data.engagement.pendingVoteRewards}/><Metric label="Sessions web valides" value={data.overview.activeSessionUsers}/></div></article>
    </section>

    <section className={styles.playerSection}>
      <header><div><small>ANNUAIRE JOUEURS</small><h2>{number.format(players.length)} profil(s) affiché(s)</h2></div><div className={styles.playerTools}><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Discord, Minecraft, UUID…"/><select value={filter} onChange={(event) => { setFilter(event.target.value as PlayerFilter); setPage(1); }}><option value="all">Tous les profils</option><option value="linked">Minecraft liés</option><option value="unlinked">Non liés</option><option value="voters">Votants</option><option value="buyers">Acheteurs</option></select><select value={sort} onChange={(event) => { setSort(event.target.value as PlayerSort); setPage(1); }}><option value="recent">Plus récents</option><option value="stars">Plus de Stars</option><option value="votes">Plus de votes</option><option value="purchases">Plus d’achats</option></select></div></header>
      <div className={styles.playerTable}><div className={styles.tableHead}><span>JOUEUR</span><span>MINECRAFT</span><span>SOLDE</span><span>VOTES</span><span>ACHATS</span><span>ARRIVÉE</span></div>{visiblePlayers.map((player) => <div className={styles.playerRow} key={player.id}>
        <div className={styles.playerIdentity}><span>{(player.discordName || player.discordUsername || "?").slice(0,1).toUpperCase()}{player.discordAvatarUrl && <img src={player.discordAvatarUrl} alt=""/>}</span><p><b>{player.discordName || player.discordUsername || "Compte historique"}</b><small>{player.discordUsername ? `@${player.discordUsername}` : player.discordId ? `ID ${player.discordId}` : "Discord non associé"}</small></p></div>
        <div className={styles.minecraft}><i className={player.minecraftUuid ? styles.linked : styles.unlinked}/><p><b>{player.minecraftUuid ? <Link href={`/admin/joueurs/?uuid=${player.minecraftUuid}`}>{player.minecraftUsername} ↗</Link> : "Non lié"}</b><small>{player.minecraftUuid ? `${player.minecraftUuid.slice(0,8)}…` : "Commande /link requise"}</small></p></div>
        <strong className={styles.stars}>✦ {number.format(player.balance)}</strong><span>{number.format(player.votes)}<small>{player.lastVote ? date(player.lastVote) : "Aucun vote"}</small></span><span>{number.format(player.purchases)}<small>{number.format(player.starsSpent)} Stars</small></span><span>{date(player.createdAt)}<small>{player.discordJoinedAt ? "Discord rejoint" : "Compte historique"}</small></span>
      </div>)}</div>
      {!visiblePlayers.length && <p className={styles.empty}>Aucun joueur ne correspond à ces filtres.</p>}
      <footer className={styles.pagination}><span>Page {page} sur {pages}</span><div><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button>{Array.from({ length: pages }, (_, index) => index + 1).filter((value) => value === 1 || value === pages || Math.abs(value - page) <= 1).map((value, index, values) => <span key={value}>{index > 0 && value - values[index - 1]! > 1 && <i>…</i>}<button className={value === page ? styles.current : ""} onClick={() => setPage(value)}>{value}</button></span>)}<button disabled={page === pages} onClick={() => setPage((value) => value + 1)}>→</button></div></footer>
    </section>

    <section className={styles.breakdowns}>
      <Breakdown title="Portails de vote" empty="Aucun vote enregistré" rows={data.voteSites.map((site) => ({ name: site.vote_site, value: site.votes, detail: `${site.voters} votant(s) · ${date(site.last_vote)}` }))}/>
      <Breakdown title="Produits populaires" empty="Aucun achat enregistré" rows={data.products.map((product) => ({ name: product.product_id, value: product.purchases, detail: `${product.buyers} acheteur(s) · ${number.format(product.starsSpent)} Stars` }))}/>
      <article className={styles.quickFacts}><small>QUALITÉ DES DONNÉES</small><h2>Couverture des profils</h2><div><span><b>{percent(data.overview.discordAccounts, data.overview.users)}%</b><small>avec Discord</small></span><span><b>{percent(data.overview.minecraftLinked, data.overview.users)}%</b><small>avec Minecraft</small></span><span><b>{percent(data.engagement.voters, data.overview.users)}%</b><small>ont voté</small></span><span><b>{percent(data.engagement.buyers, data.overview.users)}%</b><small>ont acheté</small></span></div></article>
    </section>
  </main>;
}

function Kpi({ code, label, value, detail, tone, raw = false }: { code: string; label: string; value: number | string; detail: string; tone: string; raw?: boolean }) {
  return <article className={`${styles.kpi} ${styles[tone]}`}><header><span>{code}</span><i/></header><small>{label}</small><strong>{raw ? value : number.format(Number(value))}</strong><p>{detail}</p></article>;
}
function Metric({ label, value }: { label: string; value: number }) { return <span><small>{label}</small><b>{number.format(value)}</b></span>; }
function Breakdown({ title, rows, empty }: { title: string; rows: Array<{ name: string; value: number; detail: string }>; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <article className={styles.breakdown}><small>CLASSEMENT</small><h2>{title}</h2>{rows.length ? <div>{rows.slice(0, 6).map((row, index) => <span key={row.name}><i>{String(index + 1).padStart(2,"0")}</i><p><b>{row.name}</b><small>{row.detail}</small></p><em><u style={{ width: `${row.value / max * 100}%` }}/></em><strong>{number.format(row.value)}</strong></span>)}</div> : <p className={styles.empty}>{empty}</p>}</article>;
}
function StateScreen({ label, title, error, onRetry }: { label: string; title: string; error?: boolean; onRetry?: () => void }) {
  return <main className={styles.state}><img src="/cobblestar-logo.png" alt=""/><small>{label}</small><h1>{title}</h1>{error ? <><p>Cette page est privée et utilise la session Discord de ton compte CobbleStar.</p><div><Link href="/compte/">Ouvrir mon compte</Link>{onRetry && <button onClick={onRetry}>Réessayer</button>}</div></> : <span/>}</main>;
}
