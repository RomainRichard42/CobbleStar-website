"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  ["Serveur", "/serveur"],
  ["Actualités", "/actualites"],
  ["Boutique", "/boutique"],
  ["Vote", "/vote"],
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

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
          <div><span className="status-dot" /><b>Serveur en ligne</b></div>
          <button type="button" onClick={copyServerAddress}><small>IP DU SERVEUR</small><b>{copied ? "Adresse copiée" : "play.cobblestar-mc.fr"}</b><span>{copied ? "✓" : "⧉"}</span></button>
        </div>
        <header className="nav-wrap">
          <Link className="brand" href="/" aria-label="CobbleStar — Accueil">
            <span className="brand-mark"><img src="/cobblestar-logo.png" alt="" /></span>
            <span>Cobble<span>Star</span><small>COBBLEMON SERVER</small></span>
          </Link>
          <nav aria-label="Navigation principale">
            <Link className={pathname === "/" ? "active" : ""} href="/">Accueil</Link>
            {navigation.map(([label, href]) => <Link className={pathname === href ? "active" : ""} href={href} key={href}>{label}</Link>)}
          </nav>
          <details className="mobile-menu">
            <summary><span /><span /><span /><small>Menu</small></summary>
            <div><Link className={pathname === "/" ? "active" : ""} href="/">Accueil</Link>{navigation.map(([label, href]) => <Link className={pathname === href ? "active" : ""} href={href} key={href}>{label}</Link>)}<Link className={pathname === "/compte" ? "active" : ""} href="/compte">Mon compte</Link><Link href="/telecharger">Télécharger</Link></div>
          </details>
          <Link className={`nav-account ${pathname === "/compte" ? "active" : ""}`} href="/compte" aria-label="Mon compte CobbleStar"><span>Compte</span><b>♙</b></Link>
          <Link className="nav-download" href="/telecharger"><span>Jouer</span><b>↘</b></Link>
        </header>
      </div>
    </div>
  );
}
