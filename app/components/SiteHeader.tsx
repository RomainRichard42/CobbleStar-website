"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDownloadUrl } from "./DownloadLauncher";

const accountsEnabled = true;
type HeaderAccount = { minecraft?: { username?: string | null } };

export default function SiteHeader() {
  const [copied, setCopied] = useState(false);
  const [account, setAccount] = useState<HeaderAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const pathname = usePathname();
  const username = account?.minecraft?.username || null;
  const downloadUrl = useDownloadUrl();

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

  async function copyServerAddress() {
    const address = "play.cobblestar-mc.fr";
    setCopied(true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(address);
    } catch {
      const input = document.createElement("textarea");
      input.value = address;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="nav-frame">
      <div className="nav-stack">
        <div className="nav-utility">
          <div><span className="status-dot" /><b>Bêta privée en préparation</b></div>
          <button type="button" onClick={copyServerAddress}><small>IP DU SERVEUR</small><b>{copied ? "Adresse copiée" : "play.cobblestar-mc.fr"}</b><span>{copied ? "✓" : "⧉"}</span></button>
        </div>
        <header className="nav-wrap">
          <Link className="brand" href="/" aria-label="CobbleStar — Accueil">
            <span className="brand-mark"><img src="/cobblestar-logo.png" alt="" /></span>
            <span>Cobble<span>Star</span><small>COBBLEMON • BÊTA</small></span>
          </Link>
          <nav aria-label="Navigation principale">
            <Link className={pathname === "/" ? "active" : undefined} href="/">Accueil</Link>
            <Link className={pathname.startsWith("/boutique") ? "active" : undefined} href="/boutique/">Boutique</Link>
            <Link className={pathname.startsWith("/vote") ? "active" : undefined} href="/vote/">Votes</Link>
            <Link className={pathname.startsWith("/wiki") ? "active" : undefined} href="/wiki/">Wiki</Link>
          </nav>
          <details className="mobile-menu">
            <summary aria-label="Ouvrir le menu"><span /><span /><span /><small>Menu</small></summary>
            <div>
              <Link className={pathname === "/" ? "active" : undefined} href="/">Accueil</Link>
              <Link className={pathname.startsWith("/boutique") ? "active" : undefined} href="/boutique/">Boutique</Link>
              <Link className={pathname.startsWith("/vote") ? "active" : undefined} href="/vote/">Votes</Link>
              <Link className={pathname.startsWith("/wiki") ? "active" : undefined} href="/wiki/">Wiki</Link>
            </div>
          </details>
          <a className="nav-download" href={downloadUrl} download aria-label="Télécharger le launcher CobbleStar">
            <span>Télécharger</span><b aria-hidden="true">⭳</b>
          </a>
          {accountsEnabled && username && <Link className="nav-stars" href="/boutique/" aria-label={`Solde : ${balance.toLocaleString("fr-FR")} Stars`}><span aria-hidden="true">✦</span><b>{balance.toLocaleString("fr-FR")}</b><small>Stars</small></Link>}
          {accountsEnabled && <Link className={`nav-account${pathname.startsWith("/compte") ? " active" : ""}`} href="/compte/" aria-label={username ? `Compte de ${username}` : "Connexion au compte CobbleStar"}>
            <span className="nav-account-copy"><small>{username ? "MON COMPTE" : "ESPACE JOUEUR"}</small><strong>{username || "Se connecter"}</strong></span>
            <span className="nav-account-avatar">{username ? <img src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/64`} alt={`Tête Minecraft de ${username}`} /> : <b aria-hidden="true">♙</b>}</span>
          </Link>}
        </header>
      </div>
    </div>
  );
}
