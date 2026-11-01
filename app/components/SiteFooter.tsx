"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Public destinations use Astro and require document navigation. */
import { DISCORD_INVITE } from '../lib/community-links';




export default function SiteFooter() {




  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <a className="brand" href="/"><span className="brand-mark"><img src="/media/cobblestar-logo-128.webp" alt="" width="54" height="54" loading="lazy" /></span><span>Cobble<span>Star</span></span></a>
          <p>Une aventure Cobblemon francophone pensée pour explorer, collectionner et progresser ensemble.</p>
          <p className="footer-server">Ouverture à venir</p>
        </div>
        <nav className="footer-column" aria-label="Découvrir CobbleStar"><b>Découvrir</b><a href="/actualites/">Actualités</a><a href="/roadmap/">Roadmap</a><a href="/wiki/">Wiki du serveur</a><a href="/vote/">Soutenir le serveur</a></nav>
        <nav className="footer-column" aria-label="Espace joueur"><b>Espace joueur</b><a href="/compte/">Mon compte</a><a href="/boutique/">Boutique</a><a href="/rejoindre/">Préparer l’ouverture</a></nav>
        <nav className="footer-column" aria-label="Informations"><b>Informations</b><a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">Discord CobbleStar ↗</a><a href="/confidentialite/">Confidentialité</a><a href="mailto:contact@cobblestar-mc.fr">Nous contacter</a><a href="https://cobblemon.com/en" target="_blank" rel="noreferrer">Découvrir Cobblemon ↗</a></nav>
        <div className="footer-bottom"><span>© 2026 CobbleStar · Projet communautaire indépendant</span><span>Pokémon et Minecraft appartiennent à leurs propriétaires respectifs.</span></div>
      </div>
    </footer>
  );
}
