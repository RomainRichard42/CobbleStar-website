"use client";

import { useMemo, useState, type CSSProperties } from "react";
import styles from "./skilltree.module.css";

type Direction = "circuit" | "constellation" | "lanes" | "atlas";
type NodeState = "owned" | "available" | "locked";
type Talent = { id: number; name: string; detail: string; cost: number; state: NodeState; branch: number; tier: number };

const mcItem = (name: string) =>
  `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21/assets/minecraft/textures/item/${name}.png`;

const directions: { id: Direction; number: string; name: string; note: string }[] = [
  { id: "circuit", number: "01", name: "Circuit orbital", note: "Lecture horizontale" },
  { id: "constellation", number: "02", name: "Constellation", note: "Identité StarWatch" },
  { id: "lanes", number: "03", name: "Voies expertes", note: "Choix très lisibles" },
  { id: "atlas", number: "04", name: "Atlas tactique", note: "Une branche à la fois" },
];

const jobs = [
  { id: "miner", name: "Mineur", icon: mcItem("diamond_pickaxe.png"), level: 37 },
  { id: "ranger", name: "Ranger", icon: mcItem("spyglass.png"), level: 61 },
  { id: "breeder", name: "Éleveur", icon: mcItem("egg.png"), level: 29 },
];

const branchNames = ["EXTRACTION", "GEMMOLOGIE", "PROSPECTION"];
const colors = ["#68e8f1", "#f29acb", "#ffd76a"];
const talentNames = [
  ["Veine riche", "Frappe précise", "Éclat brut", "Filon profond", "Maître foreur"],
  ["Œil expert", "Taille pure", "Cristal rare", "Prisme ancien", "Gemme stellaire"],
  ["Carte minérale", "Instinct tellurique", "Trésor enfoui", "Lecture du sol", "Prospecteur orbital"],
];

const talents: Talent[] = talentNames.flatMap((branch, branchIndex) =>
  branch.map((name, tier) => ({
    id: branchIndex * 5 + tier,
    name,
    detail: tier === 4 ? `Talent majeur de ${branchNames[branchIndex].toLowerCase()}. Définit ta spécialisation finale.` : `Améliore progressivement la voie ${branchNames[branchIndex].toLowerCase()}.`,
    cost: tier === 4 ? 3 : tier > 1 ? 2 : 1,
    state: tier < 2 ? "owned" : tier === 2 ? "available" : "locked",
    branch: branchIndex,
    tier,
  }))
);

const vars = (values: Record<string, string | number>) => values as CSSProperties;

function Icon({ src }: { src: string }) {
  return <img className={styles.itemIcon} src={src} alt="" />;
}

function TalentNode({ talent, selected, onSelect, compact = false }: { talent: Talent; selected: boolean; onSelect: () => void; compact?: boolean }) {
  return <button
    className={`${styles.node} ${styles[talent.state]} ${selected ? styles.selected : ""} ${compact ? styles.compactNode : ""}`}
    style={vars({ "--branch": colors[talent.branch] })}
    onClick={onSelect}
    title={talent.name}
  >
    <span>{talent.state === "owned" ? "✓" : talent.tier === 4 ? "✦" : talent.tier + 1}</span>
  </button>;
}

function Inspector({ talent, buy }: { talent: Talent; buy: () => void }) {
  return <aside className={styles.inspector} style={vars({ "--branch": colors[talent.branch] })}>
    <small>TALENT SÉLECTIONNÉ</small>
    <div className={styles.inspectGlyph}>{talent.tier === 4 ? "✦" : String(talent.tier + 1).padStart(2, "0")}</div>
    <span>{branchNames[talent.branch]}</span>
    <h2>{talent.name}</h2>
    <p>{talent.detail}</p>
    <div className={styles.effect}><small>EFFET ACTUEL</small><b>+{(talent.tier + 1) * 4}% de rendement</b></div>
    <div className={styles.cost}><span><small>COÛT</small><b>{talent.cost} point{talent.cost > 1 ? "s" : ""}</b></span><span><small>PRÉREQUIS</small><b>{talent.tier === 0 ? "Aucun" : `Palier ${talent.tier}`}</b></span></div>
    <button disabled={talent.state !== "available"} onClick={buy}>{talent.state === "owned" ? "TALENT ACQUIS" : talent.state === "locked" ? "TALENT VERROUILLÉ" : "DÉBLOQUER LE TALENT"}</button>
  </aside>;
}

