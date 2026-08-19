"use client";

import { useMemo, useState, type CSSProperties } from "react";
import styles from "./jobs-skilltree.module.css";

type Direction = "terminal" | "passport" | "constellation" | "workshop";
type View = "jobs" | "detail" | "rewards" | "tree";

type Job = {
  id: string;
  name: string;
  role: string;
  description: string;
  action: string;
  icon: string;
  accent: string;
  level: number;
  xp: number;
  xpNext: number;
  branches: [string, string, string];
  branchNotes: [string, string, string];
};

const mcItem = (name: string) =>
  `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21/assets/minecraft/textures/item/${name}.png`;
const cobbleBall = (name: string) =>
  `https://raw.githubusercontent.com/Cobblemon/cobblemon/main/common/src/main/resources/assets/cobblemon/textures/item/poke_balls/${name}.png`;

const directions: { id: Direction; number: string; name: string; note: string }[] = [
  { id: "terminal", number: "01", name: "Terminal de carrière", note: "Direct et polyvalent" },
  { id: "passport", number: "02", name: "Carnet de métier", note: "Personnel et narratif" },
  { id: "constellation", number: "03", name: "Carte stellaire", note: "Visuel et spectaculaire" },
  { id: "workshop", number: "04", name: "Atelier de spécialisation", note: "Clair et stratégique" },
];

const views: { id: View; label: string }[] = [
  { id: "jobs", label: "MÉTIERS" },
  { id: "detail", label: "FICHE" },
  { id: "rewards", label: "RÉCOMPENSES" },
  { id: "tree", label: "ARBRE DE TALENTS" },
];

const jobs: Job[] = [
  {
    id: "miner", name: "Mineur", role: "Extraction", accent: "#69e7ef", level: 37,
    xp: 6420, xpNext: 9100, icon: mcItem("diamond_pickaxe.png"),
    description: "Maîtrise les profondeurs, les minerais rares et les tumblestones.",
    action: "Minerais extraits", branches: ["Extraction", "Vitesse", "Géologie"],
    branchNotes: ["Double butin et fonte automatique", "Hâte, portée et progression rapide", "Revenus et outils durables"],
  },
  {
    id: "lumberjack", name: "Bûcheron", role: "Sylviculture", accent: "#83e2b0", level: 22,
    xp: 3010, xpNext: 6200, icon: mcItem("diamond_axe.png"),
    description: "Récolte tous les bois et développe une forêt durable.",
    action: "Bois récolté", branches: ["Rendement", "Abattage", "Foresterie"],
    branchNotes: ["Davantage de ressources", "Coupe rapide et arbre entier", "Plantation et croissance"],
  },
  {
    id: "fisher", name: "Pêcheur", role: "Rivages", accent: "#69bfff", level: 18,
    xp: 1840, xpNext: 4800, icon: mcItem("fishing_rod.png"),
    description: "Pêche à la Poké Rod, découvre des Pokémon et des trésors.",
    action: "Prises réalisées", branches: ["Pokémon rares", "Trésors", "Appâts"],
    branchNotes: ["Rencontres et shiny", "Butin de valeur", "Économie et canne durable"],
  },
  {
    id: "herbalist", name: "Herboriste", role: "Botanique", accent: "#b2e88c", level: 46,
    xp: 9800, xpNext: 12800, icon: mcItem("wheat.png"),
    description: "Cultive les apricornes, les baies et les plantes médicinales.",
    action: "Récoltes effectuées", branches: ["Apricornes", "Baies", "Menthes"],
    branchNotes: ["Récolte doublée garantie", "Rendement et qualité", "Culture spécialisée"],
  },
  {
    id: "ranger", name: "Ranger", role: "Exploration", accent: "#f09dcc", level: 61,
    xp: 15120, xpNext: 17300, icon: cobbleBall("poke_ball.png"),
    description: "Explore les biomes, complète le Pokédex et capture efficacement.",
    action: "Découvertes et captures", branches: ["Capture", "Mobilité", "Écosystèmes"],
    branchNotes: ["Taux de capture supérieur", "Vitesse et vol", "Spawns rares renforcés"],
  },
  {
    id: "breeder", name: "Éleveur", role: "Éclosion", accent: "#ffd76a", level: 29,
    xp: 4770, xpNext: 7600, icon: mcItem("egg.png"),
    description: "Prends soin des œufs, accélère l’éclosion et améliore l’élevage.",
    action: "Œufs éclos", branches: ["Incubation", "Transmission", "Nurserie"],
    branchNotes: ["Éclosion accélérée", "Reproduction maîtrisée", "Confort et commandes"],
  },
];

