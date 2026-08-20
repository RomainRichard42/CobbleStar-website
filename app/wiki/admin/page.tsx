"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import defaultWiki from "../../../wiki.default.json";
import WikiArticleBlocks from "../WikiArticleBlocks";
import type { WikiArticle, WikiBlock, WikiDocument, WikiEntry } from "../wiki-types";
import styles from "./studio.module.css";

const fallback = defaultWiki as WikiDocument;
const palette = [
  ["heading", "TITRE", "Aa"], ["paragraph", "TEXTE", "¶"], ["callout", "ENCADRÉ", "!"],
  ["checklist", "LISTE", "✓"], ["steps", "ÉTAPES", "01"], ["comparison", "COMPARAISON", "↔"],
  ["progress", "PROGRESSION", "%"], ["command", "COMMANDE", "/"], ["itemGrid", "OBJETS", "◇"], ["faq", "FAQ", "?"],
] as const;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const slug = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || `article-${Date.now()}`;
const textItems = (block: WikiBlock) => (block.items ?? []).filter((item): item is string => typeof item === "string");
const entries = (block: WikiBlock) => (block.items ?? []).filter((item): item is WikiEntry => typeof item !== "string");

function freshBlock(kind: string): WikiBlock {
  if (kind === "heading") return { kind, text: "Nouveau titre" };
  if (kind === "paragraph") return { kind, text: "Écris ton explication ici." };
  if (kind === "callout") return { kind, tone: "gold", title: "À RETENIR", text: "Information importante." };
  if (kind === "checklist") return { kind, items: ["Premier point", "Deuxième point"] };
  if (kind === "steps") return { kind, items: [{ title: "Première étape", text: "Ce que le joueur doit faire." }] };
  if (kind === "comparison") return { kind, leftTitle: "AUTORISÉ", leftItems: ["Premier cas"], rightTitle: "INTERDIT", rightItems: ["Premier cas"] };
  if (kind === "progress") return { kind, from: "60 min", fromLabel: "Départ", to: "15 min", toLabel: "Maximum", percent: 75 };
  if (kind === "command") return { kind, command: "/commande", title: "Nom de l’action", text: "Explique les paramètres simplement." };
  if (kind === "itemGrid") return { kind, items: [{ title: "OBJET", text: "Effet de l’objet.", asset: "/mockups/daycare/poke_ball.png" }] };
  return { kind: "faq", items: [{ title: "Question ?", text: "Réponse claire." }] };
}

