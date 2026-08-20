import Image from "next/image";
import styles from "./wiki.module.css";
import type { WikiBlock, WikiEntry } from "./wiki-types";

const entries = (block: WikiBlock) => (block.items ?? []).filter((item): item is WikiEntry => typeof item !== "string");
const strings = (block: WikiBlock) => (block.items ?? []).filter((item): item is string => typeof item === "string");

export default function WikiArticleBlocks({ blocks }: { blocks: WikiBlock[] }) {
  return <div className={styles.blocks}>{blocks.map((block, index) => {
    const key = `${block.kind}-${index}`;
    if (block.kind === "heading") return <h2 key={key}>{block.text}</h2>;
    if (block.kind === "paragraph") return <p className={styles.paragraph} key={key}>{block.text}</p>;
    if (block.kind === "callout") return <aside key={key} className={`${styles.callout} ${styles[block.tone ?? "cyan"]}`}><b>{block.title}</b><p>{block.text}</p></aside>;
    if (block.kind === "checklist") return <ul key={key} className={styles.checklist}>{strings(block).map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>;
    if (block.kind === "steps") return <div key={key} className={styles.steps}>{entries(block).map((item, itemIndex) => <article key={`${item.title}-${itemIndex}`}><span>{String(itemIndex + 1).padStart(2, "0")}</span><div><b>{item.title}</b><p>{item.text}</p></div></article>)}</div>;
    if (block.kind === "comparison") return <div key={key} className={styles.comparison}><article className={styles.good}><b>✓ {block.leftTitle}</b>{(block.leftItems ?? []).map((item) => <p key={item}>{item}</p>)}</article><article className={styles.bad}><b>× {block.rightTitle}</b>{(block.rightItems ?? []).map((item) => <p key={item}>{item}</p>)}</article></div>;
    if (block.kind === "progress") return <div key={key} className={styles.progress}><div><b>{block.from}</b><small>{block.fromLabel}</small></div><i><span style={{ width: `${block.percent ?? 50}%` }} /></i><div><b>{block.to}</b><small>{block.toLabel}</small></div></div>;
    if (block.kind === "command") return <div key={key} className={styles.command}><code>{block.command}</code><div><b>{block.title}</b><p>{block.text}</p></div></div>;
    if (block.kind === "itemGrid") return <div key={key} className={styles.itemGrid}>{entries(block).map((item) => <article key={item.title}>{item.asset && <Image src={item.asset} alt="" width={58} height={58}/>}<div><b>{item.title}</b><p>{item.text}</p></div></article>)}</div>;
    if (block.kind === "faq") return <div key={key} className={styles.faq}>{entries(block).map((item, itemIndex) => <details key={item.title} open={itemIndex === 0}><summary>{item.title}</summary><p>{item.text}</p></details>)}</div>;
    return null;
  })}</div>;
}