const rewardIcons = [
  cobbleBall("great_ball.png"), mcItem("emerald.png"), mcItem("diamond.png"),
  mcItem("enchanted_book.png"), cobbleBall("ultra_ball.png"), mcItem("amethyst_shard.png"),
  mcItem("gold_ingot.png"), cobbleBall("master_ball.png"), mcItem("netherite_ingot.png"),
  mcItem("experience_bottle.png"),
];

const branchTalentNames = [
  "Fondations", "Lecture du terrain", "Geste précis", "Routine experte", "Rendement I",
  "Instinct professionnel", "Rendement II", "Maîtrise technique", "Réseau efficace", "Rendement III",
  "Savoir ancien", "Avantage majeur", "Expertise", "Signature", "Étoile de branche",
];

function vars(accent: string) {
  return { "--accent": accent } as CSSProperties;
}

function ItemIcon({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return <img className={`${styles.itemIcon} ${className}`} src={src} alt={alt} />;
}

function PrototypeBar({ direction, setDirection, view, setView }: {
  direction: Direction;
  setDirection: (direction: Direction) => void;
  view: View;
  setView: (view: View) => void;
}) {
  return <aside className={styles.prototypeBar}>
    <div className={styles.directionList}>
      <small>4 DIRECTIONS</small>
      {directions.map((item) => <button key={item.id} onClick={() => setDirection(item.id)} className={direction === item.id ? styles.prototypeActive : ""}>
        <b>{item.number}</b><span>{item.name}</span><i>{item.note}</i>
      </button>)}
    </div>
    <div className={styles.viewList}>
      <small>PARCOURS COMPLET</small>
      {views.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={view === item.id ? styles.viewActive : ""}>{item.label}</button>)}
    </div>
    <em>MAQUETTE WEB · AUCUNE INTÉGRATION JAVA</em>
  </aside>;
}

function Header({ view, setView, selected }: { view: View; setView: (view: View) => void; selected: Job }) {
  return <header className={styles.header}>
    <div className={styles.brand}><span>✦</span><div><b>COBBLESTAR</b><small>CARRIÈRES & SPÉCIALISATIONS</small></div></div>
    <nav>{views.map((item) => <button key={item.id} onClick={() => setView(item.id)} className={view === item.id ? styles.headerActive : ""}>{item.label}</button>)}</nav>
    <div className={styles.profileChip}><ItemIcon src={selected.icon} alt=""/><span><small>MÉTIER SUIVI</small><b>{selected.name} · niv.{selected.level}</b></span></div>
    <button className={styles.close}>×</button>
  </header>;
}

function Footer() {
  return <footer className={styles.footer}><span><kbd>ESC</kbd> FERMER</span><b>CLIC sélectionner · MOLETTE parcourir · SURVOLER pour les détails</b><span>● PROFIL SYNCHRONISÉ</span></footer>;
}

function Progress({ value, max, accent }: { value: number; max: number; accent?: string }) {
  return <div className={styles.progress} style={accent ? vars(accent) : undefined}><i style={{ width: `${Math.min(100, value / max * 100)}%` }}/></div>;
}

