"use client";

import Link from "next/link";
import { useState } from "react";

export default function SiteHeader() {
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
          <div><span className="status-dot" /><b>Bêta privée en préparation</b></div>
          <button type="button" onClick={copyServerAddress}><small>IP DU SERVEUR</small><b>{copied ? "Adresse copiée" : "play.cobblestar-mc.fr"}</b><span>{copied ? "✓" : "⧉"}</span></button>
        </div>
        <header className="nav-wrap">
          <Link className="brand" href="/" aria-label="CobbleStar — Accueil">
            <span className="brand-mark"><img src="/cobblestar-logo.png" alt="" /></span>
            <span>Cobble<span>Star</span><small>COBBLEMON • BÊTA</small></span>
          </Link>
          <nav aria-label="Navigation principale">
            <Link className="active" href="/">Accueil</Link>
          </nav>
          <span className="nav-download nav-beta" aria-label="Bêta fermée"><span>Bêta fermée</span><b>✦</b></span>
        </header>
      </div>
    </div>
  );
}