function Circuit({ selected, setSelected }: { selected: Talent; setSelected: (talent: Talent) => void }) {
  return <div className={styles.circuitLayout}>
    <section className={styles.circuitMap}>
      <header><span><small>TRONC COMMUN</small><b>Fondations de mineur</b></span><i>5 / 5 ACQUIS</i></header>
      <div className={styles.commonLine}>{[0, 1, 2, 3, 4].map((n) => <span key={n}>✓</span>)}</div>
      <div className={styles.circuitBranches}>{[0, 1, 2].map((branch) => <article key={branch} style={vars({ "--branch": colors[branch] })}>
        <header><span>{String(branch + 1).padStart(2, "0")}</span><div><b>{branchNames[branch]}</b><small>{branch === 0 ? "RENDEMENT & VITESSE" : branch === 1 ? "RARETÉ & QUALITÉ" : "DÉTECTION & REVENUS"}</small></div></header>
        <div className={styles.horizontalPath}>{talents.filter((t) => t.branch === branch).map((talent) => <TalentNode key={talent.id} talent={talent} selected={selected.id === talent.id} onSelect={() => setSelected(talent)} />)}</div>
      </article>)}</div>
    </section>
    <Inspector talent={selected} buy={() => undefined}/>
  </div>;
}

function Constellation({ selected, setSelected }: { selected: Talent; setSelected: (talent: Talent) => void }) {
  return <div className={styles.constellationLayout}>
    <section className={styles.starMap}>
      <div className={styles.orbitRing}/><div className={styles.orbitRingSmall}/>
      <div className={styles.core}><Icon src={jobs[0].icon}/><b>MINEUR</b><small>TRONC 5/5</small></div>
      {talents.map((talent) => {
        const angle = (-120 + talent.branch * 120) + (talent.tier - 2) * 8;
        const radius = 135 + talent.tier * 43;
        return <div className={styles.orbitNode} key={talent.id} style={vars({ "--angle": `${angle}deg`, "--radius": `${radius}px` })}><TalentNode compact talent={talent} selected={selected.id === talent.id} onSelect={() => setSelected(talent)}/></div>;
      })}
      {branchNames.map((name, index) => <span key={name} className={`${styles.branchLabel} ${styles[`label${index}`]}`} style={{ color: colors[index] }}>{name}</span>)}
    </section>
    <Inspector talent={selected} buy={() => undefined}/>
  </div>;
}

function Lanes({ selected, setSelected }: { selected: Talent; setSelected: (talent: Talent) => void }) {
  return <div className={styles.lanesLayout}>
    <section className={styles.lanesMap}>
      <header><div><small>CHOIX DE SPÉCIALISATION</small><h2>Une carrière, trois identités</h2></div><span>Une seule voie finale peut être maîtrisée</span></header>
      <div className={styles.laneGrid}>{branchNames.map((name, branch) => <article key={name} style={vars({ "--branch": colors[branch] })}>
        <header><span>0{branch + 1}</span><div><b>{name}</b><small>{branch === 0 ? "PRODUIRE DAVANTAGE" : branch === 1 ? "TROUVER LE RARE" : "LIRE LE MONDE"}</small></div></header>
        <div>{talents.filter((t) => t.branch === branch).map((talent) => <div key={talent.id} className={selected.id === talent.id ? styles.laneSelected : ""} style={{ height: 55, padding: 6, display: "grid", gridTemplateColumns: "40px 1fr auto", alignItems: "center", border: `1px solid ${selected.id === talent.id ? colors[branch] : "#ffffff0b"}`, color: "white", background: selected.id === talent.id ? "#20163a" : "#17102b" }}>
          <TalentNode compact talent={talent} selected={selected.id === talent.id} onSelect={() => setSelected(talent)}/><span><b>{talent.name}</b><small>Palier {talent.tier + 1} · {talent.cost} PT</small></span><i>{talent.state === "owned" ? "ACQUIS" : talent.state === "available" ? "DISPONIBLE" : "VERROUILLÉ"}</i>
        </div>)}</div>
      </article>)}</div>
    </section>
    <Inspector talent={selected} buy={() => undefined}/>
  </div>;
}