function JobRail({ selected, setSelected, activeJobs }: { selected: Job; setSelected: (job: Job) => void; activeJobs: string[] }) {
  return <aside className={styles.jobRail}>
    <div className={styles.sectionTitle}><small>PROFESSIONS DISPONIBLES</small><b>{jobs.length} MÉTIERS</b></div>
    <div className={styles.jobRailList}>{jobs.map((job) => <button key={job.id} onClick={() => setSelected(job)} className={selected.id === job.id ? styles.selectedJob : ""} style={vars(job.accent)}>
      <ItemIcon src={job.icon} alt=""/>
      <span><b>{job.name}</b><small>{job.role} · niv.{job.level}</small></span>
      {activeJobs.includes(job.id) && <i>ACTIF</i>}
    </button>)}</div>
    <div className={styles.slotCard}><span><small>EMPLACEMENTS</small><b>{activeJobs.length} / 1 actif</b></span><Progress value={activeJobs.length} max={1}/><small>La progression est conservée quand tu changes de métier.</small></div>
  </aside>;
}

function JobHero({ job, openTree }: { job: Job; openTree: () => void }) {
  return <article className={styles.jobHero} style={vars(job.accent)}>
    <div className={styles.heroCopy}><small>{job.role.toUpperCase()} {"//"} DOSSIER {job.id.toUpperCase()}</small><h1>{job.name}</h1><p>{job.description}</p><div className={styles.heroStats}><span><small>NIVEAU</small><b>{job.level}<i>/100</i></b></span><span><small>POINTS LIBRES</small><b>{Math.max(1, Math.floor(job.level / 5) - 3)}</b></span><span><small>{job.action.toUpperCase()}</small><b>{job.level * 143}</b></span></div></div>
    <div className={styles.heroArt}><i/><ItemIcon src={job.icon} alt={job.name}/><span>{job.role}</span></div>
    <div className={styles.heroProgress}><span><b>PROCHAIN NIVEAU</b><small>{job.xp.toLocaleString("fr-FR")} / {job.xpNext.toLocaleString("fr-FR")} XP</small></span><Progress value={job.xp} max={job.xpNext} accent={job.accent}/><button onClick={openTree}>OUVRIR L&apos;ARBRE →</button></div>
  </article>;
}

function BranchPreview({ job, setView }: { job: Job; setView: (view: View) => void }) {
  return <aside className={styles.branchPreview} style={vars(job.accent)}>
    <div className={styles.sectionTitle}><small>SPÉCIALISATIONS</small><b>1 BRANCHE FINALE</b></div>
    <div className={styles.branches}>{job.branches.map((branch, index) => <button key={branch} onClick={() => setView("tree")}>
      <span>{String(index + 1).padStart(2, "0")}</span><div><b>{branch}</b><small>{job.branchNotes[index]}</small></div><i>15 talents</i>
    </button>)}</div>
    <p>Le tronc commun coûte 5 points. Une branche complète en coûte 15 : au niveau 100, ton identité est réellement spécialisée.</p>
  </aside>;
}

function JobsPage({ selected, setSelected, activeJobs, setView }: { selected: Job; setSelected: (job: Job) => void; activeJobs: string[]; setView: (view: View) => void }) {
  return <main className={styles.jobsPage}><JobRail selected={selected} setSelected={setSelected} activeJobs={activeJobs}/><JobHero job={selected} openTree={() => setView("tree")}/><BranchPreview job={selected} setView={setView}/></main>;
}

