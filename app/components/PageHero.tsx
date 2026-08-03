import SiteHeader from "./SiteHeader";

export default function PageHero({ eyebrow, title, accent, description, badge }: { eyebrow: string; title: string; accent?: string; description: string; badge?: string }) {
  return (
    <div className="inner-shell">
      <SiteHeader />
      <section className="page-hero">
        <div>
          <span className="kicker">{eyebrow}</span>
          <h1>{title}{accent && <><br /><em>{accent}</em></>}</h1>
          <p>{description}</p>
        </div>
        <div className="page-orb" aria-hidden="true"><img src="/cobblestar-logo.png" alt="" />{badge && <span>{badge}</span>}</div>
      </section>
    </div>
  );
}
