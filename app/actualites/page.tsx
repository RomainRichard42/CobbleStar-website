"use client";

import Link from "next/link";
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

  const articles = useMemo(() => [...news.articles].filter((article) => article.published)
    .sort((left, right) => Number(right.featured) - Number(left.featured) || right.publishedAt.localeCompare(left.publishedAt)), [news]);
  const featured = articles.find((article) => article.featured) ?? articles[0];

  return <main className={styles.page}>
    <SiteHeader />
    <section className={styles.intro}>
      <div><span>JOURNAL DU SERVEUR</span><h1>Ce qui change<br/><em>sur CobbleStar.</em></h1></div>
      <p>{news.subtitle}<small>Ces annonces sont aussi visibles dans le launcher et en jeu.</small></p>
    </section>

    {featured && <button className={`${styles.featured} ${styles[featured.accent]}`} onClick={() => setSelected(featured)}>
      <img src={featured.image} alt=""/><span className={styles.cover}/>
      <div className={styles.featuredCopy}><small>{featured.category} · {formatDate(featured.publishedAt)}</small><h2>{featured.title}</h2><p>{featured.excerpt}</p><b>Lire l’annonce <i>→</i></b></div>
      <strong>À LA UNE</strong>
    </button>}

    <section className={styles.feed}>
      <header><div><span>DERNIÈRES PUBLICATIONS</span><h2>Le fil CobbleStar</h2></div><Link href="/actualites/admin/">Écrire une annonce</Link></header>
      <div className={styles.grid}>{articles.filter((article) => article.id !== featured?.id).map((article) => <button key={article.id} className={`${styles.card} ${styles[article.accent]}`} onClick={() => setSelected(article)}>
        <div className={styles.cardImage}><img src={article.image} alt=""/><span>{article.category}</span></div>
        <div><time>{formatDate(article.publishedAt)}</time><h3>{article.title}</h3><p>{article.excerpt}</p><b>Lire <i>→</i></b></div>
      </button>)}</div>
    </section>

    {selected && <div className={styles.readerBackdrop} onMouseDown={() => setSelected(null)}>
      <article className={`${styles.reader} ${styles[selected.accent]}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className={styles.close} onClick={() => setSelected(null)} aria-label="Fermer">×</button>
        <div className={styles.readerImage}><img src={selected.image} alt=""/><span/></div>
        <div className={styles.readerBody}><small>{selected.category} · {formatDate(selected.publishedAt)}</small><h2>{selected.title}</h2><p className={styles.lead}>{selected.excerpt}</p>{selected.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      </article>
    </div>}
    <SiteFooter />
  </main>;
}
