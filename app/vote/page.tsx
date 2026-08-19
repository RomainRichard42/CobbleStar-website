"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";
import styles from "./vote.module.css";

type VoteSite = {
  id: string; name: string; icon: string; accent: "pink" | "cyan" | "yellow" | "violet";
  intervalMinutes: number; rewardMin: number; rewardMax: number; enabled: boolean;
  url: string | null; availableAt: string | null; available: boolean;
};
type RankingEntry = { rank: number; username: string; votes: number; keysWon: number };
type VotePlayer = { username: string | null; linked: boolean; votes: number; keysWon: number; rank: number | null };
type VoteData = { resetAt: string; sites: VoteSite[]; leaderboard: RankingEntry[]; player: VotePlayer | null };

const placeholderSites: VoteSite[] = [
  { id: "portail_1", name: "Premier portail", icon: "✦", accent: "pink", intervalMinutes: 90, rewardMin: 1, rewardMax: 2, enabled: false, url: null, availableAt: null, available: false },
  { id: "portail_2", name: "Deuxième portail", icon: "◉", accent: "cyan", intervalMinutes: 120, rewardMin: 1, rewardMax: 2, enabled: false, url: null, availableAt: null, available: false },
  { id: "portail_3", name: "Troisième portail", icon: "⌁", accent: "yellow", intervalMinutes: 180, rewardMin: 1, rewardMax: 2, enabled: false, url: null, availableAt: null, available: false },
];

function nextMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours} h ${rest}` : `${hours} h`;
}

function remaining(availableAt: string | null, now: number) {
  if (!availableAt) return null;
  const seconds = Math.max(0, Math.ceil((new Date(availableAt).getTime() - now) / 1000));
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), secs = seconds % 60;
  return hours ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${minutes} min ${String(secs).padStart(2, "0")}`;
}

