"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Public destinations use Astro and require document navigation. */

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";


const accountsEnabled = true;
type HeaderAccount = {
  discord?: { username?: string | null; globalName?: string | null; avatarUrl?: string | null } | null;
  minecraft?: { username?: string | null };
};

export default function SiteHeader() {

  const [account, setAccount] = useState<HeaderAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const pathname = usePathname();
  const minecraftUsername = account?.minecraft?.username || null;
  const accountName = minecraftUsername || account?.discord?.globalName || account?.discord?.username || null;
  const accountAvatar = account?.discord?.avatarUrl || (minecraftUsername ? `https://mc-heads.net/avatar/${encodeURIComponent(minecraftUsername)}/64` : null);


  useEffect(() => {
    let active = true;
    let signedIn = false;
    async function loadWallet() {
      if (!signedIn) return;
      try {
        const response = await fetch("/api/wallet", { credentials: "include" });
        if (!response.ok) throw new Error("Wallet unavailable");
        const data = await response.json() as { balance: number };
        if (active) setBalance(data.balance);
      } catch {
        // Une indisponibilité temporaire du portefeuille ne déconnecte pas le joueur.
      }
    }
    async function loadAccount() {
      try {
        const response = await fetch("/api/me", { credentials: "include" });
        if (!response.ok) throw new Error("Signed out");
        const data = await response.json() as { user: HeaderAccount };
        signedIn = true;
        if (active) setAccount(data.user);
        await loadWallet();
      } catch {
        signedIn = false;
        if (active) { setAccount(null); setBalance(0); }
      }
    }
    void loadAccount();
    const interval = window.setInterval(loadWallet, 5000);
    window.addEventListener("cobblestar:account-changed", loadAccount);
    window.addEventListener("cobblestar:wallet-changed", loadWallet);
    window.addEventListener("focus", loadWallet);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("cobblestar:account-changed", loadAccount);
      window.removeEventListener("cobblestar:wallet-changed", loadWallet);
      window.removeEventListener("focus", loadWallet);
    };
  }, []);


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
            <a href="/#aventures">Découvrir</a>
            <a href="/#premiers-pas">Premiers pas</a>
            <a className={pathname.startsWith("/roadmap") ? "active" : undefined} aria-current={pathname.startsWith("/roadmap") ? "page" : undefined} href="/roadmap/">Roadmap</a>
            <a className={pathname.startsWith("/wiki") ? "active" : undefined} aria-current={pathname.startsWith("/wiki") ? "page" : undefined} href="/wiki/">Wiki</a>
          </nav>
          <details className="mobile-menu">
            <summary aria-label="Ouvrir le menu"><span /><span /><span /><small>Menu</small></summary>
            <div>
              <a className={pathname === "/" ? "active" : undefined} aria-current={pathname === "/" ? "page" : undefined} href="/">Accueil</a>
              <a className={pathname.startsWith("/actualites") ? "active" : undefined} aria-current={pathname.startsWith("/actualites") ? "page" : undefined} href="/actualites/">Actualités</a>
              <a href="/#aventures">Découvrir</a>
              <a href="/#premiers-pas">Premiers pas</a>
              <a className={pathname.startsWith("/roadmap") ? "active" : undefined} aria-current={pathname.startsWith("/roadmap") ? "page" : undefined} href="/roadmap/">Roadmap</a>
              <a className={pathname.startsWith("/wiki") ? "active" : undefined} aria-current={pathname.startsWith("/wiki") ? "page" : undefined} href="/wiki/">Wiki</a>
              <a href="https://discord.gg/Sd387Ky4M">Rejoindre Discord ↗</a>
            </div>
          </details>
          <a className="nav-download" href="https://discord.gg/Sd387Ky4M" aria-label="Rejoindre le Discord CobbleStar">
            <span>Discord</span><b aria-hidden="true">↗</b>
          </a>
          {accountsEnabled && account && <a className="nav-stars" href="/boutique/" aria-label={`Solde : ${balance.toLocaleString("fr-FR")} Stars`}><span aria-hidden="true">✦</span><b>{balance.toLocaleString("fr-FR")}</b><small>Stars</small></a>}
          {accountsEnabled && <a className={`nav-account${pathname.startsWith("/compte") ? " active" : ""}`} href="/compte/" aria-label={account ? `Compte de ${accountName || "Dresseur"}` : "Connexion Discord à CobbleStar"}>
            <span className="nav-account-copy"><small>{account ? "MON COMPTE" : "ESPACE JOUEUR"}</small><strong>{accountName || "Connexion Discord"}</strong></span>
            <span className="nav-account-avatar"><b aria-hidden="true">{accountName ? accountName.slice(0, 1).toUpperCase() : "♙"}</b>{accountAvatar && <img src={accountAvatar} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</span>
          </a>}
        </header>
      </div>
    </div>
  );
}
