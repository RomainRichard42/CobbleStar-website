"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VOTE_FAQ } from "../lib/faq";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import FaqSection from "../components/FaqSection";
import FaqStructuredData from "../components/FaqStructuredData";

type VoteAccount = {
  minecraft: { username: string | null; uuid: string | null; linked: boolean };
};

const voteSites = [
  { name: "Top-Serveurs", reward: "250 PokéDollars", interval: "Toutes les 1 h 30", tone: "pink" },
  { name: "Serveurs Minecraft", reward: "1 Clé de vote", interval: "Toutes les 2 heures", tone: "cyan" },
  { name: "Liste Minecraft", reward: "1 Jeton Stellaire", interval: "Toutes les 3 heures", tone: "yellow" },
  { name: "Portail partenaire", reward: "Boîte surprise", interval: "Une fois par jour", tone: "violet" },
];

export default function VotePage() {
  const [account, setAccount] = useState<VoteAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Signed out");
        return response.json() as Promise<{ user: VoteAccount }>;
      })
      .then((data) => { if (active) setAccount(data.user); })
      .catch(() => { if (active) setAccount(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const username = account?.minecraft.username || null;
  const linked = account?.minecraft.linked ?? false;

  return <main className="vote-board-page">
    <SiteHeader />
    <section className="vote-board-hero" id="contenu">
      <div className="vote-board-intro">
        <span className="kicker">MISSION COMMUNAUTAIRE · SAISON 01</span>
        <h1>Un vote.<br /><em>Un serveur plus visible.</em></h1>
        <p>Quelques secondes pour soutenir CobbleStar. Ta récompense sera attribuée automatiquement au compte Minecraft lié.</p>
      </div>
      <div className="vote-board-art" aria-hidden="true"><img src="/cobblemon-team.webp" alt="" /><span>OBJECTIF COMMUN</span><b>04</b></div>
    </section>

    <section className="vote-board-layout" aria-labelledby="vote-dashboard-title">
      <aside className="vote-board-sidebar">
        <div className="vote-launch-note" role="status"><span>RÉCOMPENSES AUTOMATIQUES</span><div><b>Lie ton compte une seule fois.</b><p>Chaque vote validé est associé à ton joueur et livré directement en jeu.</p></div></div>

        <div className="vote-profile-card">
        <div className="vote-profile-main">
          <span className="vote-profile-avatar" aria-hidden={!username}>{username ? <img src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/96`} alt={`Tête Minecraft de ${username}`} /> : "?"}</span>
          <div><span className="kicker">TON PROFIL DE VOTE</span><h2 id="vote-dashboard-title">{loading ? "Vérification du compte…" : username || "Connecte ton joueur"}</h2><p>{loading ? "Nous vérifions ta session CobbleStar." : linked ? "Ton UUID Minecraft est confirmé. Les récompenses seront livrées au bon compte." : account ? "Ton compte existe, mais ton identité Minecraft doit encore être confirmée en jeu." : "Connecte-toi pour recevoir automatiquement tes récompenses."}</p></div>
        </div>
        <div className={`vote-profile-state ${linked ? "is-ready" : "is-required"}`}><small>ÉTAT DU COMPTE</small><b>{loading ? "Chargement" : linked ? "Prêt à voter" : "Action requise"}</b><span>{linked ? "✓ Minecraft lié" : "Liaison nécessaire"}</span></div>
        {!loading && !account && <Link className="vote-profile-action" href="/compte/">Continuer avec Discord <span>→</span></Link>}
        {!loading && account && !linked && <button className="vote-profile-action" type="button" onClick={() => setLinkOpen(true)}>Lier mon compte Minecraft <span>→</span></button>}
        {!loading && linked && <span className="vote-profile-confirmed">✓ Aucune autre vérification ne sera demandée</span>}
        </div>

        <section className="vote-how" aria-labelledby="vote-how-title"><div><span className="kicker">MODE D’EMPLOI</span><h2 id="vote-how-title">Trois gestes.<br /><em>Zéro attente en jeu.</em></h2></div><ol><li><span>1</span><div><b>Lie ton compte</b><p>La commande <code>/link</code> confirme ton UUID.</p></div></li><li><span>2</span><div><b>Choisis un portail</b><p>Chaque partenaire possède son propre délai.</p></div></li><li><span>3</span><div><b>Récupère ta récompense</b><p>Le serveur la livre au bon joueur.</p></div></li></ol></section>
      </aside>

      <div className="vote-board-main">
        <div className="vote-section-heading"><div><span className="kicker">TABLEAU DES PORTAILS</span><h2>Ta tournée de vote.</h2></div><p>Chaque plateforme possède son propre délai et sa propre récompense. Tu peux les parcourir dans l’ordre que tu préfères.</p></div>

        <div className="vote-board-status"><span>PORTAILS DE VOTE</span><b><i /> 4 plateformes</b><small>LIVRAISON EN JEU</small></div>

        <div className="vote-sites vote-sites-readable">
        {voteSites.map((site, index) => <article className={`vote-site tone-${site.tone}`} key={site.name}>
          <header><span>PORTAIL {String(index + 1).padStart(2, "0")}</span><small>RÉCOMPENSE AUTO</small></header>
          <div className="vote-site-copy"><h3>{site.name}</h3><p><span>Récompense</span><b>{site.reward}</b></p><p><span>Prochain vote</span><b>{site.interval}</b></p></div>
          <div className="vote-action"><span>Vote comptabilisé automatiquement</span></div>
        </article>)}
        </div>
      </div>
    </section>
    <FaqSection title="Questions sur le vote CobbleStar" id="faq-vote" items={VOTE_FAQ} />
    <FaqStructuredData faqItems={VOTE_FAQ} pageUrl="/vote/" />
    <MinecraftLinkGate open={linkOpen} onClose={() => setLinkOpen(false)} context="vote" />
    <SiteFooter />
  </main>;
}