export default function VotePage() {
  const [data, setData] = useState<VoteData>({ resetAt: nextMonth(), sites: placeholderSites, leaderboard: [], player: null });
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/votes", { credentials: "include", cache: "no-store" });
        if (!response.ok) throw new Error("Votes unavailable");
        const payload = await response.json() as VoteData;
        if (active) setData(payload);
      } catch {
        // La page reste lisible pendant que l'API ou les annuaires sont configurés.
      } finally { if (active) setLoading(false); }
    }
    void load();
    const refresh = window.setInterval(load, 30_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("focus", load);
    return () => { active = false; window.clearInterval(refresh); window.clearInterval(clock); window.removeEventListener("focus", load); };
  }, []);

  const player = data.player;
  const availableCount = useMemo(() => now ? data.sites.filter(site => site.enabled && !remaining(site.availableAt, now)).length : 0, [data.sites, now]);
  const resetLabel = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(data.resetAt));

  return <main>
    <PageHero eyebrow="SOUTENIR COBBLESTAR" title="Vote. Progresse." accent="Recommence." description="Vote sur les sites partenaires et reçois automatiquement 1 à 2 clés Vote en jeu. Chaque participation aide de nouveaux joueurs à découvrir CobbleStar." badge="1–2 CLÉS PAR VOTE" />

    <section className={`content-section ${styles.content}`} aria-labelledby="vote-title">
      <div className={styles.monthBar}>
        <span>SAISON DE VOTE</span>
        <div><b>Classement mensuel</b><small>Remise à zéro le {resetLabel} à 00:00 UTC</small></div>
        <strong>{availableCount} <small>vote{availableCount > 1 ? "s" : ""} disponible{availableCount > 1 ? "s" : ""}</small></strong>
      </div>

      <div className={styles.dashboard}>
        <article className={styles.playerCard}>
          <span className={styles.avatar}>{player?.username ? <img src={`https://mc-heads.net/avatar/${encodeURIComponent(player.username)}/96`} alt={`Tête Minecraft de ${player.username}`} /> : "?"}</span>
          <div className={styles.playerCopy}><small>TON MOIS EN COURS</small><h2 id="vote-title">{loading ? "Chargement…" : player?.username || "Ton profil de vote"}</h2><p>{player?.linked ? "Ton compte est prêt : les clés seront livrées automatiquement en jeu après validation du vote." : "Connecte et lie ton compte Minecraft pour recevoir tes clés et apparaître dans le classement."}</p></div>
          <div className={styles.stats}>
            <span><small>VOTES</small><b>{player?.votes ?? 0}</b></span>
            <span><small>CLÉS GAGNÉES</small><b>{player?.keysWon ?? 0}</b></span>
            <span><small>CLASSEMENT</small><b>{player?.rank ? `#${player.rank}` : "—"}</b></span>
          </div>
          {!loading && !player && <Link className={styles.accountAction} href="/compte/">SE CONNECTER POUR VOTER <span>→</span></Link>}
          {!loading && player && !player.linked && <button className={styles.accountAction} onClick={() => setLinkOpen(true)} type="button">LIER MON COMPTE MINECRAFT <span>→</span></button>}
          {player?.linked && <div className={styles.ready}><i /> COMPTE LIÉ · RÉCOMPENSES AUTOMATIQUES</div>}
        </article>

        <article className={styles.rewardCard}>
          <div className={styles.keyVisual}><i /><span>V</span><b>✦</b></div>
          <div><small>À CHAQUE VOTE VALIDÉ</small><strong>1 <em>ou</em> 2</strong><h3>CLÉS VOTE</h3><p>La quantité est tirée au sort lors de la validation. Les clés attendent ton retour si tu es hors ligne.</p></div>
          <div className={styles.odds}><span><b>1 clé</b><i><em /></i><small>50 %</small></span><span><b>2 clés</b><i><em /></i><small>50 %</small></span></div>
        </article>
      </div>

      <div className={styles.heading}>
        <div><span className="kicker">SITES PARTENAIRES</span><h2>Choisis un portail.<br /><em>Récupère tes clés.</em></h2></div>
        <p>Chaque portail possède son propre délai. Tu peux voter sur plusieurs sites le même jour : leurs compteurs sont indépendants.</p>
      </div>

      <div className={styles.sites}>
        {data.sites.map((site, index) => {
          const countdown = now ? remaining(site.availableAt, now) : null;
          const ready = site.enabled && !countdown;
          return <article className={`${styles.site} ${styles[site.accent]}`} key={site.id}>
            <div className={styles.siteTop}><span className={styles.siteIcon}>{site.icon}</span><small>PORTAIL {String(index + 1).padStart(2, "0")}</small><i className={ready ? styles.statusReady : styles.statusWaiting}>{ready ? "DISPONIBLE" : site.enabled ? "EN ATTENTE" : "NON CONFIGURÉ"}</i></div>
            <h3>{site.name}</h3>
            <div className={styles.siteMeta}><span><small>RÉCOMPENSE</small><b>1–2 clés Vote</b></span><span><small>NOUVEAU VOTE</small><b>Toutes les {duration(site.intervalMinutes)}</b></span></div>
            {site.enabled && countdown && <div className={styles.timer}><span>PROCHAIN VOTE</span><b>{countdown}</b><i><em style={{ width: `${Math.max(2, Math.min(100, 100 - (new Date(site.availableAt!).getTime() - now) / (site.intervalMinutes * 600)))}%` }} /></i></div>}
            {!site.enabled ? <button className={styles.disabledButton} disabled type="button">ANNUAIRE À CONFIGURER</button>
              : !player ? <Link className={styles.voteButton} href="/compte/">SE CONNECTER <span>→</span></Link>
              : !player.linked ? <button className={styles.voteButton} onClick={() => setLinkOpen(true)} type="button">LIER MON COMPTE <span>→</span></button>
              : countdown ? <button className={styles.disabledButton} disabled type="button">REVIENS DANS {countdown}</button>
              : <a className={styles.voteButton} href={site.url ?? undefined} target="_blank" rel="noreferrer">VOTER MAINTENANT <span>↗</span></a>}
          </article>;
        })}
      </div>

      <div className={styles.validationNote}><span>✓</span><div><b>Aucun bouton « récupérer »</b><p>L’annuaire confirme ton vote au serveur. Tes clés sont ajoutées automatiquement, même si tu te reconnectes plus tard.</p></div></div>

      <section className={styles.ranking} aria-labelledby="ranking-title">
        <div className={styles.rankingIntro}><span className="kicker">CLASSEMENT DU MOIS</span><h2 id="ranking-title">Les joueurs qui<br /><em>font rayonner le serveur.</em></h2><p>Le classement repart à zéro chaque premier jour du mois. Tes récompenses déjà gagnées restent évidemment acquises.</p><div><small>PROCHAINE REMISE À ZÉRO</small><b>{resetLabel}</b></div></div>
        <div className={styles.rankingTable}>
          <header><span>RANG</span><span>JOUEUR</span><span>VOTES</span><span>CLÉS</span></header>
          {data.leaderboard.length ? data.leaderboard.slice(0, 10).map(entry => <div className={`${styles.rankRow} ${entry.username === player?.username ? styles.myRank : ""}`} key={`${entry.rank}-${entry.username}`}>
            <strong className={entry.rank <= 3 ? styles.podium : ""}>{entry.rank <= 3 ? ["♛", "◆", "◇"][entry.rank - 1] : `#${entry.rank}`}</strong>
            <span className={styles.rankPlayer}><i><img src={`https://mc-heads.net/avatar/${encodeURIComponent(entry.username)}/40`} alt="" /></i><b>{entry.username}</b>{entry.username === player?.username && <small>TOI</small>}</span>
            <b>{entry.votes}</b><span>{entry.keysWon} <small>clés</small></span>
          </div>) : <div className={styles.emptyRanking}><span>✦</span><b>Le classement attend son premier vote</b><p>Le premier joueur validé prendra immédiatement la tête.</p></div>}
          {player?.rank && player.rank > 10 && <div className={`${styles.rankRow} ${styles.myRank} ${styles.pinnedRank}`}><strong>#{player.rank}</strong><span className={styles.rankPlayer}><i><img src={`https://mc-heads.net/avatar/${encodeURIComponent(player.username ?? "")}/40`} alt="" /></i><b>{player.username}</b><small>TOI</small></span><b>{player.votes}</b><span>{player.keysWon} <small>clés</small></span></div>}
        </div>
      </section>

      <section className={styles.how}><span><b>01</b><i>Choisis un portail</i><small>Chaque site a son propre délai.</small></span><em>→</em><span><b>02</b><i>Vote avec ton pseudo</i><small>Le lien le renseigne automatiquement.</small></span><em>→</em><span><b>03</b><i>Reçois 1 à 2 clés</i><small>La livraison est automatique en jeu.</small></span></section>
    </section>
    <MinecraftLinkGate open={linkOpen} onClose={() => setLinkOpen(false)} context="vote" />
    <SiteFooter />
  </main>;
}
