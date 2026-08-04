"use client";

import { useState } from "react";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { LAUNCHER_RELEASES_URL, useLatestRelease } from "./components/DownloadLauncher";

const SERVER_ADDRESS = "play.cobblestar-mc.fr";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const release = useLatestRelease();
  const downloadUrl = release?.downloadUrl || LAUNCHER_RELEASES_URL;
  const downloadLabel = release === undefined ? "Chargement…" : release ? "Télécharger pour Windows" : "Télécharger sur GitHub";
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
          <div className="season-label"><span>BÊTA PRIVÉE</span><i /> LE MONDE EST EN PRÉPARATION</div>
          <h1>Une nouvelle<br />aventure<br /><em>se prépare.</em></h1>
          <p>CobbleStar construit actuellement son expérience Cobblemon. Le serveur ouvre progressivement à un premier groupe de testeurs avant son lancement public.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={copyAddress} type="button">{copied ? "Adresse copiée" : "Copier l’adresse de bêta"} <span>{copied ? "✓" : "⧉"}</span></button>
            <span className="button button-quiet beta-locked">Accès réservé aux testeurs <span>✦</span></span>
          </div>
          <button className="hero-server-line" onClick={copyAddress} type="button"><span className="status-dot" /><small>ADRESSE DE LA BÊTA</small><b>{copied ? "Adresse copiée" : SERVER_ADDRESS}</b><i>{copied ? "✓" : "Copier l’IP"}</i></button>
        </div>
        <div className="hero-art landing-art" aria-label="Mascotte CobbleStar">
          <span className="hero-watermark">COBBLE<br />STAR</span><div className="hero-planet" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="logo-glow" /><img src="/cobblestar-logo.png" alt="Mascotte CobbleStar" />
          <span className="scene-spark scene-spark-one">✦</span><span className="scene-spark scene-spark-two">✦</span><span className="scene-spark scene-spark-three">✦</span>
          <div className="world-ticket"><small>BÊTA COBBLESTAR</small><b>Ouverture progressive</b><span>Fabric • Cobblemon • 1.21.1</span></div>
        </div>
      </section>
      <div className="landing-marquee" aria-hidden="true"><div className="landing-marquee-track"><span>BÊTA PRIVÉE</span><i>◆</i><span>EXPLORATION</span><i>◆</i><span>COLLECTION</span><i>◆</i><span>COBBLEMON</span><i>◆</i><span>EN DÉVELOPPEMENT</span><i>◆</i><span>BÊTA PRIVÉE</span><i>◆</i><span>EXPLORATION</span><i>◆</i><span>COLLECTION</span><i>◆</i><span>COBBLEMON</span><i>◆</i><span>EN DÉVELOPPEMENT</span><i>◆</i></div></div>
    </div>

    <section className="adventure-intro">
      <div className="adventure-heading"><span className="kicker">EN COURS DE CRÉATION</span><h2>La bêta prend forme.<br /><em>Étape après étape.</em></h2></div>
      <div className="adventure-cards">
        <article className="adventure-card adventure-card-world"><span>01</span><div className="adventure-photo"><img src="/cobblemon-desert.webp" alt="Un Cobblemon dans un biome désertique de Minecraft" /><i>MONDE</i></div><small>GÉNÉRATION EN COURS</small><b>Un univers à éprouver</b><p>Les biomes, rencontres et premières boucles de progression sont actuellement testés et équilibrés.</p><em>Bêta technique</em></article>
        <article className="adventure-card adventure-card-story"><span>02</span><div className="adventure-photo"><img src="/cobblemon-ocean.webp" alt="Un Cobblemon sous-marin près d’une épave" /><i>GAMEPLAY</i></div><small>AJUSTEMENTS CONTINUS</small><b>Une aventure cohérente</b><p>Le modpack et le launcher évoluent ensemble pour offrir une expérience simple dès la connexion.</p><em>Développement actif</em></article>
        <article className="adventure-card adventure-card-team"><span>03</span><div className="team-art"><img src="/cobblemon-team.webp" alt="Une équipe de Cobblemon" /></div><small>ACCÈS LIMITÉ</small><b>Les premiers testeurs</b><p>La bêta reste volontairement fermée pendant que nous consolidons le serveur avant son ouverture.</p><em>Ouverture progressive</em></article>
      </div>
    </section>

    <section className="cobblemon-showcase">
      <div className="showcase-copy"><span className="kicker">APERÇU DE LA BÊTA</span><h2>Chaque biome cache<br /><em>une nouvelle rencontre.</em></h2><p>Capture, exploration, élevage et vie communautaire sont actuellement assemblés et testés dans l’univers CobbleStar.</p><span className="beta-inline">Accès public prochainement <b>✦</b></span></div>
      <div className="showcase-mosaic">
        <figure className="showcase-main"><img src="/cobblemon-ocean.webp" alt="Exploration sous-marine dans Cobblemon" /><figcaption><span>01</span><b>Sous la surface</b><small>Les rencontres ne s’arrêtent pas à la terre ferme.</small></figcaption></figure>
        <figure><img src="/cobblemon-lakeside.webp" alt="Cobblemon au bord d’un lac Minecraft" /><figcaption><span>02</span><b>Au détour d’un biome</b></figcaption></figure>
        <figure><img src="/cobblemon-berries.webp" alt="Culture de baies colorées dans Cobblemon" /><figcaption><span>03</span><b>Fais grandir ton aventure</b></figcaption></figure>
      </div>
      <a className="showcase-source" href="https://cobblemon.com/en" target="_blank" rel="noreferrer">Images officielles Cobblemon ↗</a>
    </section>

    <section className="launcher-story">
      <div className="launcher-story-copy"><span className="kicker">TÉLÉCHARGEMENT</span><h2>Un launcher.<br /><em>Zéro préparation.</em></h2><p>Le launcher CobbleStar installe Fabric, synchronise le modpack et prépare automatiquement la bonne version du jeu. Connecte-toi ensuite avec l’adresse de la bêta pour rejoindre le serveur.</p><a className="beta-inline" href={LAUNCHER_RELEASES_URL} target="_blank" rel="noreferrer">Toutes les versions sur GitHub <b>↗</b></a></div>
      <div className="launcher-window"><div className="window-top"><i /><i /><i /><small>COBBLESTAR LAUNCHER • WINDOWS</small></div><div className="window-content"><img src="/cobblestar-logo.png" alt="" /><div><small>DERNIÈRE VERSION</small><strong>{release ? `v${release.version}` : "CobbleStar Launcher"}</strong><span><i /></span><a className="window-cta" href={downloadUrl} download={release?.downloadUrl ? true : undefined} target={release?.downloadUrl ? undefined : "_blank"} rel={release?.downloadUrl ? undefined : "noreferrer"}>{downloadLabel}</a></div></div><div className="window-foot"><span>Windows 10/11 64 bits</span><span>{release?.sizeMb ? `${release.sizeMb} Mo` : "~100 Mo"}</span><span>Mises à jour auto</span></div></div>
    </section>

    <section className="home-cta"><div><span className="kicker">BÊTA PRIVÉE</span><h2>Le monde se prépare.<br /><em>Rendez-vous bientôt.</em></h2><p>Les inscriptions, la boutique et les votes resteront fermés jusqu’à leur validation. Le launcher, lui, est déjà disponible.</p></div><button className="button button-primary" onClick={copyAddress} type="button">{copied ? "Adresse copiée" : SERVER_ADDRESS} <span>{copied ? "✓" : "⧉"}</span></button></section>
    <SiteFooter />
  </main>;
}
