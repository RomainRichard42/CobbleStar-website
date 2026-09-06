"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import defaultWiki from "../../wiki.default.json";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import WikiArticleBlocks from "./WikiArticleBlocks";
import type { WikiDocument, WikiEnvelope } from "./wiki-types";
import styles from "./wiki.module.css";

const initial = defaultWiki as WikiDocument;

export default function WikiPage() {
  const [wiki, setWiki] = useState(initial);
  const [version, setVersion] = useState(1);
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState(initial.branches[0]?.id ?? "");
  const [articleId, setArticleId] = useState(initial.articles[0]?.id ?? "");
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => { void fetch("/api/wiki", { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error("Wiki indisponible");
    return response.json() as Promise<WikiEnvelope>;
  }).then((result) => { setWiki(result.content); setVersion(result.version); }).catch(() => undefined); }, []);

  const branches = useMemo(() => wiki.branches.filter((branch) => branch.visible).sort((a, b) => a.order - b.order), [wiki]);
  const visibleArticles = useMemo(() => wiki.articles.filter((article) => article.published).sort((a, b) => a.order - b.order), [wiki]);
  const normalized = query.trim().toLocaleLowerCase("fr");
  const results = visibleArticles.filter((article) => !normalized || `${article.title} ${article.summary} ${article.tags.join(" ")}`.toLocaleLowerCase("fr").includes(normalized));
  const branchArticles = results.filter((article) => normalized || article.branchId === branchId);
  const current = visibleArticles.find((article) => article.id === articleId) ?? branchArticles[0] ?? visibleArticles[0];
  const currentBranch = branches.find((branch) => branch.id === current?.branchId);

  function chooseBranch(id: string) {
    setBranchId(id); setQuery("");
    const first = visibleArticles.find((article) => article.branchId === id);
    if (first) setArticleId(first.id);
  }

  function openArticle(id: string, nextBranchId: string) {
    setArticleId(id);
    setBranchId(nextBranchId);
    window.requestAnimationFrame(() => articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <main className={styles.page}>
    <SiteHeader />
    <section className={styles.hero} id="contenu">
      <div className={styles.heroCopy}><small>BASE DE DONNÉES OFFICIELLE · VERSION {version}</small><h1>Le <em>Cobblestar Dex.</em></h1><p>{wiki.subtitle}</p><label htmlFor="wiki-search"><span>⌕</span><input id="wiki-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pension, quête, ranked, objet…"/><kbd>/wiki</kbd></label></div>
      <div className={styles.heroScene} aria-hidden="true"><Image src="/cobblemon-team.webp" alt="" fill sizes="620px" priority/><span/><dl><div><dt>{visibleArticles.length}</dt><dd>GUIDES</dd></div><div><dt>{branches.length}</dt><dd>PARCOURS</dd></div></dl></div>
    </section>
    <section className={styles.readerShell}>
      <div className={styles.navigator}>
        <nav className={styles.branches} aria-label="Catégories du wiki">
          <header><small>01 · PARCOURS</small><b>Choisis un thème</b></header>
          <div>{branches.map((branch) => <button type="button" key={branch.id} className={`${styles.branch} ${branchId === branch.id && !query ? styles.activeBranch : ""}`} onClick={() => chooseBranch(branch.id)}><i className={styles[branch.accent]}>{branch.icon}</i><span><b>{branch.label}</b><small>{branch.description}</small></span><em>{visibleArticles.filter((article) => article.branchId === branch.id).length}</em></button>)}</div>
        </nav>
        <div className={styles.articleList}>
          <header><small>02 · {query ? "RÉSULTATS" : currentBranch?.label ?? "ARTICLES"}</small><b>{branchArticles.length} guide{branchArticles.length > 1 ? "s" : ""}</b></header>
          <div className={styles.articleCards}>{branchArticles.map((article, index) => <button type="button" key={article.id} className={article.id === current?.id ? styles.activeArticle : ""} onClick={() => openArticle(article.id, article.branchId)}><span className={styles.articleCardMedia}>{article.hero.asset && <Image src={article.hero.asset} alt="" fill sizes="300px"/>}<i>{String(index + 1).padStart(2, "0")}</i></span><span className={styles.articleCardCopy}><small>{article.readingMinutes} MIN · GUIDE</small><b>{article.title}</b><p>{article.summary}</p><em>Lire le guide →</em></span></button>)}</div>
          {!branchArticles.length && <p className={styles.empty}>Aucun article ne correspond à cette recherche.</p>}
        </div>
        <div className={styles.gameSync}><span>✦</span><p><b>Aussi disponible en jeu</b><small>Retrouve les mêmes guides avec la commande /wiki.</small></p></div>
      </div>
      <article className={styles.article} ref={articleRef}>
        {current ? <>
          <div className={styles.articleHero}>{current.hero.asset && <Image src={current.hero.asset} alt={current.hero.alt} fill sizes="900px" priority/>}<span/><div><small>03 · {currentBranch?.label} · {current.readingMinutes} MIN</small><h2>{current.title}</h2><p>{current.summary}</p></div></div>
          <WikiArticleBlocks blocks={current.blocks}/>
          <footer><span>VERSION PUBLIÉE {version}</span><small>Contenu synchronisé avec le serveur</small></footer>
        </> : <div className={styles.empty}>Le wiki ne contient encore aucun article publié.</div>}
      </article>
    </section>
    <SiteFooter />
  </main>;
}