function Atlas({ selected, setSelected, branch, setBranch }: { selected: Talent; setSelected: (talent: Talent) => void; branch: number; setBranch: (branch: number) => void }) {
  const branchTalents = talents.filter((talent) => talent.branch === branch);
  return <div className={styles.atlasLayout}>
    <aside className={styles.atlasTabs}>{branchNames.map((name, index) => <button key={name} style={vars({ "--branch": colors[index] })} className={branch === index ? styles.atlasActive : ""} onClick={() => { setBranch(index); setSelected(talents.find((t) => t.branch === index && t.tier === 2)!); }}><span>0{index + 1}</span><b>{name}</b><small>{index === 0 ? "Rendement" : index === 1 ? "Rareté" : "Exploration"}</small></button>)}</aside>
    <section className={styles.atlasMap} style={vars({ "--branch": colors[branch] })}>
      <header><span><small>VOIE ACTIVE</small><h1>{branchNames[branch]}</h1></span><b>2 / 5 TALENTS</b></header>
      <div className={styles.atlasPath}>{branchTalents.map((talent, index) => <div key={talent.id} className={index % 2 ? styles.atlasDown : styles.atlasUp}><small>PALIER 0{index + 1}</small><TalentNode talent={talent} selected={selected.id === talent.id} onSelect={() => setSelected(talent)}/><b>{talent.name}</b><span>{talent.cost} PT</span></div>)}</div>
      <footer><span>COMMUN</span><i/><span>SIGNATURE DE BRANCHE</span></footer>
    </section>
    <Inspector talent={selected} buy={() => undefined}/>
  </div>;
}

export default function SkillTreeMockups() {
  const [direction, setDirection] = useState<Direction>("circuit");
  const [selectedId, setSelectedId] = useState(2);
  const [job, setJob] = useState(0);
  const [branch, setBranch] = useState(0);
  const [zoom, setZoom] = useState(100);
  const selected = useMemo(() => talents.find((talent) => talent.id === selectedId) ?? talents[2], [selectedId]);
  const setSelected = (talent: Talent) => { setSelectedId(talent.id); setBranch(talent.branch); };

  return <main className={styles.page}>
    <aside className={styles.prototypeBar}>
      <small>ARBRE DE TALENTS · 4 DIRECTIONS</small>
      {directions.map((item) => <button key={item.id} className={direction === item.id ? styles.prototypeActive : ""} onClick={() => setDirection(item.id)}><b>{item.number}</b><span>{item.name}</span><i>{item.note}</i></button>)}
      <em>MAQUETTES UNIQUEMENT · PAS ENCORE INTÉGRÉES AU MOD</em>
    </aside>
    <div className={styles.viewport}>
      <section className={styles.shell} onWheel={(event) => setZoom((value) => Math.max(80, Math.min(120, value + (event.deltaY < 0 ? 5 : -5))))}>
        <header className={styles.header}>
          <div className={styles.brand}><span>✦</span><div><b>COBBLESTAR</b><small>ARBRE DE TALENTS</small></div></div>
          <nav><button>MÉTIERS</button><button className={styles.navActive}>ARBRE DE TALENTS</button><button>RÉCOMPENSES</button></nav>
          <div className={styles.points}><small>POINTS DISPONIBLES</small><b>4</b></div><button className={styles.close}>×</button>
        </header>
        <div className={styles.toolbar}>
          <div className={styles.jobTabs}>{jobs.map((item, index) => <button key={item.id} className={job === index ? styles.jobActive : ""} onClick={() => setJob(index)}><Icon src={item.icon}/><span><b>{item.name}</b><small>Niv. {item.level}</small></span></button>)}</div>
          <div className={styles.treeInfo}><span><small>MÉTIER SUIVI</small><b>{jobs[job].name.toUpperCase()}</b></span><i>TRONC COMMUN 5/5</i></div>
          <div className={styles.zoom}><button onClick={() => setZoom(Math.max(80, zoom - 5))}>−</button><b>{zoom}%</b><button onClick={() => setZoom(Math.min(120, zoom + 5))}>+</button></div>
        </div>
        <div className={styles.content} style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}>
          {direction === "circuit" && <Circuit selected={selected} setSelected={setSelected}/>} 
          {direction === "constellation" && <Constellation selected={selected} setSelected={setSelected}/>} 
          {direction === "lanes" && <Lanes selected={selected} setSelected={setSelected}/>} 
          {direction === "atlas" && <Atlas selected={selected} setSelected={setSelected} branch={branch} setBranch={setBranch}/>} 
        </div>
        <footer className={styles.footer}><span><kbd>ESC</kbd> FERMER</span><b>CLIC sélectionner · MOLETTE zoomer · SURVOLER pour identifier</b><span>● PROFIL SYNCHRONISÉ</span></footer>
      </section>
    </div>
  </main>;
}
