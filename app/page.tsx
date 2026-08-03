"use client";

import { useState } from "react";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";

const SERVER_ADDRESS = "23.109.138.130:25574";

export default function Home() {
  const [copied, setCopied] = useState(false);
  async function copyAddress() {
    setCopied(true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(SERVER_ADDRESS);
    } catch {
      const input = document.createElement("textarea");
      input.value = SERVER_ADDRESS;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <main>
    <div className="site-shell landing-shell">
      <SiteHeader />
      <section className="hero landing-hero">
        <div className="hero-copy landing-copy">
          <div className="season-label"><span>SAISON 01</span><i /> L’AVENTURE EST OUVERTE</div>
          <h1>Entre dans<br />l’univers<br /><em>CobbleStar.</em></h1>
          <p>Explore un monde pensé pour Cobblemon, compose ton équipe et écris ton aventure aux côtés de toute la communauté.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/telecharger">Télécharger le launcher <span>↘</span></a>
            <a className="button button-quiet" href="/serveur">Découvrir le serveur <span>→</span></a>
          </div>
          <button className="hero-server-line" onClick={copyAddress} type="button"><span className="status-dot" /><small>REJOINDRE LE SERVEUR</small><b>{copied ? "Adresse copiée" : SERVER_ADDRESS}</b><i>{copied ? "✓" : "Copier l’IP"}</i></button>
        </div>
        <div className="hero-art landing-art" aria-label="Mascotte CobbleStar">
          <span className="hero-watermark">COBBLE<br />STAR</span><div className="hero-planet" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="logo-glow" /><img src="/cobblestar-logo.png" alt="Mascotte CobbleStar" />
          <span className="scene-spark scene-spark-one">✦</span><span className="scene-spark scene-spark-two">✦</span><span className="scene-spark scene-spark-three">✦</span>
          <div className="world-ticket"><small>DESTINATION COBBLESTAR</small><b>Le monde t’attend</b><span>Fabric • Cobblemon • 1.21.1</span></div>
        </div>
      </section>
      <div className="landing-marquee" aria-hidden="true"><div className="landing-marquee-track"><span>EXPLORATION</span><i>◆</i><span>COLLECTION</span><i>◆</i><span>COMMUNAUTÉ</span><i>◆</i><span>COBBLEMON</span><i>◆</i><span>AVENTURE</span><i>◆</i><span>EXPLORATION</span><i>◆</i><span>COLLECTION</span><i>◆</i><span>COMMUNAUTÉ</span><i>◆</i><span>COBBLEMON</span><i>◆</i><span>AVENTURE</span><i>◆</i></div></div>
    </div>

    <section className="adventure-intro">
      <div className="adventure-heading"><span className="kicker">TON HISTOIRE, TON ÉQUIPE</span><h2>Plus qu’un serveur.<br /><em>Un monde à habiter.</em></h2></div>
      <div className="adventure-cards">
        <a href="/serveur" className="adventure-card adventure-card-world"><span>01</span><div className="adventure-photo"><img src="/cobblemon-desert.webp" alt="Un Cobblemon dans un biome désertique de Minecraft" /><i>EXPLORATION</i></div><small>UN MONDE VIVANT</small><b>Explore librement</b><p>Des biomes à parcourir, des créatures à rencontrer et toujours quelque chose à découvrir.</p><em>Voir le serveur →</em></a>
        <a href="/actualites" className="adventure-card adventure-card-story"><span>02</span><div className="adventure-photo"><img src="/cobblemon-ocean.webp" alt="Un Cobblemon sous-marin près d’une épave" /><i>RENCONTRES</i></div><small>L’AVENTURE CONTINUE</small><b>Suis le projet</b><p>Événements, nouveautés et avancées du serveur racontés au même endroit.</p><em>Voir les actualités →</em></a>
        <a href="/vote" className="adventure-card adventure-card-team"><span>03</span><div className="team-art"><img src="/cobblemon-team.webp" alt="Une équipe de Cobblemon" /></div><small>UNE COMMUNAUTÉ</small><b>Grandis avec nous</b><p>Vote, joue, échange et participe à la construction de l’univers CobbleStar.</p><em>Nous soutenir →</em></a>
      </div>
    </section>

    <section className="cobblemon-showcase">
      <div className="showcase-copy"><span className="kicker">COBBLEMON EN JEU</span><h2>Chaque biome cache<br /><em>une nouvelle rencontre.</em></h2><p>Capture, exploration, élevage et vie communautaire se mélangent naturellement au monde de Minecraft.</p><a href="/serveur">Découvrir l’expérience <span>→</span></a></div>
      <div className="showcase-mosaic">
        <figure className="showcase-main"><img src="/cobblemon-ocean.webp" alt="Exploration sous-marine dans Cobblemon" /><figcaption><span>01</span><b>Sous la surface</b><small>Les rencontres ne s’arrêtent pas à la terre ferme.</small></figcaption></figure>
        <figure><img src="/cobblemon-lakeside.webp" alt="Cobblemon au bord d’un lac Minecraft" /><figcaption><span>02</span><b>Au détour d’un biome</b></figcaption></figure>
        <figure><img src="/cobblemon-berries.webp" alt="Culture de baies colorées dans Cobblemon" /><figcaption><span>03</span><b>Fais grandir ton aventure</b></figcaption></figure>
      </div>
      <a className="showcase-source" href="https://cobblemon.com/en" target="_blank" rel="noreferrer">Images officielles Cobblemon ↗</a>
    </section>

    <section className="launcher-story">
      <div className="launcher-story-copy"><span className="kicker">LE POINT DE DÉPART</span><h2>Un launcher.<br /><em>Zéro préparation.</em></h2><p>Tu te connectes, CobbleStar installe la bonne version de Fabric, synchronise le modpack et lance le jeu. Rien d’autre à configurer.</p><a href="/telecharger">Découvrir le launcher <span>→</span></a></div>
      <div className="launcher-window"><div className="window-top"><i /><i /><i /><small>COBBLESTAR LAUNCHER</small></div><div className="window-content"><img src="/cobblestar-logo.png" alt="" /><div><small>PRÊT À JOUER</small><strong>CobbleStar 1.21.1</strong><span><i /></span><button>JOUER</button></div></div><div className="window-foot"><span>Fabric</span><span>Modpack synchronisé</span><span>Serveur en ligne</span></div></div>
    </section>

    <section className="world-section home-portals">
      <div className="section-head"><div><span className="kicker">AUTOUR DU SERVEUR</span><h2>Tout CobbleStar,<br /><em>au même endroit.</em></h2></div><p>Actualités, téléchargement et récompenses : chaque service rejoint progressivement l’univers du serveur.</p></div>
      <div className="portal-grid"><a className="portal-card portal-server" href="/serveur"><span>01</span><b>Découvrir le serveur</b><p>Le monde, le gameplay et toutes les informations pour nous rejoindre.</p><i>Explorer →</i></a><a className="portal-card portal-news" href="/actualites"><span>02</span><b>Suivre le projet</b><p>Mises à jour, événements et avancées du développement.</p><i>Lire les actualités →</i></a><a className="portal-card portal-shop" href="/boutique"><small>APERÇU DISPONIBLE</small><span>03</span><b>Les Stars</b><p>Associe ton compte, découvre les packs et prépare ton futur portefeuille en jeu.</p><i>Découvrir les Stars →</i></a><a className="portal-card portal-vote" href="/vote"><small>PROCHAINEMENT</small><span>04</span><b>Vote & récompenses</b><p>Soutiens CobbleStar et retrouve tes cadeaux sur le serveur.</p><i>Voir les récompenses →</i></a></div>
    </section>
    <section className="home-cta"><div><span className="kicker">REJOINDRE COBBLESTAR</span><h2>Ta première capture<br /><em>commence ici.</em></h2></div><a className="button button-primary" href="/telecharger">Télécharger le launcher <span>↘</span></a></section>
    <SiteFooter />
  </main>;
}