function DetailPage({ job, activeJobs, activate, setView }: { job: Job; activeJobs: string[]; activate: () => void; setView: (view: View) => void }) {
  const active = activeJobs.includes(job.id);
  const stats = [
    ["Progression totale", `${Math.round((job.level + job.xp / job.xpNext) * 100) / 100}%`],
    ["Points obtenus", `${Math.floor(job.level / 5)} / 20`],
    ["Actions enregistrées", (job.level * 143).toLocaleString("fr-FR")],
    ["Plafond horaire", "12 000 XP"],
  ];
  return <main className={styles.detailPage} style={vars(job.accent)}>
    <section className={styles.detailIdentity}><div className={styles.detailIcon}><ItemIcon src={job.icon} alt={job.name}/><i/></div><small>FICHE DE CARRIÈRE</small><h1>{job.name}</h1><p>{job.description}</p><span className={active ? styles.activeBadge : styles.inactiveBadge}>{active ? "MÉTIER ACTIF" : "EN PAUSE"}</span><button onClick={activate}>{active ? "METTRE EN PAUSE" : "ACTIVER CE MÉTIER"}</button></section>
    <section className={styles.detailContent}>
      <header><div><small>PROGRESSION</small><h2>Niveau {job.level} <i>/ 100</i></h2></div><b>{job.xp.toLocaleString("fr-FR")} XP</b></header>
      <Progress value={job.xp} max={job.xpNext} accent={job.accent}/>
      <div className={styles.metricGrid}>{stats.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
      <div className={styles.activityPanel}><div><small>COMMENT PROGRESSER</small><h3>{job.action}</h3><p>Les actions répétées au même endroit sont limitées pour garder une économie saine.</p></div><div className={styles.activityBars}>{[82, 64, 91, 46, 73, 57, 88].map((height, index) => <i key={index} style={{ height: `${height}%` }}/>)}</div></div>
    </section>
    <aside className={styles.detailActions}><small>PARCOURS</small><button onClick={() => setView("rewards")}><span>01</span><b>Récompenses de niveau</b><i>100 paliers →</i></button><button onClick={() => setView("tree")}><span>02</span><b>Arbre de talents</b><i>50 talents →</i></button><div><small>PROCHAINE ÉTAPE</small><b>Niveau {job.level + 1}</b><Progress value={job.xp} max={job.xpNext}/><span>{job.xpNext - job.xp} XP restants</span></div></aside>
  </main>;
}

function RewardsPage({ job }: { job: Job }) {
  const [page, setPage] = useState(1);
  const [claimed, setClaimed] = useState(() => new Set([1, 2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30, 35]));
  const pageCount = 10;
  const rewards = useMemo(() => Array.from({ length: 10 }, (_, index) => {
    const level = (page - 1) * 10 + index + 1;
    const special = level % 5 === 0;
    return { level, icon: rewardIcons[index], name: special ? (level % 10 === 0 ? "Coffre de carrière" : "Point de talent") : `${500 + level * 75} CobbleCoins`, special };
  }), [page]);
  const claim = (level: number) => setClaimed((previous) => new Set(previous).add(level));
  return <main className={styles.rewardsPage} style={vars(job.accent)}>
    <aside className={styles.rewardSummary}><small>PARCOURS DE CARRIÈRE</small><ItemIcon src={job.icon} alt={job.name}/><h1>{job.name}</h1><b>NIVEAU {job.level}</b><Progress value={job.level} max={100}/><p>Chaque niveau débloque une récompense. Un point de talent est accordé tous les 5 niveaux.</p><div><span><small>RÉCUPÉRÉES</small><b>{[...claimed].filter((level) => level <= job.level).length}</b></span><span><small>DISPONIBLES</small><b>{Math.max(0, job.level - [...claimed].filter((level) => level <= job.level).length)}</b></span></div><button onClick={() => setClaimed(new Set(Array.from({ length: job.level }, (_, i) => i + 1)))}>TOUT RÉCUPÉRER</button></aside>
    <section className={styles.rewardTrack} onWheel={(event) => { if (Math.abs(event.deltaY) > 20) setPage(Math.max(1, Math.min(pageCount, page + (event.deltaY > 0 ? 1 : -1)))); }}>
      <header><div><small>RÉCOMPENSES DE NIVEAU</small><h2>Paliers {(page - 1) * 10 + 1}—{page * 10}</h2></div><span>PAGE {page} / {pageCount}</span></header>
      <div className={styles.rewardGrid}>{rewards.map((reward) => {
        const unlocked = reward.level <= job.level;
        const isClaimed = claimed.has(reward.level);
        return <article key={reward.level} className={`${reward.special ? styles.specialReward : ""} ${!unlocked ? styles.lockedReward : ""}`}>
          <span>NIVEAU <b>{reward.level}</b></span><div><ItemIcon src={reward.icon} alt=""/><i/></div><h3>{reward.name}</h3><button disabled={!unlocked || isClaimed} onClick={() => claim(reward.level)}>{isClaimed ? "✓ OBTENU" : unlocked ? "RÉCUPÉRER" : "VERROUILLÉ"}</button>
        </article>;
      })}</div>
      <div className={styles.rewardPager}><button disabled={page === 1} onClick={() => setPage(page - 1)}>← PALIERS PRÉCÉDENTS</button><div>{Array.from({ length: pageCount }, (_, index) => <button key={index} className={page === index + 1 ? styles.currentPage : ""} onClick={() => setPage(index + 1)}>{index + 1}</button>)}</div><button disabled={page === pageCount} onClick={() => setPage(page + 1)}>PALIERS SUIVANTS →</button></div>
    </section>
  </main>;
}

function TreeNode({ id, label, owned, available, selected, onClick, star = false }: { id: string; label: string; owned: boolean; available: boolean; selected: boolean; onClick: () => void; star?: boolean }) {
  return <button aria-label={label} title={label} onClick={onClick} className={`${styles.treeNode} ${owned ? styles.nodeOwned : ""} ${available ? styles.nodeAvailable : ""} ${selected ? styles.nodeSelected : ""} ${star ? styles.starNode : ""}`}><span>{star ? "★" : owned ? "✓" : id.split("-").pop()}</span></button>;
}

function TreePage({ job }: { job: Job }) {
  const [zoom, setZoom] = useState(100);
  const [owned, setOwned] = useState(() => new Set(["core-1", "core-2", "core-3"]));
  const [selectedNode, setSelectedNode] = useState("core-4");
  const [chosenBranch, setChosenBranch] = useState<number | null>(null);
  const points = Math.max(1, Math.floor(job.level / 5) - owned.size);
  const common = ["Initiation", "Technique", "Endurance", "Maîtrise", "Certification"];
  const buyNode = (id: string, branchIndex: number | null, index: number) => {
    setSelectedNode(id);
    const previousId = branchIndex === null ? `core-${index}` : index === 1 ? "core-5" : `branch-${branchIndex}-${index - 1}`;
    const available = points > 0 && owned.has(previousId) && (branchIndex === null || chosenBranch === null || chosenBranch === branchIndex);
    if (!owned.has(id) && available) {
      setOwned((current) => new Set(current).add(id));
      if (branchIndex !== null) setChosenBranch(branchIndex);
    }
  };
  return <main className={styles.treePage} style={vars(job.accent)}>
    <aside className={styles.treeJobs}><small>ARBRE DU MÉTIER</small><ItemIcon src={job.icon} alt={job.name}/><h2>{job.name}</h2><span>Niveau {job.level}</span><div><b>{points}</b><small>POINTS LIBRES</small></div><p>Une seule spécialisation finale peut être choisie. Le tronc commun reste acquis.</p></aside>
    <section className={styles.treeMap} style={{ "--treeZoom": zoom / 100 } as CSSProperties}>
      <header><div><small>CARTE DES TALENTS</small><h1>Choisis ta voie</h1></div><span>{owned.size} / 50 TALENTS</span><div className={styles.zoom}><button onClick={() => setZoom(Math.max(80, zoom - 10))}>−</button><b>{zoom}%</b><button onClick={() => setZoom(Math.min(120, zoom + 10))}>＋</button></div></header>
      <div className={styles.treeViewport}>
        <div className={styles.treeInner}>
          <div className={styles.commonPath}><b>TRONC COMMUN</b><div>{common.map((name, index) => {
            const id = `core-${index + 1}`;
            return <TreeNode key={id} id={id} label={name} owned={owned.has(id)} available={index === 0 || owned.has(`core-${index}`)} selected={selectedNode === id} onClick={() => buyNode(id, null, index + 1)}/>;
          })}</div></div>
          <div className={styles.branchPaths}>{job.branches.map((branch, branchIndex) => <article key={branch} className={chosenBranch !== null && chosenBranch !== branchIndex ? styles.branchBlocked : ""}>
            <header><span>VOIE {branchIndex + 1}</span><h3>{branch}</h3><small>{job.branchNotes[branchIndex]}</small></header>
            <div>{branchTalentNames.map((name, index) => {
              const id = `branch-${branchIndex}-${index + 1}`;
              const previousOwned = index === 0 ? owned.has("core-5") : owned.has(`branch-${branchIndex}-${index}`);
              return <TreeNode key={id} id={id} label={index === 14 ? `Étoile de ${branch}` : name} owned={owned.has(id)} available={previousOwned && (chosenBranch === null || chosenBranch === branchIndex)} selected={selectedNode === id} star={index === 14} onClick={() => buyNode(id, branchIndex, index + 1)}/>;
            })}</div>
          </article>)}</div>
        </div>
      </div>
    </section>
    <aside className={styles.nodeInspector}><small>TALENT SÉLECTIONNÉ</small><div className={styles.inspectGlyph}>{selectedNode.includes("15") ? "★" : "✦"}</div><h2>{selectedNode.startsWith("core") ? common[Number(selectedNode.split("-")[1]) - 1] || "Talent commun" : branchTalentNames[Number(selectedNode.split("-")[2]) - 1] || "Talent de branche"}</h2><span>{selectedNode.startsWith("core") ? "TRONC COMMUN" : job.branches[Number(selectedNode.split("-")[1])] || "SPÉCIALISATION"}</span><p>Améliore durablement les performances de ton métier. Cet effet est actif tant que le métier reste équipé.</p><div><small>COÛT</small><b>1 POINT</b></div><button>{owned.has(selectedNode) ? "✓ TALENT ACQUIS" : points > 0 ? "DÉBLOQUER" : "AUCUN POINT"}</button></aside>
  </main>;
}

export default function JobsSkillTreeMockups() {
  const [direction, setDirection] = useState<Direction>("terminal");
  const [view, setView] = useState<View>("jobs");
  const [selected, setSelected] = useState(jobs[0]);
  const [activeJobs, setActiveJobs] = useState(["miner"]);
  const [replacement, setReplacement] = useState(false);

  const activate = () => {
    if (activeJobs.includes(selected.id)) setActiveJobs([]);
    else if (activeJobs.length >= 1) setReplacement(true);
    else setActiveJobs([selected.id]);
  };

  return <div className={styles.page}>
    <PrototypeBar direction={direction} setDirection={setDirection} view={view} setView={setView}/>
    <div className={styles.viewport}>
      <section className={`${styles.shell} ${styles[`layout_${direction}`]}`}>
        <Header view={view} setView={setView} selected={selected}/>
        {view === "jobs" && <JobsPage selected={selected} setSelected={setSelected} activeJobs={activeJobs} setView={setView}/>} 
        {view === "detail" && <DetailPage job={selected} activeJobs={activeJobs} activate={activate} setView={setView}/>} 
        {view === "rewards" && <RewardsPage job={selected}/>} 
        {view === "tree" && <TreePage job={selected}/>} 
        <Footer/>
        {replacement && <div className={styles.modalLayer}><section className={styles.modal}><small>EMPLACEMENT OCCUPÉ</small><h2>Remplacer {jobs.find((job) => activeJobs.includes(job.id))?.name} ?</h2><p>Sa progression sera conservée. Seul le métier actif changera.</p><div><button onClick={() => setReplacement(false)}>ANNULER</button><button onClick={() => { setActiveJobs([selected.id]); setReplacement(false); }}>CONFIRMER</button></div></section></div>}
      </section>
    </div>
  </div>;
}
