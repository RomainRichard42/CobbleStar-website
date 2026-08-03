import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer>
      <Link className="brand" href="/"><img src="/cobblestar-logo.png" alt="" /><span>Cobble<span>Star</span></span></Link>
      <p>La bêta CobbleStar se prépare en coulisses.</p>
      <div><a href="https://github.com/RomainRichard42/CobbleStar-launcher">GitHub</a></div>
      <small>© 2026 CobbleStar. Projet communautaire indépendant.</small>
    </footer>
  );
}
