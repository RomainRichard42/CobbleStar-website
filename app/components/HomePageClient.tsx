"use client";

import Link from "next/link";
import { useState } from "react";
import SiteHeader from "./SiteHeader";
import { FALLBACK_SIZE_MB, FALLBACK_VERSION, LAUNCHER_RELEASES_URL, useDownloadUrl, useLatestRelease } from "./DownloadLauncher";

const SERVER_ADDRESS = "play.cobblestar-mc.fr";

export default function HomePageClient() {
  const [copied, setCopied] = useState(false);
  const release = useLatestRelease();
  const downloadUrl = useDownloadUrl();
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
      <section className="hero landing-hero" id="contenu">
        <div className="hero-copy landing-copy">
          <div className="season-label"><span>SAISON 01</span><i /> L’AVENTURE COMMENCE</div>
          <h1>Ton aventure<br /><em>prend vie.</em></h1>
          <p>Explore un monde Cobblemon francophone pensé comme une vraie aventure : progression guidée, collection, rencontres et vie communautaire.</p>
          <div className="hero-actions">
            <a className="button button-primary" href={downloadUrl} download>Installer le launcher <span>↓</span></a>
            <Link className="button button-quiet" href="/wiki/">Découvrir l’aventure <span>→</span></Link>
          </div>
          <button className="hero-server-line" onClick={copyAddress} type="button"><span className="status-dot" /><small>ADRESSE DU SERVEUR</small><b>{copied ? "Adresse copiée" : SERVER_ADDRESS}</b><i>{copied ? "✓" : "Copier l’IP"}</i></button>
        </div>
        <div className="hero-art landing-art" aria-label="Mascotte CobbleStar">
          <span className="hero-watermark">COBBLE<br />STAR</span><div className="hero-planet" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="logo-glow" /><img src="/cobblestar-logo.png" alt="Dragonite, mascotte de CobbleStar, posé sur un nuage" />
          <span className="scene-spark scene-spark-one">✦</span><span className="scene-spark scene-spark-two">✦</span><span className="scene-spark scene-spark-three">✦</span>
          <div className="world-ticket"><small>COBBLESTAR FR</small><b>Serveur francophone</b><span>Fabric • Cobblemon • 1.21.1</span></div>
        </div>
      </section>
      <div className="landing-marquee" aria-hidden="true"><div className="landing-marquee-track"><span>SAISON 01</span><i>◆</i><span>EXPLORATION</span><i>◆</i><span>COLLECTION</span><i>◆</i><span>COBBLEMON</span><i>◆</i><span>COMMUNAUTÉ</span><i>◆</i><span>SAISON 01</span><i>◆</i><span>EXPLORATION</span><i>◆</i><span>COLLECTION</span><i>◆</i><span>COBBLEMON</span><i>◆</i><span>COMMUNAUTÉ</span><i>◆</i></div></div>
    </div>

    <nav className="home-entry-grid" aria-label="Découvrir CobbleStar">
      <Link className="home-entry-card" href="/wiki/"><span>01</span><div><b>Bien commencer</b><small>Les repères essentiels pour rejoindre l’aventure.</small></div><i>→</i></Link>
      <Link className="home-entry-card" href="/actualites/"><span>02</span><div><b>Suivre le développement</b><small>Les nouveautés du serveur, du modpack et du launcher.</small></div><i>→</i></Link>
      <Link className="home-entry-card" href="/compte/"><span>03</span><div><b>Ouvrir ton compte</b><small>Lie ton joueur une fois pour tous les services.</small></div><i>→</i></Link>
    </nav>

    <section className="adventure-intro">
      <div className="adventure-heading"><span className="kicker">CHOISIS TON PARCOURS</span><h2>L’aventure se vit.<br /><em>À ton rythme.</em></h2></div>
      <div className="adventure-cards">
        <article className="adventure-card adventure-card-world"><span>01</span><div className="adventure-photo"><img src="/cobblemon-desert.webp" alt="Un Cobblemon dans un biome désertique de Minecraft" /><i>MONDE</i></div><small>EXPLORATION LIBRE</small><b>Un univers à parcourir</b><p>Traverse les biomes, rencontre leurs Pokémon et construis ta progression sans itinéraire imposé.</p><em>Mondes persistants</em></article>
        <article className="adventure-card adventure-card-story"><span>02</span><div className="adventure-photo"><img src="/cobblemon-ocean.webp" alt="Un Cobblemon sous-marin près d’une épave" /><i>GAMEPLAY</i></div><small>AJUSTEMENTS CONTINUS</small><b>Une aventure cohérente</b><p>Le modpack et le launcher évoluent ensemble pour offrir une expérience simple dès la connexion.</p><em>Développement actif</em></article>
        <article className="adventure-card adventure-card-team"><span>03</span><div className="team-art"><img src="/cobblemon-team.webp" alt="Une équipe de Cobblemon" /></div><small>COMMUNAUTÉ</small><b>Jouer ensemble</b><p>Forme ton équipe, retrouve les autres dresseurs et participe aux activités coopératives du serveur.</p><em>Multijoueur</em></article>
      </div>
    </section>

    <section className="cobblemon-showcase">
      <div className="showcase-copy"><span className="kicker">MONDE COBBLESTAR</span><h2>Chaque biome cache<br /><em>une nouvelle rencontre.</em></h2><p>Capture, exploration, élevage et vie communautaire composent une aventure qui continue à chaque connexion.</p><Link className="beta-inline" href="/wiki/">Découvrir les guides <b>→</b></Link></div>
      <div className="showcase-mosaic">
        <figure className="showcase-main"><img src="/cobblemon-ocean.webp" alt="Exploration sous-marine dans Cobblemon" /><figcaption><span>01</span><b>Sous la surface</b><small>Les rencontres ne s’arrêtent pas à la terre ferme.</small></figcaption></figure>
        <figure><img src="/cobblemon-lakeside.webp" alt="Cobblemon au bord d’un lac Minecraft" /><figcaption><span>02</span><b>Au détour d’un biome</b></figcaption></figure>
        <figure><img src="/cobblemon-berries.webp" alt="Culture de baies colorées dans Cobblemon" /><figcaption><span>03</span><b>Fais grandir ton aventure</b></figcaption></figure>
      </div>
      <a className="showcase-source" href="https://cobblemon.com/en" target="_blank" rel="noreferrer">Images officielles Cobblemon ↗</a>
    </section>

    <section className="launcher-story">
      <div className="launcher-story-copy"><span className="kicker">TÉLÉCHARGEMENT</span><h2>Un launcher.<br /><em>Zéro préparation.</em></h2><p>Le launcher CobbleStar installe Fabric, synchronise le modpack et prépare automatiquement la bonne version du jeu. Connecte-toi ensuite à l’adresse du serveur pour commencer.</p><a className="beta-inline" href={LAUNCHER_RELEASES_URL} target="_blank" rel="noreferrer">Toutes les versions sur GitHub <b>↗</b></a></div>
      <div className="launcher-window"><div className="window-top"><i /><i /><i /><small>COBBLESTAR LAUNCHER • WINDOWS</small></div><div className="window-content"><img src="/cobblestar-logo.png" alt="" /><div><small>DERNIÈRE VERSION</small><strong>v{release?.version || FALLBACK_VERSION}</strong><span><i /></span><a className="window-cta" href={downloadUrl} download>Télécharger pour Windows</a></div></div><div className="window-foot"><span>Windows 10/11 64 bits</span><span>{release?.sizeMb || FALLBACK_SIZE_MB} Mo</span><span>Mises à jour auto</span></div></div>
    </section>

    <section className="home-cta"><div><span className="kicker">PRÊT POUR LE DÉPART ?</span><h2>Un clic.<br /><em>Le launcher s’occupe du reste.</em></h2><p>Fabric, le modpack et les mises à jour sont installés automatiquement. Tu gardes simplement ton compte Microsoft habituel.</p></div><a className="button button-primary" href={downloadUrl} download>Installer CobbleStar <span>↓</span></a></section>
  </main>;
}
