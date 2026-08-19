"use client";

import { useMemo, useState } from "react";
import styles from "./quetes.module.css";

type Screen = "hud" | "journalA" | "journalB" | "journalC" | "chapterAdmin" | "journal" | "rotations" | "chapters" | "detail" | "dialogue" | "studio" | "editor";
type Rotation = "daily" | "weekly" | "monthly";

type AutoQuest = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  icon: string;
};

const rotations: Record<Rotation, AutoQuest[]> = {
  daily: [
    { id: "d1", title: "Inventaire de terrain", description: "Capture 5 Pokémon sauvages.", progress: 3, target: 5, reward: "2 500 ⬡", icon: "◓" },
    { id: "d2", title: "Pierres d'évolution", description: "Récolte 24 Tumblestones.", progress: 18, target: 24, reward: "450 XP métier", icon: "◆" },
    { id: "d3", title: "Duel d'entraînement", description: "Remporte 2 combats de dresseur.", progress: 1, target: 2, reward: "1 Booster", icon: "⚔" },
  ],
  weekly: [
    { id: "w1", title: "Escouade d'expédition", description: "Termine 5 raids CobbleStar.", progress: 2, target: 5, reward: "1 Clé Nova", icon: "✦" },
    { id: "w2", title: "Réseau marchand", description: "Finalise 3 ventes au GTS.", progress: 1, target: 3, reward: "12 000 ⬡", icon: "⇄" },
    { id: "w3", title: "Profession reconnue", description: "Gagne 15 000 XP de métier.", progress: 8600, target: 15000, reward: "2 points talent", icon: "✧" },
  ],
  monthly: [
    { id: "m1", title: "Régularité stellaire", description: "Complète 8 missions hebdomadaires.", progress: 3, target: 8, reward: "Cadre de profil", icon: "▣" },
    { id: "m2", title: "Naturaliste confirmé", description: "Découvre 25 nouvelles espèces.", progress: 11, target: 25, reward: "Carte STAR", icon: "◎" },
    { id: "m3", title: "Force du collectif", description: "Contribue 100 000 CobbleCoins à ton club.", progress: 38000, target: 100000, reward: "Trophée de club", icon: "♜" },
  ],
};

const storyQuests = [
  { number: "01", title: "Premier signal", status: "done", npc: "Professeure Lyra" },
  { number: "02", title: "Archives sous la mousse", status: "active", npc: "Archiviste Sélène" },
  { number: "03", title: "L'accord des deux ciels", status: "available", npc: "Kaï" },
  { number: "04", title: "Le cœur de Nébélia", status: "locked", npc: "Inconnu" },
];

const screens: { id: Screen; label: string }[] = [
  { id: "hud", label: "HUD validé" },
  { id: "journalA", label: "Journal A" },
  { id: "journalB", label: "Journal B" },
  { id: "journalC", label: "Journal C" },
  { id: "chapterAdmin", label: "Gestion chapitres" },
  { id: "journal", label: "Journal actuel" },
  { id: "rotations", label: "Rotations" },
  { id: "chapters", label: "Histoire" },
  { id: "detail", label: "Fiche quête" },
  { id: "dialogue", label: "Dialogue PNJ" },
  { id: "studio", label: "Studio PNJ" },
  { id: "editor", label: "Éditeur quête" },
];

type ConceptVariant = "a" | "b" | "c";

const conceptCopy = {
  a: { number: "01", name: "Bande basse", scale: "65 %", type: "HISTOIRE", title: "Archives sous la mousse", accent: "story" },
  b: { number: "02", name: "Cartes ancrées", scale: "60 %", type: "HEBDOMADAIRE", title: "Escouade d’expédition", accent: "weekly" },
  c: { number: "03", name: "HUD minimal", scale: "70 %", type: "JOURNALIÈRE", title: "Inventaire de terrain", accent: "daily" },
} as const;

function ConceptPreview({ variant }: { variant: ConceptVariant }) {
  const copy = conceptCopy[variant];
  return (
    <div className={`${styles.conceptPreview} ${styles[`concept${variant.toUpperCase()}`]}`}>
      <div className={styles.conceptBackdrop} />
      <div className={styles.conceptCaption}>
        <span>PROPOSITION {copy.number}</span>
        <strong>{copy.name}</strong>
        <small>Interface ramenée à {copy.scale} de la taille actuelle</small>
      </div>

      <section className={`${styles.miniTracker} ${styles[copy.accent]}`}>
        <div className={styles.trackerTopline}>
          <span className={styles.questKind}>{copy.type}</span>
          <button>×</button>
        </div>
        <strong>{copy.title}</strong>
        <p>{variant === "a" ? "Retrouver les balises de l’observatoire" : variant === "b" ? "Terminer 5 raids avec son équipe" : "Capturer 5 Pokémon sauvages"}</p>
        <div className={styles.miniProgress}><i style={{ width: variant === "a" ? "66%" : variant === "b" ? "40%" : "60%" }} /></div>
        <div className={styles.trackerCount}>
          <span>{variant === "a" ? "2 / 3" : variant === "b" ? "2 / 5" : "3 / 5"}</span>
          <small>{variant === "a" ? "184 blocs" : variant === "b" ? "4 j restants" : "17 h restantes"}</small>
        </div>
      </section>

      <section className={styles.compactDialogue}>
        <div className={styles.dialogueAvatar}>S</div>
        <div className={styles.compactLine}>
          <span>Sélène <small>Archiviste</small></span>
          <p>{variant === "c" ? "Une balise a répondu à ton passage. Retrouve-la avant la nuit." : "Les balises n’émettent plus depuis la convergence. Pourtant, l’une d’elles a répondu à ton passage."}</p>
        </div>
        <div className={styles.compactChoices}>
          <button>{variant === "b" ? "Je vais enquêter." : "Où dois-je chercher ?"}</button>
          <button className={styles.quietChoice}>{variant === "c" ? "Plus tard" : "Que s’est-il passé ?"}</button>
        </div>
      </section>

      <div className={styles.conceptNotes}>
        {variant === "a" && <><b>Lecture naturelle</b><span>Dialogue horizontal familier, suivi discret en haut à droite.</span></>}
        {variant === "b" && <><b>Très compact</b><span>Deux cartes indépendantes, faciles à placer sans masquer le jeu.</span></>}
        {variant === "c" && <><b>Priorité au jeu</b><span>Une seule ligne de dialogue et un suivi réduit à l’essentiel.</span></>}
      </div>
    </div>
  );
}

