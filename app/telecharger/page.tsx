import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";

export default function DownloadPage() {
  return <main><PageHero eyebrow="LAUNCHER OFFICIEL" title="Un clic." accent="Tout est prêt." description="Le launcher installe Fabric, récupère le modpack CobbleStar et le maintient automatiquement à jour." badge="WINDOWS" />
    <section className="content-section download-layout"><div className="download-panel"><span className="kicker">DERNIÈRE VERSION</span><h2>CobbleStar Launcher</h2><p>Pour Windows 10/11 64 bits. Un compte Microsoft possédant Minecraft Java Edition est nécessaire.</p><a className="button button-primary" href="https://github.com/RomainRichard42/CobbleStar-launcher/releases/latest"><span className="download-icon">↓</span>Télécharger depuis GitHub</a><small>Le téléchargement ouvre la dernière version publiée.</small></div><ol className="steps"><li><span>1</span><div><b>Installe le launcher</b><p>Télécharge puis ouvre l’installateur CobbleStar.</p></div></li><li><span>2</span><div><b>Connecte Microsoft</b><p>La connexion officielle vérifie que tu possèdes Minecraft.</p></div></li><li><span>3</span><div><b>Clique sur Jouer</b><p>Le modpack et ses mises à jour sont gérés automatiquement.</p></div></li></ol></section><SiteFooter /></main>;
}
