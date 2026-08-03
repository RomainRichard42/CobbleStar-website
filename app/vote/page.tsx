"use client";

import { useState } from "react";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";

const voteSites = [
  { name: "Top-Serveurs", reward: "2 Jetons Stellaire", cooldown: "Disponible", icon: "✦", tone: "pink" },
  { name: "ServeursMinecraft", reward: "1 Clé de vote", cooldown: "Disponible", icon: "◉", tone: "cyan" },
  { name: "Liste Minecraft", reward: "500 PokéDollars", cooldown: "1 h 24 min", icon: "⌁", tone: "yellow" },
  { name: "Annuaire partenaire", reward: "Boîte surprise", cooldown: "3 h 08 min", icon: "◇", tone: "violet" },
];

export default function VotePage() {
  const [nickname, setNickname] = useState("");
  const [saved, setSaved] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  return <main><PageHero eyebrow="SOUTENIR COBBLESTAR" title="Un vote pour nous." accent="Une récompense pour toi." description="Fais connaître le serveur et retrouve automatiquement tes récompenses lors de ta prochaine connexion." badge="PROCHAINEMENT" />
    <section className="content-section vote-content">
      <div className="opening-note"><span>SERVICE EN PRÉPARATION</span><p>Au premier vote, ton compte CobbleStar devra être lié en jeu avec la commande temporaire affichée.</p></div>
      <div className="vote-account-gate"><span>♙</span><div><small>COMPTE COBBLESTAR REQUIS</small><b>Connecte-toi avant de voter</b><p>Une seule liaison Minecraft suffit ensuite pour les votes et la boutique.</p></div><a href="/compte">Créer mon compte →</a></div>
      <div className="vote-dashboard">
        <div className="player-panel"><div className="player-avatar">?</div><div><span className="kicker">PROFIL JOUEUR</span><h2>{saved && nickname ? nickname : "Ton pseudo Minecraft"}</h2><p>Ton UUID permettra au serveur d’attribuer chaque récompense au bon personnage.</p></div><form onSubmit={(event) => { event.preventDefault(); if (nickname.trim()) setSaved(true); }}><input aria-label="Pseudo Minecraft" onChange={(e) => { setNickname(e.target.value); setSaved(false); }} placeholder="Saisis ton pseudo" value={nickname} /><button type="submit">{saved ? "Profil affiché ✓" : "Afficher mon profil"}</button></form><small className="local-note">Cette saisie reste uniquement dans ton navigateur.</small></div>
        <div className="daily-progress"><div className="progress-head"><div><span className="kicker">OBJECTIF DU JOUR</span><h3>2 votes sur 4</h3></div><strong>50%</strong></div><div className="progress-track"><span /></div><div className="progress-rewards"><span className="done">✓ 1 vote<br /><small>250 PokéDollars</small></span><span className="done">✓ 2 votes<br /><small>1 Jeton Stellaire</small></span><span>3 votes<br /><small>Boîte surprise</small></span><span>4 votes<br /><small>Clé de vote</small></span></div></div>
      </div>
      <div className="vote-sites">{voteSites.map((site, index) => <article className={`vote-site tone-${site.tone}`} key={site.name}><div className="vote-site-icon">{site.icon}</div><div><small>SITE DE VOTE #{index + 1}</small><h3>{site.name}</h3><p>Récompense : <b>{site.reward}</b></p></div><div className="vote-action"><span className={site.cooldown === "Disponible" ? "available" : ""}>{site.cooldown}</span><button disabled={site.cooldown !== "Disponible"} onClick={() => setLinkOpen(true)}>{site.cooldown === "Disponible" ? "Voter" : "En attente"}</button></div></article>)}</div>
      <div className="streak-card"><div><span className="kicker">SÉRIE HEBDOMADAIRE</span><h2>Reviens chaque jour.</h2><p>Sept jours de soutien débloquent la récompense spéciale de la semaine.</p></div><div className="streak-days">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span className={index < 3 ? "checked" : ""} key={`${day}-${index}`}>{index < 3 ? "✓" : day}</span>)}</div><div className="streak-prize">★<small>Aura hebdomadaire</small></div></div>
    </section><MinecraftLinkGate open={linkOpen} onClose={() => setLinkOpen(false)} context="vote" /><SiteFooter /></main>;
}