export default function WikiStudio() {
  const [wiki, setWiki] = useState<WikiDocument>(clone(fallback));
  const [selectedBranch, setSelectedBranch] = useState(fallback.branches[0]?.id ?? "");
  const [selectedArticle, setSelectedArticle] = useState(fallback.articles[0]?.id ?? "");
  const [selectedBlock, setSelectedBlock] = useState(0);
  const [status, setStatus] = useState("CHARGEMENT…");
  const [busy, setBusy] = useState(false);
  const [dragBranch, setDragBranch] = useState<string | null>(null);

  useEffect(() => { void fetch("/api/wiki/admin", { credentials: "include", cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error(response.status === 401 ? "Connecte-toi avec un compte administrateur." : "Accès administrateur requis.");
    return response.json() as Promise<{ draft: { content: WikiDocument; version: number }; publishedVersion: number }>;
  }).then((result) => { setWiki(result.draft.content); setSelectedBranch(result.draft.content.branches[0]?.id ?? ""); setSelectedArticle(result.draft.content.articles[0]?.id ?? ""); setStatus(`BROUILLON V${result.draft.version} · PUBLIC V${result.publishedVersion}`); }).catch((error: Error) => setStatus(error.message.toUpperCase())); }, []);

  const branches = useMemo(() => [...wiki.branches].sort((a, b) => a.order - b.order), [wiki.branches]);
  const articles = useMemo(() => wiki.articles.filter((article) => article.branchId === selectedBranch).sort((a, b) => a.order - b.order), [wiki.articles, selectedBranch]);
  const article = wiki.articles.find((item) => item.id === selectedArticle) ?? articles[0];
  const block = article?.blocks[selectedBlock];

  function mutateArticle(change: (draft: WikiArticle) => void) {
    setWiki((current) => ({ ...current, articles: current.articles.map((item) => item.id === article?.id ? (() => { const next = clone(item); change(next); return next; })() : item) }));
  }
  function replaceBlock(next: WikiBlock) { mutateArticle((draft) => { draft.blocks[selectedBlock] = next; }); }
  function addBranch() { const id = `branche-${Date.now()}`; setWiki((current) => ({ ...current, branches: [...current.branches, { id, label: "Nouvelle branche", description: "Description du parcours", icon: "✦", accent: "cyan", order: current.branches.length, visible: true }] })); setSelectedBranch(id); }
  function addArticle() { const id = `article-${Date.now()}`; const next: WikiArticle = { id, branchId: selectedBranch, title: "Nouvel article", summary: "Résumé visible dans les résultats de recherche.", tags: [], readingMinutes: 3, order: articles.length, published: false, hero: { asset: "/cobblemon-team.webp", alt: "Illustration CobbleStar", species: "eevee", icon: "/mockups/daycare/poke_ball.png" }, blocks: [freshBlock("heading"), freshBlock("paragraph")] }; setWiki((current) => ({ ...current, articles: [...current.articles, next] })); setSelectedArticle(id); setSelectedBlock(0); }
  function reorderBranch(target: string) { if (!dragBranch || dragBranch === target) return; const ordered = [...branches]; const from = ordered.findIndex((item) => item.id === dragBranch), to = ordered.findIndex((item) => item.id === target); const [moved] = ordered.splice(from, 1); ordered.splice(to, 0, moved); setWiki((current) => ({ ...current, branches: ordered.map((item, order) => ({ ...item, order })) })); setDragBranch(null); }
  function moveBlock(direction: number) { if (!article) return; const to = selectedBlock + direction; if (to < 0 || to >= article.blocks.length) return; mutateArticle((draft) => { const [moved] = draft.blocks.splice(selectedBlock, 1); draft.blocks.splice(to, 0, moved); }); setSelectedBlock(to); }
  async function save(publish: boolean) { setBusy(true); setStatus(publish ? "PUBLICATION…" : "ENREGISTREMENT…"); try { const save = await fetch("/api/wiki/admin", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(wiki) }); if (!save.ok) throw new Error("Le brouillon n’a pas pu être enregistré."); const saved = await save.json() as { version: number }; if (publish) { const result = await fetch("/api/wiki/admin/publish", { method: "POST", credentials: "include" }); if (!result.ok) throw new Error("Le brouillon est sauvé, mais la publication a échoué."); const published = await result.json() as { version: number }; setStatus(`PUBLIÉ · VERSION ${published.version}`); } else setStatus(`BROUILLON SAUVÉ · VERSION ${saved.version}`); } catch (error) { setStatus((error as Error).message.toUpperCase()); } finally { setBusy(false); } }

  return <main className={styles.studio}>
    <header><div className={styles.logo}>✦</div><p><small>COBBLESTAR</small><b>STUDIO DU WIKI</b></p><span className={styles.status}>{status}</span><Link href="/wiki/">VOIR LE WIKI</Link><button disabled={busy} onClick={() => void save(false)}>SAUVER</button><button disabled={busy} className={styles.publish} onClick={() => void save(true)}>PUBLIER</button></header>
    <section className={styles.workspace}>
      <aside className={styles.structure}><div className={styles.asideTitle}><span><small>STRUCTURE</small><b>Branches et articles</b></span><button onClick={addBranch}>+ BRANCHE</button></div>{branches.map((branch) => <section key={branch.id} draggable onDragStart={() => setDragBranch(branch.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderBranch(branch.id)} className={selectedBranch === branch.id ? styles.openBranch : ""}><button className={styles.branchRow} onClick={() => { setSelectedBranch(branch.id); const first = wiki.articles.find((item) => item.branchId === branch.id); if (first) setSelectedArticle(first.id); }}><i className={styles[branch.accent]}>{branch.icon}</i><span><b>{branch.label}</b><small>{wiki.articles.filter((item) => item.branchId === branch.id).length} ARTICLE(S)</small></span><em>⋮⋮</em></button>{selectedBranch === branch.id && <div className={styles.articleRows}>{articles.map((item) => <button key={item.id} className={item.id === article?.id ? styles.activeArticle : ""} onClick={() => { setSelectedArticle(item.id); setSelectedBlock(0); }}><span>{item.published ? "●" : "○"}</span>{item.title}</button>)}<button className={styles.addArticle} onClick={addArticle}>+ NOUVEL ARTICLE</button></div>}</section>)}</aside>
      <section className={styles.editor}>{article ? <><div className={styles.articleFields}><label>TITRE<input value={article.title} onChange={(event) => mutateArticle((draft) => { draft.title = event.target.value; draft.id = draft.id.startsWith("article-") ? slug(event.target.value) : draft.id; })}/></label><label>RÉSUMÉ<textarea value={article.summary} onChange={(event) => mutateArticle((draft) => { draft.summary = event.target.value; })}/></label><div><label>IMAGE DU SITE<input value={article.hero.asset} onChange={(event) => mutateArticle((draft) => { draft.hero.asset = event.target.value; })}/></label><label>POKÉMON AFFICHÉ EN JEU<input value={article.hero.species ?? ""} placeholder="ex. pikachu" onChange={(event) => mutateArticle((draft) => { draft.hero.species = event.target.value; })}/></label><label>ICÔNE DE SECOURS EN JEU<input value={article.hero.icon ?? ""} placeholder="/mockups/daycare/poke_ball.png" onChange={(event) => mutateArticle((draft) => { draft.hero.icon = event.target.value; })}/></label><label>MOTS-CLÉS<input value={article.tags.join(", ")} onChange={(event) => mutateArticle((draft) => { draft.tags = event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean); })}/></label><label className={styles.toggle}><input type="checkbox" checked={article.published} onChange={(event) => mutateArticle((draft) => { draft.published = event.target.checked; })}/> VISIBLE À LA PUBLICATION</label></div></div><div className={styles.palette}><small>AJOUTER UN BLOC</small>{palette.map(([kind, label, icon]) => <button key={kind} onClick={() => { mutateArticle((draft) => draft.blocks.push(freshBlock(kind))); setSelectedBlock(article.blocks.length); }}><span>{icon}</span>{label}</button>)}</div><div className={styles.blockList}>{article.blocks.map((item, index) => <button key={`${item.kind}-${index}`} className={index === selectedBlock ? styles.activeBlock : ""} onClick={() => setSelectedBlock(index)}><span>{String(index + 1).padStart(2, "0")}</span><b>{palette.find(([kind]) => kind === item.kind)?.[1] ?? item.kind}</b><small>{item.title ?? item.text ?? "Bloc de contenu"}</small></button>)}</div></> : <p>Aucun article dans cette branche.</p>}</section>
      <aside className={styles.inspector}><header><span><small>BLOC SÉLECTIONNÉ</small><b>{block?.kind.toUpperCase() ?? "AUCUN"}</b></span>{block && <div><button onClick={() => moveBlock(-1)}>↑</button><button onClick={() => moveBlock(1)}>↓</button><button className={styles.remove} onClick={() => { mutateArticle((draft) => draft.blocks.splice(selectedBlock, 1)); setSelectedBlock(Math.max(0, selectedBlock - 1)); }}>×</button></div>}</header>{block && <BlockFields block={block} onChange={replaceBlock}/>}<div className={styles.preview}><small>APERÇU DE L’ARTICLE</small><h2>{article?.title}</h2><p>{article?.summary}</p>{article && <WikiArticleBlocks blocks={article.blocks}/>}</div></aside>
    </section>
  </main>;
}

