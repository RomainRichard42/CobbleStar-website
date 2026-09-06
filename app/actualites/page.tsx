"use client";

import { useEffect, useMemo, useState } from "react";
import fallback from "../../news.default.json";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import type { NewsArticle, NewsDocument, NewsEnvelope } from "./news-types";
import styles from "./actualites.module.css";

const initial = fallback as NewsDocument;
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));

export default function ActualitesPage() {
  const [news, setNews] = useState(initial);
  const [selected, setSelected] = useState<NewsArticle | null>(null);

  useEffect(() => { void fetch("/api/news", { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error("Actualités indisponibles");
    return response.json() as Promise<NewsEnvelope>;
  }).then((result) => setNews(result.content)).catch(() => undefined); }, []);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [selected]);

  const articles = useMemo(() => [...news.articles].filter((article) => article.published)
    .sort((left, right) => Number(right.featured) - Number(left.featured) || right.publishedAt.localeCompare(left.publishedAt)), [news]);
  const featured = articles.find((article) => article.featured) ?? articles[0];

  return <main className={styles.page}>
    <SiteHeader />
    <section className={styles.intro} id="contenu">
      <div><span>JOURNAL DU SERVEUR</span><h1>Les nouvelles<br/><em>de l’aventure.</em></h1></div>
      <p>{news.subtitle}<small>{articles.length} publication{articles.length > 1 ? "s" : ""} · Aussi disponible dans le launcher</small></p>
    </section>

    {featured && <button type="button" className={`${styles.featured} ${styles[featured.accent]}`} onClick={() => setSelected(featured)}>
      <img src={featured.image} alt={featured.title}/><span className={styles.cover}/>
      <div className={styles.featuredCopy}><small>{featured.category} · {formatDate(featured.publishedAt)}</small><h2>{featured.title}</h2><p>{featured.excerpt}</p><b>Lire l’annonce <i>→</i></b></div>
      <strong>À LA UNE</strong>
    </button>}

    <section className={styles.feed}>
      <header><div><span>DERNIÈRES PUBLICATIONS</span><h2>Tout ce qu’il faut savoir</h2></div><small>Mises à jour · Événements · Guides</small></header>
      <div className={styles.grid}>{articles.filter((article) => article.id !== featured?.id).map((article) => <button type="button" key={article.id} className={`${styles.card} ${styles[article.accent]}`} onClick={() => setSelected(article)}>
        <div className={styles.cardImage}><img src={article.image} alt={article.title}/><span>{article.category}</span></div>
        <div><time>{formatDate(article.publishedAt)}</time><h3>{article.title}</h3><p>{article.excerpt}</p><b>Lire <i>→</i></b></div>
      </button>)}</div>
    </section>

    {selected && <div className={styles.readerBackdrop} onMouseDown={() => setSelected(null)}>
      <article className={`${styles.reader} ${styles[selected.accent]}`} role="dialog" aria-modal="true" aria-labelledby="article-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className={styles.close} onClick={() => setSelected(null)} aria-label="Fermer l’article">×</button>
        <div className={styles.readerImage}><img src={selected.image} alt={selected.title}/><span/></div>
        <div className={styles.readerBody}><small>{selected.category} · {formatDate(selected.publishedAt)}</small><h2 id="article-title">{selected.title}</h2><p className={styles.lead}>{selected.excerpt}</p>{selected.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </article>
    </div>}
    <SiteFooter />
  </main>;
}
