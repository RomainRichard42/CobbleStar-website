"use client";

import Link from "next/link";
import { useDownloadUrl } from "./DownloadLauncher";

export default function SiteFooter() {
  const downloadUrl = useDownloadUrl();
  return (
    <footer>
      <Link className="brand" href="/"><img src="/cobblestar-logo.png" alt="" /><span>Cobble<span>Star</span></span></Link>
      <p>La bêta CobbleStar se prépare en coulisses.</p>
      <div><Link href="/boutique/">Boutique</Link><Link href="/vote/">Votes</Link><Link href="/compte/">Compte</Link><a href={downloadUrl} download>Télécharger</a></div>
      <small>© 2026 CobbleStar. Projet communautaire indépendant.</small>
    </footer>
  );
}
