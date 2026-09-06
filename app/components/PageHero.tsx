import SiteHeader from "./SiteHeader";

type PageHeroVariant = "default" | "shop" | "vote" | "account" | "legal";

const variantMeta: Record<PageHeroVariant, { index: string; label: string }> = {
  default: { index: "00", label: "CARNET COBBLESTAR" },
  shop: { index: "04", label: "OBSERVATOIRE DES STARS" },
  vote: { index: "03", label: "BALISE COMMUNAUTAIRE" },
  account: { index: "05", label: "PASSEPORT DE DRESSEUR" },
  legal: { index: "06", label: "MANIFESTE DE CONFIANCE" },
};

export default function PageHero({ eyebrow, title, accent, description, badge, image = "/cobblemon-lakeside.webp", variant = "default" }: { eyebrow: string; title: string; accent?: string; description: string; badge?: string; image?: string; variant?: PageHeroVariant }) {
  const meta = variantMeta[variant];
  return (
    <div className={`inner-shell page-shell-${variant}`}>
      <SiteHeader />
      <section className={`page-hero page-hero-${variant}`} id="contenu">
        <div className="page-hero-copy">
          <div className="page-hero-kicker"><span className="kicker">{eyebrow}</span><i /><small>COBBLESTAR · SAISON 01</small></div>
          <h1>{title}{accent && <><br /><em>{accent}</em></>}</h1>
          <p>{description}</p>
          <div className="page-hero-note"><span><i /> Serveur francophone</span><span>Minecraft 1.21.1</span></div>
        </div>
        <div className="page-hero-visual" aria-hidden="true">
          <span className="page-hero-index">{meta.index}</span>
          <div className="page-hero-photo"><img src={image} alt="" /></div>
          <div className="page-orb"><img src="/cobblestar-logo.png" alt="" /></div>
          {badge && <span className="page-hero-badge">{badge}</span>}
          <small className="page-hero-legend">{meta.label}</small>
        </div>
      </section>
    </div>
  );
}
