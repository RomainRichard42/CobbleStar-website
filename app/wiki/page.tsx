"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import defaultWiki from "../../wiki.default.json";
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

  return <main className={styles.page}>
    <SiteHeader />
    <section className={styles.hero}>
      <div><small>WIKI OFFICIEL · SYNCHRONISÉ AVEC LE JEU</small><h1>Le wiki <em>CobbleStar</em></h1><p>{wiki.subtitle}</p></div>
      <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pension, quête, ranked, objet…"/><kbd>/wiki</kbd></label>
    </section>
    <section className={styles.readerShell}>
      <nav className={styles.branches} aria-label="Branches du wiki">
        <header><small>PARCOURS</small><b>Choisis ta branche</b></header>
        {branches.map((branch) => <button key={branch.id} className={`${styles.branch} ${branchId === branch.id && !query ? styles.activeBranch : ""}`} onClick={() => chooseBranch(branch.id)}><i className={styles[branch.accent]}>{branch.icon}</i><span><b>{branch.label}</b><small>{branch.description}</small></span><em>{visibleArticles.filter((article) => article.branchId === branch.id).length}</em></button>)}
        <footer><span>✦</span><p><b>Même contenu en jeu</b><small>Les articles publiés sont chargés par le serveur Minecraft.</small></p></footer>
      </nav>
      <aside className={styles.articleList}>
        <header><small>{query ? "RÉSULTATS" : currentBranch?.label ?? "ARTICLES"}</small><b>{branchArticles.length} article{branchArticles.length > 1 ? "s" : ""}</b></header>
        {branchArticles.map((article, index) => <button key={article.id} className={article.id === current?.id ? styles.activeArticle : ""} onClick={() => { setArticleId(article.id); setBranchId(article.branchId); }}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{article.title}</b><p>{article.summary}</p><small>{article.readingMinutes} MIN DE LECTURE</small></div><em>›</em></button>)}
        {!branchArticles.length && <p className={styles.empty}>Aucun article ne correspond à cette recherche.</p>}
      </aside>
      <article className={styles.article}>
        {current ? <>
          <div className={styles.articleHero}>{current.hero.asset && <Image src={current.hero.asset} alt={current.hero.alt} fill sizes="700px" priority/>}<span/><div><small>{currentBranch?.label} · {current.readingMinutes} MIN</small><h2>{current.title}</h2><p>{current.summary}</p></div></div>
          <WikiArticleBlocks blocks={current.blocks}/>
          <footer><span>VERSION PUBLIÉE {version}</span><div><Link href="/wiki/admin/">STUDIO WIKI</Link><Link href="/wiki/admin/access/">GÉRER LES ACCÈS</Link></div></footer>
        </> : <div className={styles.empty}>Le wiki ne contient encore aucun article publié.</div>}
      </article>
    </section>
  </main>;
}
