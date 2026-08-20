"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import fallback from "../../../news.default.json";
import type { NewsAccent, NewsArticle, NewsDocument } from "../news-types";
import styles from "./admin.module.css";

const initial = fallback as NewsDocument;
const accents: NewsAccent[] = ["cyan", "pink", "gold", "mint", "violet"];
const slugify = (value: string) => value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96);
const localDate = (value: string) => new Date(value).toISOString().slice(0, 16);

export default function NewsAdminPage() {
  const [document, setDocument] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.articles[0]?.id ?? "");
  const [status, setStatus] = useState("CHARGEMENT…");
  const [busy, setBusy] = useState(false);
  const articles = useMemo(() => [...document.articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [document]);
  const article = document.articles.find((item) => item.id === selectedId) ?? null;

  useEffect(() => { void fetch("/api/news/admin", { credentials: "include", cache: "no-store" }).then(async (response) => {
    if (response.status === 401) throw new Error("Connecte-toi avec un compte administrateur.");
    if (response.status === 403) throw new Error("Ton compte n’a pas accès au studio d’actualités.");
    if (!response.ok) throw new Error("Le studio est temporairement indisponible.");
    return response.json() as Promise<{ draft: { content: NewsDocument; version: number }; publishedVersion: number }>;
  }).then((result) => { setDocument(result.draft.content); setSelectedId(result.draft.content.articles[0]?.id ?? ""); setStatus(`BROUILLON V${result.draft.version} · PUBLIC V${result.publishedVersion}`); }).catch((error: Error) => setStatus(error.message.toUpperCase())); }, []);

  function mutate(change: (draft: NewsArticle) => void) {
    setDocument((current) => ({ ...current, articles: current.articles.map((item) => item.id === selectedId ? (() => { const next = structuredClone(item); change(next); return next; })() : item) }));
  }

  function addArticle() {
    const id = `annonce-${Date.now()}`;
    const next: NewsArticle = { id, slug: id, title: "Nouvelle annonce", excerpt: "Résume la nouveauté en une phrase claire.", content: "Écris ici le contenu complet de l’annonce.\n\nSépare les paragraphes avec une ligne vide.", category: "NOUVEAUTÉ", accent: "cyan", image: "/cobblemon-team.webp", publishedAt: new Date().toISOString(), published: false, featured: false };
    setDocument((current) => ({ ...current, articles: [next, ...current.articles] })); setSelectedId(id);
  }

  async function save(publish: boolean) {
    setBusy(true); setStatus(publish ? "PUBLICATION…" : "ENREGISTREMENT…");
    try {
      const response = await fetch("/api/news/admin", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(document) });
      if (!response.ok) throw new Error("Le brouillon n’a pas pu être enregistré.");
      const saved = await response.json() as { version: number };
      if (publish) {
        const publication = await fetch("/api/news/admin/publish", { method: "POST", credentials: "include" });
        if (!publication.ok) throw new Error("Le brouillon est sauvé, mais la publication a échoué.");
        const result = await publication.json() as { version: number }; setStatus(`PUBLIÉ · VERSION ${result.version}`);
      } else setStatus(`BROUILLON SAUVÉ · VERSION ${saved.version}`);
    } catch (error) { setStatus((error as Error).message.toUpperCase()); } finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <header className={styles.top}><div><span>STUDIO COBBLESTAR</span><h1>Actualités</h1></div><p>{status}</p><nav><Link href="/actualites/">Voir le journal</Link><button disabled={busy} onClick={() => void save(false)}>Sauver</button><button disabled={busy} onClick={() => void save(true)}>Publier partout</button></nav></header>
    <aside className={styles.list}><button className={styles.add} onClick={addArticle}>＋ NOUVELLE ANNONCE</button>{articles.map((item) => <button key={item.id} className={item.id === selectedId ? styles.active : ""} onClick={() => setSelectedId(item.id)}><span className={styles[item.accent]}>{item.category}</span><b>{item.title}</b><small>{item.published ? "VISIBLE" : "BROUILLON"} · {new Date(item.publishedAt).toLocaleDateString("fr-FR")}</small></button>)}</aside>
    <section className={styles.editor}>{article ? <>
      <div className={styles.preview}><img src={article.image} alt=""/><span/><div><small className={styles[article.accent]}>{article.category}</small><h2>{article.title}</h2><p>{article.excerpt}</p></div></div>
      <div className={styles.form}>
        <label>TITRE<input value={article.title} onChange={(event) => mutate((draft) => { draft.title = event.target.value; if (draft.id.startsWith("annonce-")) draft.slug = slugify(event.target.value); })}/></label>
        <label>RÉSUMÉ COURT<textarea rows={3} value={article.excerpt} onChange={(event) => mutate((draft) => { draft.excerpt = event.target.value; })}/></label>
        <label>CONTENU COMPLET<textarea className={styles.body} value={article.content} onChange={(event) => mutate((draft) => { draft.content = event.target.value; })}/><small>Une ligne vide crée un nouveau paragraphe sur le site et en jeu.</small></label>
        <div className={styles.row}><label>CATÉGORIE<input value={article.category} onChange={(event) => mutate((draft) => { draft.category = event.target.value.toUpperCase(); })}/></label><label>DATE<input type="datetime-local" value={localDate(article.publishedAt)} onChange={(event) => { if (event.target.value) mutate((draft) => { draft.publishedAt = new Date(event.target.value).toISOString(); }); }}/></label></div>
        <label>IMAGE DU SITE<input value={article.image} onChange={(event) => mutate((draft) => { draft.image = event.target.value; })}/></label>
        <fieldset><legend>COULEUR</legend>{accents.map((accent) => <button key={accent} className={`${styles.swatch} ${styles[accent]} ${article.accent === accent ? styles.selected : ""}`} onClick={() => mutate((draft) => { draft.accent = accent; })}>{accent}</button>)}</fieldset>
        <div className={styles.toggles}><label><input type="checkbox" checked={article.published} onChange={(event) => mutate((draft) => { draft.published = event.target.checked; })}/> Visible à la publication</label><label><input type="checkbox" checked={article.featured} onChange={(event) => mutate((draft) => { draft.featured = event.target.checked; })}/> Mettre à la une</label></div>
        <button className={styles.remove} onClick={() => { setDocument((current) => ({ ...current, articles: current.articles.filter((item) => item.id !== article.id) })); setSelectedId(articles.find((item) => item.id !== article.id)?.id ?? ""); }}>Supprimer le brouillon</button>
      </div>
    </> : <div className={styles.empty}>Crée une première annonce pour commencer.</div>}</section>
  </main>;
}
