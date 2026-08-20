"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VOTE_FAQ } from "../lib/faq";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";
import FaqSection from "../components/FaqSection";
import FaqStructuredData from "../components/FaqStructuredData";

type VoteAccount = {
  minecraft: { username: string | null; uuid: string | null; linked: boolean };
};

const voteSites = [
  { name: "Top-Serveurs", reward: "250 PokéDollars", interval: "Toutes les 1 h 30", icon: "✦", tone: "pink" },
  { name: "Serveurs Minecraft", reward: "1 Clé de vote", interval: "Toutes les 2 heures", icon: "◉", tone: "cyan" },
  { name: "Liste Minecraft", reward: "1 Jeton Stellaire", interval: "Toutes les 3 heures", icon: "⌁", tone: "yellow" },
  { name: "Portail partenaire", reward: "Boîte surprise", interval: "Une fois par jour", icon: "◇", tone: "violet" },
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

  return <main>
    <PageHero eyebrow="SOUTENIR COBBLESTAR" title="Vote pour le serveur." accent="Reçois tes récompenses en jeu." description="Chaque vote aidera CobbleStar à se faire connaître. Une fois ton compte Minecraft lié, les récompenses seront attribuées automatiquement au bon joueur." badge="APERÇU BÊTA" />
    <section className="content-section vote-content" aria-labelledby="vote-dashboard-title">
      <div className="vote-launch-note" role="status"><span>EN PRÉPARATION</span><div><b>La page est ouverte, les votes arrivent prochainement.</b><p>Tu peux déjà vérifier ton compte et découvrir le fonctionnement. Aucun faux vote ne sera comptabilisé pendant cette phase.</p></div></div>

      <div className="vote-profile-card">
        <div className="vote-profile-main">
          <span className="vote-profile-avatar" aria-hidden={!username}>{username ? <img src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/96`} alt={`Tête Minecraft de ${username}`} /> : "?"}</span>
          <div><span className="kicker">TON PROFIL DE VOTE</span><h2 id="vote-dashboard-title">{loading ? "Vérification du compte…" : username || "Connecte ton joueur"}</h2><p>{loading ? "Nous vérifions ta session CobbleStar." : linked ? "Ton UUID Minecraft est confirmé. Les récompenses pourront être livrées au bon compte." : account ? "Ton compte existe, mais ton identité Minecraft doit encore être confirmée en jeu." : "Connecte-toi pour préparer la réception automatique de tes futures récompenses."}</p></div>
        </div>
        <div className={`vote-profile-state ${linked ? "is-ready" : "is-required"}`}><small>ÉTAT DU COMPTE</small><b>{loading ? "Chargement" : linked ? "Prêt à voter" : "Action requise"}</b><span>{linked ? "✓ Minecraft lié" : "Liaison nécessaire"}</span></div>
        {!loading && !account && <Link className="vote-profile-action" href="/compte/">Se connecter ou créer un compte <span>→</span></Link>}
        {!loading && account && !linked && <button className="vote-profile-action" type="button" onClick={() => setLinkOpen(true)}>Lier mon compte Minecraft <span>→</span></button>}
        {!loading && linked && <span className="vote-profile-confirmed">✓ Aucune autre vérification ne sera demandée</span>}
      </div>

      <div className="vote-section-heading"><div><span className="kicker">PORTAILS DE VOTE</span><h2>Quatre votes.<br /><em>Quatre récompenses.</em></h2></div><p>Chaque portail possède son propre délai. Dès que l’intégration sera terminée, le bouton t’enverra voter puis le serveur validera automatiquement ta participation.</p></div>

      <div className="vote-sites vote-sites-readable">
        {voteSites.map((site, index) => <article className={`vote-site tone-${site.tone}`} key={site.name}>
          <div className="vote-site-icon" aria-hidden="true">{site.icon}</div>
          <div className="vote-site-copy"><small>PORTAIL {String(index + 1).padStart(2, "0")}</small><h3>{site.name}</h3><p><span>Récompense</span><b>{site.reward}</b></p><p><span>Délai</span><b>{site.interval}</b></p></div>
          <div className="vote-action"><span>Intégration en cours</span><button type="button" disabled aria-label={`${site.name} bientôt disponible`}>Bientôt</button></div>
        </article>)}
      </div>

      <section className="vote-how" aria-labelledby="vote-how-title"><div><span className="kicker">FONCTIONNEMENT</span><h2 id="vote-how-title">Simple pour toi.<br /><em>Automatique en jeu.</em></h2></div><ol><li><span>1</span><div><b>Connecte ton compte</b><p>Une seule commande <code>/link</code> confirme ton UUID.</p></div></li><li><span>2</span><div><b>Vote sur un portail</b><p>Le site de vote valide ta participation.</p></div></li><li><span>3</span><div><b>Reçois ta récompense</b><p>Le serveur la remet directement à ton joueur.</p></div></li></ol></section>
    </section>
    <FaqSection title="Questions sur le vote CobbleStar" id="faq-vote" items={VOTE_FAQ} />
    <FaqStructuredData faqItems={VOTE_FAQ} pageUrl="/vote/" />
    <MinecraftLinkGate open={linkOpen} onClose={() => setLinkOpen(false)} context="vote" />
    <SiteFooter />
  </main>;
}