function Progress({ value, target }: { value: number; target: number }) {
  const width = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  return (
    <div className={styles.progressTrack}>
      <span style={{ width: `${width}%` }} />
    </div>
  );
}

function QuestCard({ quest, active, onClick }: { quest: AutoQuest; active?: boolean; onClick?: () => void }) {
  const complete = quest.progress >= quest.target;
  return (
    <button className={`${styles.questCard} ${active ? styles.selected : ""}`} onClick={onClick}>
      <span className={styles.questIcon}>{quest.icon}</span>
      <span className={styles.questCopy}>
        <span className={styles.questTitle}>{quest.title}</span>
        <span className={styles.questDescription}>{quest.description}</span>
        <Progress value={quest.progress} target={quest.target} />
      </span>
      <span className={styles.questMeta}>
        <strong>{complete ? "TERMINÉ" : `${quest.progress.toLocaleString("fr-FR")} / ${quest.target.toLocaleString("fr-FR")}`}</strong>
        <small>{quest.reward}</small>
      </span>
    </button>
  );
}

type JournalVariant = "a" | "b" | "c";

const journalQuests = [
  { type: "HISTOIRE", title: "Archives sous la mousse", objective: "Retrouver la balise de la canopée", progress: "2 / 3", color: "story", icon: "Ⅱ" },
  { type: "SECONDAIRE", title: "L’herbier de Lyra", objective: "Rapporter 8 plantes médicinales", progress: "5 / 8", color: "side", icon: "✤" },
  { type: "JOURNALIÈRE", title: "Inventaire de terrain", objective: "Capturer 5 Pokémon sauvages", progress: "3 / 5", color: "daily", icon: "◓" },
  { type: "HEBDOMADAIRE", title: "Escouade d’expédition", objective: "Terminer 5 raids avec son équipe", progress: "2 / 5", color: "weekly", icon: "⚔" },
  { type: "MENSUELLE", title: "Naturaliste confirmé", objective: "Découvrir 25 nouvelles espèces", progress: "11 / 25", color: "monthly", icon: "◎" },
];

