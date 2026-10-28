"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Public destinations use Astro and require document navigation. */

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";


import AccountLink from './AccountLink';
import MobileMenu from './MobileMenu';
import DesktopNavigation from './DesktopNavigation';
import { observePlayer, starsLabel } from '../lib/player-session';
import type { AvatarAccount } from '../lib/account-avatar';

const accountsEnabled = true;
type HeaderAccount = AvatarAccount;

export default function SiteHeader() {

  const [account, setAccount] = useState<HeaderAccount | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const pathname = usePathname();
  const minecraftUsername = account?.minecraft?.username || null;
  const accountName = minecraftUsername || account?.discord?.globalName || account?.discord?.username || null;
  const accountAvatar = account?.discord?.avatarUrl || (minecraftUsername ? `https://mc-heads.net/avatar/${encodeURIComponent(minecraftUsername)}/64` : null);


  useEffect(() => observePlayer((user, stars) => { setAccount(user); setBalance(stars); }), []);


  const isAdmin=/^\/(admin|wiki\/admin|actualites\/admin)(\/|$)/.test(pathname);

  if (!isAdmin) return <header className="astral-header site-header"><a className="astral-skip" href="#contenu">Aller au contenu</a><a className="astral-brand" href="/" aria-label="CobbleStar, accueil"><img src="/media/cobblestar-logo-128.webp" alt="" width="56" height="56"/><span>COBBLE<b>STAR</b></span></a><DesktopNavigation pathname={pathname}/><div className="astral-header-actions"><AccountLink account={account} balance={balance}/><a className="astral-shop" href="/boutique/"><img src="/astral/assets/stars-button-v3.webp" alt="" width="44" height="34"/>Boutique</a><MobileMenu account={account} balance={balance} pathname={pathname}/></div></header>;
  return (
    <div className="nav-frame">
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      <div className="nav-stack">
        <div className="nav-utility">
          <div><b><span className="nav-status-full">Ouverture à venir</span><span className="nav-status-short">Ouverture à venir</span></b></div>
          <span>Prépare ton arrivée sur CobbleStar</span>
        </div>
        <header className="nav-wrap">
          <a className="brand" href="/" aria-label="CobbleStar — Accueil">
            <span className="brand-mark"><img src="/media/cobblestar-logo-128.webp" alt="" width="54" height="54" /></span>
            <span>Cobble<span>Star</span><small>ASTERIA × NÉBÉLIA</small></span>
          </a>
          <nav aria-label="Navigation principale">
            <a className={pathname === "/" ? "active" : undefined} aria-current={pathname === "/" ? "page" : undefined} href="/">Accueil</a>
            <a className={pathname.startsWith("/actualites") ? "active" : undefined} aria-current={pathname.startsWith("/actualites") ? "page" : undefined} href="/actualites/">Actualités</a>
            <a className={pathname.startsWith("/boutique") ? "nav-shop active" : "nav-shop"} aria-current={pathname.startsWith("/boutique") ? "page" : undefined} href="/boutique/">Boutique</a>
            <a href="/#premiers-pas">Premiers pas</a>
            <a className={pathname.startsWith("/roadmap") ? "active" : undefined} aria-current={pathname.startsWith("/roadmap") ? "page" : undefined} href="/roadmap/">Roadmap</a>
            <a className={pathname.startsWith("/wiki") ? "active" : undefined} aria-current={pathname.startsWith("/wiki") ? "page" : undefined} href="/wiki/">Wiki</a>
          </nav>
          <details className="mobile-menu">
            <summary aria-label="Ouvrir le menu"><span /><span /><span /><small>Menu</small></summary>
            <div>
              <a className={pathname === "/" ? "active" : undefined} aria-current={pathname === "/" ? "page" : undefined} href="/">Accueil</a>
              <a className={pathname.startsWith("/actualites") ? "active" : undefined} aria-current={pathname.startsWith("/actualites") ? "page" : undefined} href="/actualites/">Actualités</a>
              <a className={pathname.startsWith("/boutique") ? "nav-shop active" : "nav-shop"} aria-current={pathname.startsWith("/boutique") ? "page" : undefined} href="/boutique/">Boutique</a>
              <a href="/#premiers-pas">Premiers pas</a>
              <a className={pathname.startsWith("/roadmap") ? "active" : undefined} aria-current={pathname.startsWith("/roadmap") ? "page" : undefined} href="/roadmap/">Roadmap</a>
              <a className={pathname.startsWith("/wiki") ? "active" : undefined} aria-current={pathname.startsWith("/wiki") ? "page" : undefined} href="/wiki/">Wiki</a>
              <a href="https://discord.gg/Sd387Ky4M">Rejoindre Discord ↗</a>
            </div>
          </details>
          <a className="nav-download" href="https://discord.gg/Sd387Ky4M" aria-label="Rejoindre le Discord CobbleStar">
            <span>Discord</span><b aria-hidden="true">↗</b>
          </a>
          {accountsEnabled && account && <a className="nav-stars" href="/boutique/" aria-label={`Solde : ${starsLabel(balance)} Stars`}><span aria-hidden="true">✦</span><b>{starsLabel(balance)}</b><small>Stars</small></a>}
          {accountsEnabled && <a className={`nav-account${pathname.startsWith("/compte") ? " active" : ""}`} href="/compte/" aria-label={account ? `Compte de ${accountName || "Dresseur"}` : "Connexion Discord à CobbleStar"}>
            <span className="nav-account-copy"><small>{account ? "MON COMPTE" : "ESPACE JOUEUR"}</small><strong>{accountName || "Connexion Discord"}</strong></span>
            <span className="nav-account-avatar"><b aria-hidden="true">{accountName ? accountName.slice(0, 1).toUpperCase() : "♙"}</b>{accountAvatar && <img src={accountAvatar} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</span>
          </a>}
        </header>
      </div>
    </div>
  );
}
