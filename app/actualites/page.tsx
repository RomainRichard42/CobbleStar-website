"use client";

import { useState } from "react";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";

const articles = [
  { category: "Launcher", date: "2 août 2026", title: "Le launcher CobbleStar prend vie", excerpt: "Installation automatique, connexion Microsoft officielle et mises à jour intégrées : découvre le cœur du projet.", icon: "✦", tone: "pink", featured: true, read: "4 min" },
  { category: "Serveur", date: "Bientôt", title: "Préparation du monde CobbleStar", excerpt: "Biomes, exploration et équilibre du modpack : voici comment l’aventure prend forme.", icon: "◉", tone: "cyan", read: "3 min" },
  { category: "Développement", date: "En cours", title: "Une boutique reliée au jeu", excerpt: "Le futur mod Fabric remettra les récompenses validées directement au bon joueur.", icon: "⌁", tone: "yellow", read: "5 min" },
  { category: "Communauté", date: "À venir", title: "Des récompenses pour les votes", excerpt: "Votes quotidiens, séries hebdomadaires et cadeaux automatiques sont au programme.", icon: "◇", tone: "violet", read: "2 min" },
  { category: "Launcher", date: "1 août 2026", title: "Mises à jour automatiques", excerpt: "Le launcher récupère désormais les nouvelles versions publiées sans réinstallation manuelle.", icon: "↓", tone: "cyan", read: "2 min" },
  { category: "Développement", date: "31 juillet 2026", title: "Une identité pour CobbleStar", excerpt: "Du logo aux couleurs astrales, retour sur la direction artistique du serveur et du launcher.", icon: "★", tone: "pink", read: "3 min" },
];

export default function ActualitesPage() {
  const [filter, setFilter] = useState("Tout");
  const featured = articles[0];
  const visible = articles.slice(1).filter((article) => filter === "Tout" || article.category === filter);
  const filters = ["Tout", "Launcher", "Serveur", "Développement", "Communauté"];

  return <main><PageHero eyebrow="JOURNAL DE BORD" title="Les nouvelles" accent="de CobbleStar." description="Annonces du serveur, mises à jour du launcher et coulisses du développement." />
    <section className="content-section news-content">
      <article className={`featured-news tone-${featured.tone}`}><div className="featured-art"><span>{featured.icon}</span><div className="product-rings" /><small>À LA UNE</small></div><div className="featured-copy"><div className="news-meta"><b>{featured.category}</b><span>{featured.date} • {featured.read}</span></div><h2>{featured.title}</h2><p>{featured.excerpt}</p><span className="article-status">Note de développement</span></div></article>
      <div className="news-toolbar"><div><span className="kicker">ARCHIVES</span><h2>Le journal de bord</h2></div><div className="filter-pills filter-tabs">{filters.map((category) => <button className={filter === category ? "active" : ""} onClick={() => setFilter(category)} key={category}><span>{category}</span><small>{category === "Tout" ? articles.length - 1 : articles.slice(1).filter((article) => article.category === category).length}</small></button>)}</div></div>
      <div className="article-grid">{visible.map((article) => <article className={`article-card tone-${article.tone}`} key={article.title}><div className="article-art"><span>{article.icon}</span><div className="product-rings" /></div><div className="article-body"><div className="news-meta"><b>{article.category}</b><span>{article.read}</span></div><h3>{article.title}</h3><p>{article.excerpt}</p><small>{article.date}</small></div></article>)}</div>
      <div className="dev-timeline"><span className="kicker">EN CE MOMENT</span><h2>Sur la feuille de route</h2><div><article><span className="live-dot" /><b>Validation Microsoft</b><small>En attente</small></article><article><span className="live-dot active" /><b>Site communautaire</b><small>En développement</small></article><article><span className="live-dot" /><b>Modpack CobbleStar</b><small>Préparation</small></article></div></div>
    </section><SiteFooter /></main>;
}