function JournalMockup({ variant }: { variant: JournalVariant }) {
  const [selected, setSelected] = useState(0);
  const quest = journalQuests[selected];
  return (
    <div className={`${styles.journalConcept} ${styles[`journal${variant.toUpperCase()}`]}`}>
      <div className={styles.journalConceptHead}>
        <div><span>JOURNAL DE QUÊTES</span><strong>{variant === "a" ? "Liste et fiche" : variant === "b" ? "Tableau par catégories" : "Carnet de progression"}</strong></div>
        <div className={styles.journalSearch}>⌕&nbsp;&nbsp; Rechercher une quête</div>
        <button>×</button>
      </div>

      {variant === "a" && (
        <div className={styles.journalAContent}>
          <aside className={styles.journalFilters}>
            <span>AFFICHER</span>
            {[["Toutes", "5"], ["Histoire", "1"], ["Secondaires", "1"], ["Journalières", "1"], ["Hebdomadaires", "1"], ["Mensuelles", "1"]].map(([name, count], i) => <button key={name} className={i === 0 ? styles.filterActive : ""}><b>{name}</b><small>{count}</small></button>)}
            <label><input type="checkbox" defaultChecked /> Masquer terminées</label>
          </aside>
          <section className={styles.journalQuestList}>
            <div className={styles.listHeading}><strong>EN COURS</strong><small>TRI : PRIORITÉ</small></div>
            {journalQuests.map((item, i) => <button key={item.title} onClick={() => setSelected(i)} className={`${styles.journalQuestRow} ${styles[item.color]} ${selected === i ? styles.questRowActive : ""}`}><i>{item.icon}</i><span><em>{item.type}</em><b>{item.title}</b><small>{item.objective}</small></span><strong>{item.progress}</strong></button>)}
          </section>
          <JournalDetail quest={quest} />
        </div>
      )}

      {variant === "b" && (
        <div className={styles.journalBoard}>
          <div className={styles.boardSummary}><span><b>5</b> ACTIVES</span><span><b>2</b> PROCHES DE LA FIN</span><span><b>01:42</b> AVANT ROTATION</span></div>
          <div className={styles.boardColumns}>
            <JournalColumn title="AVENTURE" subtitle="Histoire et rencontres" items={journalQuests.slice(0, 2)} color="story" />
            <JournalColumn title="AUJOURD’HUI" subtitle="Renouvelées chaque matin" items={[journalQuests[2]]} color="daily" />
            <JournalColumn title="LONG TERME" subtitle="Semaine et mois" items={journalQuests.slice(3)} color="weekly" />
          </div>
        </div>
      )}

      {variant === "c" && (
        <div className={styles.journalCContent}>
          <aside className={styles.chapterIndex}>
            <span>CAMPAGNE</span><h3>Fracture au crépuscule</h3><p>Chapitre II · 48 %</p>
            <div className={styles.chapterProgress}><i /></div>
            <button className={styles.chapterActive}>Ⅱ <span><b>Astéria</b><small>2 / 4 missions</small></span></button>
            <button>Ⅲ <span><b>Nébélia</b><small>Verrouillé</small></span></button>
            <div className={styles.rotationShortcut}><b>VUE D’ENSEMBLE</b><span>1 quête d’histoire suivie</span><span>2 quêtes secondaires</span><span>5 missions récurrentes</span></div>
          </aside>
          <section className={styles.chapterQuestFlow}>
            <div className={styles.flowTitle}><span>CHAPITRE II</span><h2>Astéria répond</h2><p>Les quêtes suivent l’ordre de l’histoire. Les activités libres restent accessibles à droite.</p></div>
            <button className={`${styles.flowQuest} ${styles.story}`}><i>✓</i><span><em>HISTOIRE</em><b>Le signal dans la brume</b><small>Interroger l’Archiviste Sélène</small></span><strong>TERMINÉE</strong></button>
            <button className={`${styles.flowQuest} ${styles.story} ${styles.flowActive}`}><i>02</i><span><em>HISTOIRE · EN COURS</em><b>Archives sous la mousse</b><small>Retrouver la balise de la canopée</small></span><strong>2 / 3</strong></button>
            <button className={`${styles.flowQuest} ${styles.story}`}><i>03</i><span><em>HISTOIRE · À DÉCOUVRIR</em><b>L’accord des deux ciels</b><small>Se débloque après la mission précédente</small></span><strong>VERROUILLÉE</strong></button>
          </section>
          <aside className={styles.journalSideRail}>
            <section className={styles.sideQuestGroup}>
              <div><span>QUÊTES SECONDAIRES</span><small>2 disponibles</small></div>
              <button className={styles.sideQuestCard}><i>✤</i><span><b>L’herbier de Lyra</b><small>5 / 8 plantes</small></span></button>
              <button className={styles.sideQuestCard}><i>◇</i><span><b>Un colis pour Kaï</b><small>Nouvelle</small></span></button>
            </section>
            <section className={styles.repeatQuestGroup}>
              <div><span>MISSIONS RÉCURRENTES</span><small>Actives automatiquement</small></div>
              <button className={`${styles.repeatQuest} ${styles.daily}`}><em>JOUR</em><span><b>Inventaire de terrain</b><small>3 / 5 · reset 17 h</small></span></button>
              <button className={`${styles.repeatQuest} ${styles.weekly}`}><em>SEM.</em><span><b>Escouade d’expédition</b><small>2 / 5 · reset 4 j</small></span></button>
              <button className={`${styles.repeatQuest} ${styles.monthly}`}><em>MOIS</em><span><b>Naturaliste confirmé</b><small>11 / 25 · reset 19 j</small></span></button>
              <button className={styles.allRotations}>VOIR TOUTES LES ROTATIONS →</button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function JournalDetail({ quest, compact = false }: { quest: typeof journalQuests[number]; compact?: boolean }) {
  return <aside className={`${styles.journalDetailCard} ${styles[quest.color]} ${compact ? styles.detailCompact : ""}`}>
    <span className={styles.detailType}>{quest.type}</span><div className={styles.detailIcon}>{quest.icon}</div><h2>{quest.title}</h2><p>{quest.objective}</p>
    <div className={styles.detailProgress}><i style={{ width: quest.progress.startsWith("2 / 3") ? "66%" : quest.progress.startsWith("5") ? "62%" : quest.progress.startsWith("3") ? "60%" : "40%" }} /></div>
    <strong>{quest.progress}</strong><div className={styles.detailReward}><span>RÉCOMPENSE</span><b>2 500 ⬡ · 450 XP</b></div><button className={styles.followButton}>⌖ SUIVRE CETTE QUÊTE</button>
  </aside>;
}

function JournalColumn({ title, subtitle, items, color }: { title: string; subtitle: string; items: typeof journalQuests; color: string }) {
  return <section className={`${styles.boardColumn} ${styles[color]}`}><div><strong>{title}</strong><small>{subtitle}</small></div>{items.map(item => <button key={item.title} className={styles.boardQuest}><span>{item.icon}</span><em>{item.type}</em><b>{item.title}</b><small>{item.objective}</small><i>{item.progress}</i></button>)}</section>;
}

type ChapterDraft = { id: number; number: string; title: string; quests: string[] };

function ChapterManagerMockup() {
  const [chapters, setChapters] = useState<ChapterDraft[]>([
    { id: 1, number: "I", title: "Premiers échos", quests: ["Premier signal", "Une piste dans les bois"] },
    { id: 2, number: "II", title: "Fracture au crépuscule", quests: ["Le signal dans la brume", "Archives sous la mousse", "L’accord des deux ciels"] },
    { id: 3, number: "III", title: "Au-delà de l’orbite", quests: ["Passage instable", "Le cœur de Nébélia"] },
  ]);
  const [selectedId, setSelectedId] = useState(2);
  const selectedIndex = Math.max(0, chapters.findIndex(chapter => chapter.id === selectedId));
  const selected = chapters[selectedIndex];
  const moveChapter = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    [next[index], next[target]] = [next[target], next[index]];
    setChapters(next);
  };
  const moveQuest = (index: number, delta: number) => {
    const target = index + delta;
    if (!selected || target < 0 || target >= selected.quests.length) return;
    const quests = [...selected.quests];
    [quests[index], quests[target]] = [quests[target], quests[index]];
    setChapters(chapters.map(chapter => chapter.id === selected.id ? { ...chapter, quests } : chapter));
  };
  const addChapter = () => {
    const id = Math.max(...chapters.map(chapter => chapter.id), 0) + 1;
    setChapters([...chapters, { id, number: String(chapters.length + 1).padStart(2, "0"), title: "Nouveau chapitre", quests: [] }]);
    setSelectedId(id);
  };
  return <div className={styles.chapterManager}>
    <header className={styles.managerHead}><div><span>OUTILS ADMIN</span><strong>Organisation de la campagne</strong></div><p>Les modifications restent en brouillon jusqu’à la publication.</p><button>×</button></header>
    <div className={styles.managerBody}>
      <aside className={styles.managerChapterList}>
        <div><span>CHAPITRES</span><button onClick={addChapter}>＋ NOUVEAU</button></div>
        {chapters.map((chapter, index) => <button key={chapter.id} onClick={() => setSelectedId(chapter.id)} className={chapter.id === selectedId ? styles.managerChapterActive : ""}>
          <i>⠿</i><em>{String(index + 1).padStart(2, "0")}</em><span><b>{chapter.title}</b><small>{chapter.quests.length} quête(s)</small></span><span className={styles.orderButtons}><i onClick={event => { event.stopPropagation(); moveChapter(index, -1); }}>↑</i><i onClick={event => { event.stopPropagation(); moveChapter(index, 1); }}>↓</i></span>
        </button>)}
      </aside>
      <section className={styles.managerEditor}>
        <div className={styles.managerTitle}><div><span>CHAPITRE {String(selectedIndex + 1).padStart(2, "0")}</span><h2>{selected?.title}</h2></div><button>SUPPRIMER</button></div>
        <div className={styles.managerFields}><label className={styles.managerWide}><span>TITRE DU CHAPITRE</span><input value={selected?.title ?? ""} readOnly /></label><label className={styles.managerWide}><span>CONDITION DE DÉBLOCAGE</span><select defaultValue="previous"><option value="previous">Terminer le chapitre précédent</option><option value="manual">Déblocage manuel</option><option value="none">Disponible immédiatement</option></select></label></div>
        <div className={styles.questOrderHead}><div><span>ORDRE DES QUÊTES</span><small>La quête 02 se débloque après la 01</small></div><button>＋ LIER UNE QUÊTE</button></div>
        <div className={styles.orderedQuests}>{selected?.quests.map((quest, index) => <div key={quest}><i>⠿</i><em>{String(index + 1).padStart(2, "0")}</em><span><b>{quest}</b><small>{index === 0 ? "Disponible au début du chapitre" : `Après : ${selected.quests[index - 1]}`}</small></span><div><button onClick={() => moveQuest(index, -1)}>↑</button><button onClick={() => moveQuest(index, 1)}>↓</button><button>×</button></div></div>)}{selected?.quests.length === 0 && <p className={styles.emptyChapter}>Aucune quête liée à ce chapitre.</p>}</div>
      </section>
      <aside className={styles.managerPublish}><span>RÉSUMÉ</span><div><b>{chapters.length}</b><small>chapitres</small></div><div><b>{chapters.reduce((total, chapter) => total + chapter.quests.length, 0)}</b><small>quêtes classées</small></div><ul><li>✓ Ordre valide</li><li>✓ Aucun doublon</li><li>✓ Déblocages cohérents</li></ul><button>ENREGISTRER LE BROUILLON</button><button className={styles.managerPublishButton}>PUBLIER LA CAMPAGNE</button></aside>
    </div>
  </div>;
}

export default function QuestMockupPage() {
  const [screen, setScreen] = useState<Screen>("hud");
  const [rotation, setRotation] = useState<Rotation>("daily");
  const [selectedQuest, setSelectedQuest] = useState("d1");
  const [tracked, setTracked] = useState(true);
  const [dialogueLine, setDialogueLine] = useState(0);
  const [studioTab, setStudioTab] = useState<"identity" | "dialogue" | "quests" | "conditions">("identity");
  const [published, setPublished] = useState(false);

  const currentAutoQuest = useMemo(
    () => Object.values(rotations).flat().find((quest) => quest.id === selectedQuest) ?? rotations.daily[0],
    [selectedQuest],
  );

  return (
    <main className={styles.page}>
      <div className={styles.prototypeBar}>
        <div className={styles.prototypeTitle}>
          <span>{screen === "hud" ? "DIRECTION VALIDÉE" : screen === "chapterAdmin" ? "OUTIL ADMIN À VALIDER" : "3 MAQUETTES À VALIDER"}</span>
          <strong>{screen === "hud" ? "HUD EN JEU" : screen === "chapterAdmin" ? "GESTION DES CHAPITRES" : "NOUVEAU JOURNAL"}</strong>
        </div>
        <div className={styles.prototypeNav}>
          {screens.map((item) => (
            <button key={item.id} className={screen === item.id ? styles.prototypeActive : ""} onClick={() => setScreen(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <span className={styles.mockBadge}>WEB · NON INTÉGRÉ</span>
      </div>

      <section className={styles.gameFrame}>
        {screen !== "hud" && <header className={styles.header}>
          <div className={styles.brandMark}>✦</div>
          <div className={styles.brand}>
            <strong>COBBLESTAR</strong>
            <span>{screen === "studio" || screen === "editor" ? "STUDIO DE QUÊTES" : "JOURNAL D'EXPÉDITION"}</span>
          </div>
          <div className={styles.headerStatus}>
            {screen === "studio" || screen === "editor" ? (
              <><span className={styles.adminDot} /> MODE CONCEPTION</>
            ) : (
              <><span className={styles.onlineDot} /> SYNCHRONISÉ</>
            )}
          </div>
          <button className={styles.closeButton}>×</button>
        </header>}

        {screen === "hud" && <ConceptPreview variant="c" />}
        {screen === "journalA" && <JournalMockup variant="a" />}
        {screen === "journalB" && <JournalMockup variant="b" />}
        {screen === "journalC" && <JournalMockup variant="c" />}
        {screen === "chapterAdmin" && <ChapterManagerMockup />}

        {screen === "journal" && (
          <div className={styles.journalLayout}>
            <aside className={styles.chapterRail}>
              <span className={styles.eyebrow}>AVENTURE EN COURS</span>
              <h2>Fracture au crépuscule</h2>
              <p>Chapitre II · Astéria</p>
              <div className={styles.chapterArt}>
                <div className={`${styles.planet} ${styles.planetA}`} />
                <div className={`${styles.planet} ${styles.planetB}`} />
                <span className={styles.orbit} />
              </div>
              <Progress value={2} target={4} />
              <small>2 / 4 missions accomplies</small>
              <button className={styles.primaryButton} onClick={() => setScreen("chapters")}>OUVRIR LE CHAPITRE →</button>
            </aside>

            <div className={styles.journalMain}>
              <div className={styles.sectionHeading}>
                <div><span className={styles.eyebrow}>SUIVI DE TERRAIN</span><h1>Missions actives</h1></div>
                <button className={styles.minorButton} onClick={() => setScreen("rotations")}>TOUTES LES ROTATIONS</button>
              </div>
              <button className={styles.featuredQuest} onClick={() => setScreen("detail")}>
                <div className={styles.questIndex}>02</div>
                <div>
                  <span className={styles.storyLabel}>QUÊTE D&apos;HISTOIRE</span>
                  <h3>Archives sous la mousse</h3>
                  <p>Retrouve les trois balises de l&apos;ancienne station d&apos;observation.</p>
                </div>
                <div className={styles.featuredProgress}>
                  <strong>2 / 3</strong>
                  <Progress value={2} target={3} />
                  <small>MARQUÉE SUR LA STARWATCH</small>
                </div>
              </button>
              <div className={styles.autoHeading}>
                <div><span className={styles.autoPulse} /> MISSIONS AUTOMATIQUES</div>
                <small>AUCUNE ACTIVATION REQUISE</small>
              </div>
              <div className={styles.compactGrid}>
                <QuestCard quest={rotations.daily[0]} onClick={() => { setSelectedQuest("d1"); setScreen("detail"); }} />
                <QuestCard quest={rotations.weekly[0]} onClick={() => { setSelectedQuest("w1"); setScreen("detail"); }} />
                <QuestCard quest={rotations.monthly[0]} onClick={() => { setSelectedQuest("m1"); setScreen("detail"); }} />
              </div>
            </div>

            <aside className={styles.trackingRail}>
              <span className={styles.eyebrow}>QUÊTE SUIVIE</span>
              <div className={styles.trackingSignal}>⌖</div>
              <h3>Archives sous la mousse</h3>
              <p>Balise nord retrouvée</p>
              <ul>
                <li className={styles.done}>✓ Balise du lac</li>
                <li className={styles.done}>✓ Balise des ruines</li>
                <li>○ Balise de la canopée</li>
              </ul>
              <div className={styles.distance}>◇ 184 BLOCS</div>
            </aside>
          </div>
        )}

        {screen === "rotations" && (
          <div className={styles.rotationLayout}>
            <aside className={styles.rotationSidebar}>
              <span className={styles.eyebrow}>MISSIONS CYCLIQUES</span>
              <h2>Rotations</h2>
              <p>Les objectifs sont actifs dès leur apparition et progressent partout sur le serveur.</p>
              {(["daily", "weekly", "monthly"] as Rotation[]).map((key) => (
                <button key={key} className={rotation === key ? styles.rotationActive : ""} onClick={() => setRotation(key)}>
                  <span>{key === "daily" ? "JOURNALIER" : key === "weekly" ? "HEBDOMADAIRE" : "MENSUEL"}</span>
                  <small>{key === "daily" ? "17 h 42" : key === "weekly" ? "4 j 17 h" : "19 j"}</small>
                </button>
              ))}
              <div className={styles.autoRule}><span>✓</span><p><strong>SUIVI AUTOMATIQUE</strong>Aucun PNJ · aucun bouton Accepter</p></div>
            </aside>
            <div className={styles.rotationMain}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>{rotation === "daily" ? "RÉINITIALISATION À 06:00" : rotation === "weekly" ? "LUNDI À 06:00" : "1ER DU MOIS À 06:00"}</span>
                  <h1>{rotation === "daily" ? "Missions du jour" : rotation === "weekly" ? "Objectifs de la semaine" : "Défis du mois"}</h1>
                </div>
                <div className={styles.rotationCount}>{rotations[rotation].filter((q) => q.progress >= q.target).length} / {rotations[rotation].length} TERMINÉES</div>
              </div>
              <div className={styles.questList}>
                {rotations[rotation].map((quest) => (
                  <QuestCard key={quest.id} quest={quest} active={selectedQuest === quest.id} onClick={() => setSelectedQuest(quest.id)} />
                ))}
              </div>
            </div>
            <aside className={styles.rewardRail}>
              <span className={styles.eyebrow}>RÉCOMPENSE DE SÉRIE</span>
              <div className={styles.rewardOrb}>✦</div>
              <h3>{rotation === "monthly" ? "Cachet d'explorateur" : "Lot de ravitaillement"}</h3>
              <p>Complète toutes les missions de cette rotation.</p>
              <div className={styles.rewardItems}><span>⬡ 8 000</span><span>▣ x1</span><span>✦ +250 XP</span></div>
              <button className={styles.disabledButton}>RÉCOMPENSE VERROUILLÉE</button>
            </aside>
          </div>
        )}

        {screen === "chapters" && (
          <div className={styles.chapterLayout}>
            <aside className={styles.chapterSummary}>
              <span className={styles.eyebrow}>CAMPAGNE PRINCIPALE</span>
              <div className={styles.chapterNumber}>II</div>
              <h2>Fracture au crépuscule</h2>
              <p>Deux technologies, deux planètes et un signal qui n&apos;aurait jamais dû traverser l&apos;orbite.</p>
              <div className={styles.summaryStat}><span>PROGRESSION</span><strong>48%</strong></div>
              <Progress value={48} target={100} />
              <small>Récompense de chapitre : cadre « Convergence »</small>
            </aside>
            <div className={styles.timelinePanel}>
              <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>CARTE DU CHAPITRE</span><h1>Chemin de mission</h1></div><span className={styles.chapterTag}>ASTÉRIA · NIV. 35+</span></div>
              <div className={styles.timeline}>
                {storyQuests.map((quest, index) => (
                  <button key={quest.number} className={`${styles.storyNode} ${styles[quest.status]}`} onClick={() => setScreen("detail")}>
                    <span className={styles.nodeNumber}>{quest.status === "done" ? "✓" : quest.number}</span>
                    <span className={styles.nodeCopy}><strong>{quest.title}</strong><small>{quest.npc}</small></span>
                    <span className={styles.nodeStatus}>{quest.status === "done" ? "TERMINÉE" : quest.status === "active" ? "EN COURS" : quest.status === "available" ? "À DÉCOUVRIR" : "VERROUILLÉE"}</span>
                    {index < storyQuests.length - 1 && <span className={styles.nodeLine} />}
                  </button>
                ))}
              </div>
              <div className={styles.storyNotice}><span>ℹ</span><p>Les quêtes d&apos;histoire et secondaires démarrent par un dialogue. Les rotations, elles, sont toujours automatiques.</p></div>
            </div>
          </div>
        )}

        {screen === "detail" && (
          <div className={styles.detailLayout}>
            <aside className={styles.detailIdentity}>
              <button className={styles.backButton} onClick={() => setScreen("journal")}>← JOURNAL</button>
              <span className={styles.eyebrow}>{currentAutoQuest.id.startsWith("d") ? "MISSION JOURNALIÈRE" : currentAutoQuest.id.startsWith("w") ? "MISSION HEBDOMADAIRE" : currentAutoQuest.id.startsWith("m") ? "MISSION MENSUELLE" : "QUÊTE D'HISTOIRE"}</span>
              <div className={styles.detailGlyph}>{currentAutoQuest.icon}</div>
              <h2>{currentAutoQuest.title}</h2>
              <p>{currentAutoQuest.description}</p>
              <span className={styles.autoChip}>● ACTIVE AUTOMATIQUEMENT</span>
            </aside>
            <div className={styles.objectivePanel}>
              <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>OBJECTIFS</span><h1>Progression en direct</h1></div><button className={tracked ? styles.trackActive : styles.minorButton} onClick={() => setTracked(!tracked)}>{tracked ? "✓ SUIVIE" : "SUIVRE"}</button></div>
              <div className={styles.objectiveCard}>
                <div className={styles.objectiveCheck}>{currentAutoQuest.progress >= currentAutoQuest.target ? "✓" : "01"}</div>
                <div><strong>{currentAutoQuest.description}</strong><p>Progression synchronisée depuis les événements du serveur.</p><Progress value={currentAutoQuest.progress} target={currentAutoQuest.target} /></div>
                <strong>{currentAutoQuest.progress.toLocaleString("fr-FR")} / {currentAutoQuest.target.toLocaleString("fr-FR")}</strong>
              </div>
              <div className={styles.objectiveCardOptional}>
                <div className={styles.objectiveCheck}>◇</div>
                <div><strong>Objectif bonus</strong><p>Termine sans mettre K.O. ton Pokémon partenaire.</p></div>
                <span>+15% XP</span>
              </div>
              <div className={styles.eventLog}><span>DERNIER ÉVÉNEMENT</span><strong>+1 progression · Capture enregistrée il y a 2 min</strong></div>
            </div>
            <aside className={styles.detailRewards}>
              <span className={styles.eyebrow}>RÉCOMPENSES</span>
              <div className={styles.bigReward}>✦</div>
              <h3>{currentAutoQuest.reward}</h3>
              <div className={styles.rewardLine}><span>⬡</span><p><strong>2 500 CobbleCoins</strong><small>Versés automatiquement</small></p></div>
              <div className={styles.rewardLine}><span>▣</span><p><strong>Récompense mystère</strong><small>Révélée à la fin</small></p></div>
              <button className={styles.disabledButton}>OBJECTIF EN COURS</button>
            </aside>
          </div>
        )}

        {screen === "dialogue" && (
          <div className={styles.dialogueScreen}>
            <div className={styles.dialogueBackdrop} />
            <aside className={styles.npcPortrait}>
              <div className={styles.npcSilhouette}><span>✦</span></div>
              <div><span className={styles.eyebrow}>ARCHIVISTE</span><h2>Sélène</h2><p>Observatoire d&apos;Astéria</p></div>
            </aside>
            <div className={styles.dialogueBox}>
              <span className={styles.speaker}>SÉLÈNE</span>
              <p>{dialogueLine === 0 ? "Les balises n'émettent plus depuis la convergence. Pourtant, cette nuit, l'une d'elles a répondu à ton passage." : "Retrouve les trois balises. Si le signal vient bien de Nébélia, nous devons le savoir avant le prochain alignement."}</p>
              {dialogueLine === 0 ? (
                <div className={styles.dialogueChoices}>
                  <button onClick={() => setDialogueLine(1)}>« Montrez-moi où chercher. » <span>→</span></button>
                  <button>« Que savez-vous de ce signal ? » <span>→</span></button>
                  <button className={styles.leaveChoice}>Partir</button>
                </div>
              ) : (
                <div className={styles.dialogueChoices}>
                  <button className={styles.acceptChoice} onClick={() => setScreen("detail")}>ACCEPTER LA QUÊTE <span>→</span></button>
                  <button onClick={() => setDialogueLine(0)}>Revenir en arrière</button>
                </div>
              )}
            </div>
            <div className={styles.dialogueHint}>CLIC · CONTINUER &nbsp;&nbsp; [ESC] · QUITTER</div>
          </div>
        )}

        {screen === "studio" && (
          <div className={styles.studioLayout}>
            <aside className={styles.npcList}>
              <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>MONDE ACTUEL</span><h2>PNJ de quête</h2></div><button className={styles.squareButton}>＋</button></div>
              {["Archiviste Sélène", "Professeure Lyra", "Kaï le pisteur", "Guide du Warp"].map((npc, index) => (
                <button key={npc} className={index === 0 ? styles.npcActive : ""}><span className={styles.npcMini}>{index === 0 ? "S" : index === 1 ? "L" : index === 2 ? "K" : "W"}</span><span><strong>{npc}</strong><small>{index === 1 ? "Donneur d'histoire" : index === 3 ? "Validation" : "Dialogue + quête"}</small></span><i>{index === 0 ? "●" : "○"}</i></button>
              ))}
              <div className={styles.wandHelp}><span>⌁</span><p><strong>BÂTON DU SCÉNARISTE</strong>Clic droit : éditer · Maj-clic : copier</p></div>
            </aside>
            <div className={styles.studioMain}>
              <div className={styles.studioTabs}>
                {(["identity", "dialogue", "quests", "conditions"] as const).map((tab) => (
                  <button key={tab} className={studioTab === tab ? styles.studioTabActive : ""} onClick={() => setStudioTab(tab)}>{tab === "identity" ? "IDENTITÉ" : tab === "dialogue" ? "DIALOGUES" : tab === "quests" ? "QUÊTES" : "CONDITIONS"}</button>
                ))}
              </div>
              {studioTab === "identity" && (
                <div className={styles.formGrid}>
                  <label><span>NOM AFFICHÉ</span><input value="Archiviste Sélène" readOnly /></label>
                  <label><span>RÔLE</span><select defaultValue="dialogue_quest"><option value="dialogue_quest">Dialogue + déclencheur de quête</option><option>Dialogue uniquement</option><option>Validation de quête</option></select></label>
                  <label><span>APPARENCE</span><input value="cobblestar:selene_archivist" readOnly /></label>
                  <label><span>ORIENTATION</span><select defaultValue="player"><option value="player">Regarder le joueur</option><option>Orientation fixe</option></select></label>
                  <label className={styles.wideField}><span>ACCROCHE</span><input value="Les archives gardent la mémoire des deux mondes." readOnly /></label>
                  <div className={styles.toggleRow}><span>Invulnérable</span><button className={styles.toggleOn}>OUI</button><span>Immobile</span><button className={styles.toggleOn}>OUI</button><span>Nom visible</span><button className={styles.toggleOn}>OUI</button></div>
                </div>
              )}
              {studioTab === "dialogue" && (
                <div className={styles.graphEditor}>
                  <div className={styles.graphNodeStart}><span>DÉPART</span><strong>Salutation</strong><small>« Les balises se sont réveillées… »</small></div>
                  <div className={styles.graphLink} />
                  <div className={styles.graphBranch}><span>CHOIX JOUEUR</span><strong>Demander la mission</strong><small>→ Nœud 02</small></div>
                  <div className={styles.graphBranchAlt}><span>CHOIX JOUEUR</span><strong>Questionner le signal</strong><small>→ Nœud 03</small></div>
                  <button className={styles.addNode}>＋ AJOUTER UN NŒUD</button>
                </div>
              )}
              {studioTab === "quests" && (
                <div className={styles.linkedQuestPanel}><span className={styles.eyebrow}>QUÊTES LIÉES</span><div className={styles.linkedQuest}><span>02</span><div><strong>Archives sous la mousse</strong><small>Proposer si chapitre I terminé</small></div><button>MODIFIER →</button></div><button className={styles.outlineButton}>＋ LIER UNE QUÊTE EXISTANTE</button></div>
              )}
              {studioTab === "conditions" && (
                <div className={styles.conditionList}><span className={styles.eyebrow}>CONDITIONS D&apos;APPARITION ET DE DIALOGUE</span><div><span>01</span><p><strong>Chapitre précédent terminé</strong><small>story.chapter_01 == completed</small></p><button>×</button></div><div><span>02</span><p><strong>Monde autorisé</strong><small>dimension == cobblestar:asteria</small></p><button>×</button></div><button className={styles.outlineButton}>＋ AJOUTER UNE CONDITION</button></div>
              )}
            </div>
            <aside className={styles.previewRail}>
              <span className={styles.eyebrow}>APERÇU EN JEU</span>
              <div className={styles.previewNpc}>S</div>
              <h3>Archiviste Sélène</h3>
              <small>◇ Quête disponible</small>
              <p>Le joueur voit un marqueur uniquement si les conditions sont valides.</p>
              <div className={styles.validation}><span>✓</span><p><strong>CONFIGURATION VALIDE</strong>0 erreur · 1 avertissement</p></div>
            </aside>
          </div>
        )}

        {screen === "editor" && (
          <div className={styles.editorLayout}>
            <aside className={styles.stepRail}>
              <span className={styles.eyebrow}>CONSTRUCTION</span>
              <h2>Archives sous la mousse</h2>
              {["Identité", "Déclenchement", "Étapes", "Récompenses", "Validation"].map((step, index) => <button key={step} className={index === 2 ? styles.stepActive : ""}><span>0{index + 1}</span>{step}<i>{index < 2 ? "✓" : ""}</i></button>)}
            </aside>
            <div className={styles.editorMain}>
              <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>ÉTAPE 03</span><h1>Objectifs de la quête</h1></div><button className={styles.outlineButton}>＋ AJOUTER UNE ÉTAPE</button></div>
              <div className={styles.stageCard}>
                <div className={styles.stageHead}><span>ÉTAPE 1</span><input value="Réactiver les balises" readOnly /><button>⌃</button><button>×</button></div>
                <div className={styles.objectiveBuilder}>
                  <span className={styles.dragHandle}>⠿</span>
                  <select defaultValue="interact"><option value="interact">Minecraft · Interagir avec un bloc</option><option>Cobblemon · Capturer un Pokémon</option><option>Cobblemon · Gagner un combat</option><option>CobbleStar · Terminer un raid</option></select>
                  <input value="cobblestar:ancient_beacon" readOnly />
                  <input value="3" readOnly />
                  <button>×</button>
                </div>
                <div className={styles.objectiveBuilder}>
                  <span className={styles.dragHandle}>⠿</span>
                  <select defaultValue="dimension"><option value="dimension">Minecraft · Visiter une zone</option></select>
                  <input value="asteria_canopy" readOnly />
                  <input value="1" readOnly />
                  <button>×</button>
                </div>
                <button className={styles.inlineAdd}>＋ AJOUTER UN OBJECTIF</button>
              </div>
              <div className={styles.editorNotes}><span>ℹ</span><p>Chaque événement est validé côté serveur. Les objectifs peuvent être ordonnés, simultanés, optionnels ou secrets.</p></div>
            </div>
            <aside className={styles.publishRail}>
              <span className={styles.eyebrow}>PUBLICATION</span>
              <div className={styles.checkRow}><span>✓</span><p><strong>Identité</strong><small>Nom et catégorie valides</small></p></div>
              <div className={styles.checkRow}><span>✓</span><p><strong>Déclencheur</strong><small>Dialogue Sélène · nœud 02</small></p></div>
              <div className={styles.checkRow}><span>✓</span><p><strong>3 objectifs</strong><small>2 obligatoires · 1 bonus</small></p></div>
              <div className={styles.checkRowWarn}><span>!</span><p><strong>Récompense provisoire</strong><small>Commande admin détectée</small></p></div>
              <button className={published ? styles.publishedButton : styles.primaryButton} onClick={() => setPublished(true)}>{published ? "✓ VERSION PUBLIÉE" : "VALIDER ET PUBLIER"}</button>
              <button className={styles.minorButton}>TESTER EN JEU</button>
            </aside>
          </div>
        )}

        {screen !== "hud" && <footer className={styles.footer}>
          <span>[ESC] FERMER</span>
          <span>{screen === "studio" || screen === "editor" ? "CONFIGURATION SERVEUR · BROUILLON LOCAL" : "[J] JOURNAL · CLIC SUIVRE · MOLETTE DÉFILER"}</span>
          <strong>{screen === "studio" || screen === "editor" ? "● OUTILS ADMIN" : "● RÉSEAU CONNECTÉ"}</strong>
        </footer>}
      </section>
    </main>
  );
}