function BlockFields({ block, onChange }: { block: WikiBlock; onChange: (block: WikiBlock) => void }) {
  const field = (key: keyof WikiBlock, value: unknown) => onChange({ ...block, [key]: value });
  const multiline = (items: string[]) => items.join("\n");
  const parseEntries = (value: string, assets = false): WikiEntry[] => value.split("\n").filter(Boolean).map((line) => { const [title = "", text = "", asset = ""] = line.split("|"); return assets ? { title: title.trim(), text: text.trim(), asset: asset.trim() } : { title: title.trim(), text: text.trim() }; });
  return <div className={styles.blockFields}>
    {(block.kind === "heading" || block.kind === "paragraph") && <label>CONTENU<textarea value={block.text ?? ""} onChange={(event) => field("text", event.target.value)}/></label>}
    {block.kind === "callout" && <><label>TITRE<input value={block.title ?? ""} onChange={(event) => field("title", event.target.value)}/></label><label>COULEUR<select value={block.tone} onChange={(event) => field("tone", event.target.value)}><option value="cyan">Cyan</option><option value="pink">Rose</option><option value="gold">Jaune</option><option value="mint">Vert</option><option value="violet">Violet</option></select></label><label>TEXTE<textarea value={block.text ?? ""} onChange={(event) => field("text", event.target.value)}/></label></>}
    {block.kind === "checklist" && <label>UN POINT PAR LIGNE<textarea value={multiline(textItems(block))} onChange={(event) => field("items", event.target.value.split("\n"))}/></label>}
    {(block.kind === "steps" || block.kind === "faq" || block.kind === "itemGrid") && <label>{block.kind === "itemGrid" ? "TITRE | TEXTE | IMAGE" : "TITRE | TEXTE"}<textarea value={entries(block).map((item) => `${item.title} | ${item.text}${block.kind === "itemGrid" ? ` | ${item.asset ?? ""}` : ""}`).join("\n")} onChange={(event) => field("items", parseEntries(event.target.value, block.kind === "itemGrid"))}/></label>}
    {block.kind === "comparison" && <><label>TITRE GAUCHE<input value={block.leftTitle ?? ""} onChange={(event) => field("leftTitle", event.target.value)}/></label><label>CAS AUTORISÉS<textarea value={multiline(block.leftItems ?? [])} onChange={(event) => field("leftItems", event.target.value.split("\n"))}/></label><label>TITRE DROITE<input value={block.rightTitle ?? ""} onChange={(event) => field("rightTitle", event.target.value)}/></label><label>CAS REFUSÉS<textarea value={multiline(block.rightItems ?? [])} onChange={(event) => field("rightItems", event.target.value.split("\n"))}/></label></>}
    {block.kind === "progress" && <><label>DÉPART<input value={block.from ?? ""} onChange={(event) => field("from", event.target.value)}/></label><label>LIBELLÉ<input value={block.fromLabel ?? ""} onChange={(event) => field("fromLabel", event.target.value)}/></label><label>ARRIVÉE<input value={block.to ?? ""} onChange={(event) => field("to", event.target.value)}/></label><label>LIBELLÉ<input value={block.toLabel ?? ""} onChange={(event) => field("toLabel", event.target.value)}/></label></>}
    {block.kind === "command" && <><label>COMMANDE<input value={block.command ?? ""} onChange={(event) => field("command", event.target.value)}/></label><label>TITRE<input value={block.title ?? ""} onChange={(event) => field("title", event.target.value)}/></label><label>EXPLICATION<textarea value={block.text ?? ""} onChange={(event) => field("text", event.target.value)}/></label></>}
  </div>;
}
