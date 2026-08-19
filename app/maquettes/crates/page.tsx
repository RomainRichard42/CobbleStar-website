"use client";

import { useState } from "react";
import styles from "./crates.module.css";

type Concept = "a" | "b" | "c";
type Phase = "catalog" | "opening" | "result";

const crates = [
  { id: "vote", name: "Vote", keys: 3, pity: 0, max: 0, accent: "vote", guarantee: "Aucune garantie" },
  { id: "nova", name: "Nova", keys: 2, pity: 26, max: 40, accent: "nova", guarantee: "Très rare garanti" },
  { id: "pulsar", name: "Pulsar", keys: 1, pity: 13, max: 20, accent: "pulsar", guarantee: "Très rare garanti" },
  { id: "quasar", name: "Quasar", keys: 1, pity: 8, max: 10, accent: "quasar", guarantee: "Constellation garantie" },
] as const;

const rewards = [
  { tier: "CONSTELLATION", chance: "0,5 %", name: "Grade Astral · 30 jours", icon: "✦", color: "legendary" },
  { tier: "TRÈS RARE", chance: "2,5 %", name: "Clé Quasar", icon: "⌑", color: "epic" },
  { tier: "RARE", chance: "10 %", name: "Master Ball", icon: "◉", color: "rare" },
  { tier: "PEU COMMUN", chance: "25 %", name: "8 Super Bonbons", icon: "◆", color: "uncommon" },
  { tier: "COMMUN", chance: "62 %", name: "2 500 CobbleCoins", icon: "⬡", color: "common" },
] as const;

const reel = [rewards[4], rewards[3], rewards[2], rewards[4], rewards[1], rewards[3], rewards[2]];

function CrateGlyph({ name, large = false }: { name: string; large?: boolean }) {
  return <div className={`${styles.crateGlyph} ${large ? styles.crateGlyphLarge : ""}`}><i /><b>{name.slice(0, 1)}</b><span>✦</span></div>;
}

function RewardIcon({ reward }: { reward: (typeof rewards)[number] }) {
  return <span className={`${styles.rewardIcon} ${styles[reward.color]}`}>{reward.icon}</span>;
}

function PhaseSwitch({ phase, setPhase }: { phase: Phase; setPhase: (phase: Phase) => void }) {
  return (
    <div className={styles.phaseSwitch}>
      {(["catalog", "opening", "result"] as Phase[]).map((item, index) => (
        <button key={item} className={phase === item ? styles.phaseActive : ""} onClick={() => setPhase(item)}>
          <span>0{index + 1}</span>{item === "catalog" ? "APERÇU" : item === "opening" ? "OUVERTURE" : "RÉSULTAT"}
        </button>
      ))}
    </div>
  );
}

function Pity({ current, max }: { current: number; max: number }) {
  if (!max) return <div className={styles.noPity}>OUVERTURE LIBRE · PAS DE GARANTIE</div>;
  return (
    <div className={styles.pity}>
      <div><span>GARANTIE</span><b>{current} / {max}</b></div>
      <div className={styles.progress}><i style={{ width: `${Math.min(100, current * 100 / max)}%` }} /></div>
      <small>Plus que {max - current} ouvertures maximum</small>
    </div>
  );
}

function OpeningReel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.reel} ${compact ? styles.reelCompact : ""}`}>
      <div className={styles.reelPointer}>▼</div>
      <div className={styles.reelTrack}>
        {reel.map((reward, index) => (
          <div key={`${reward.name}-${index}`} className={`${styles.reelCard} ${index === 3 ? styles.reelFocus : ""}`}>
            <RewardIcon reward={reward} /><b>{reward.name}</b><small className={styles[reward.color]}>{reward.tier}</small>
          </div>
        ))}
      </div>
      <div className={styles.reelLine} />
    </div>
  );
}

function ConceptA({ phase, setPhase }: CommonProps) {
  const crate = crates[2];
  if (phase === "opening") return (
    <div className={`${styles.screen} ${styles.screenA} ${styles[crate.accent]}`}>
      <header className={styles.gameHeader}><span>OUVERTURE EN COURS</span><b>CAISSE {crate.name.toUpperCase()}</b><small>Résultat vérifié par le serveur</small></header>
      <section className={styles.aOpening}>
        <CrateGlyph name={crate.name} large />
        <div className={styles.openingCopy}><small>CLÉ VALIDÉE</small><b>La serrure stellaire s’aligne…</b><span>Le résultat est déjà sécurisé. L’animation ne modifie pas tes chances.</span></div>
        <OpeningReel />
        <div className={styles.openingFooter}><span>RALENTISSEMENT</span><div className={styles.progress}><i style={{ width: "72%" }} /></div><b>3,8 s</b></div>
      </section>
    </div>
  );
  if (phase === "result") return <ResultScreen concept="a" crate={crate} onAgain={() => setPhase("opening")} />;
  return (
    <div className={`${styles.screen} ${styles.screenA} ${styles[crate.accent]}`}>
      <div className={styles.physicalContext}><b>CAISSE PULSAR CIBLÉE</b><span>CLIC GAUCHE · CONSULTER LE CONTENU</span><small>Le joueur reste face au bloc dans le monde.</small></div>
      <main className={styles.aShowcase}>
        <div className={styles.eyebrow}>APERÇU DU BLOC · {crate.keys} CLÉ DÉTECTÉE</div>
        <CrateGlyph name={crate.name} large />
        <h2>{crate.name}</h2><p>Une sélection lisible avant l’ouverture, avec la garantie et les chances toujours visibles.</p>
        <Pity current={crate.pity} max={crate.max} />
        <button className={styles.primaryButton}>FERMER L’APERÇU <span>×</span></button>
        <small className={styles.interactionReminder}>Pour ouvrir : reviens au jeu et fais un clic droit avec la clé Pulsar</small>
      </main>
      <aside className={styles.rewardRail}>
        <div className={styles.sectionTitle}><span>CONTENU POSSIBLE</span><small>CHANCES PAR RARETÉ</small></div>
        {rewards.map(reward => <div className={styles.rewardRow} key={reward.name}><RewardIcon reward={reward} /><span><b>{reward.name}</b><small className={styles[reward.color]}>{reward.tier}</small></span><strong>{reward.chance}</strong></div>)}
        <div className={styles.fairness}>ⓘ Les récompenses affichées correspondent exactement à la configuration serveur.</div>
      </aside>
    </div>
  );
}

function ConceptB({ phase, setPhase }: CommonProps) {
  const crate = crates[2];
  if (phase === "opening") return (
    <div className={`${styles.screen} ${styles.screenB} ${styles[crate.accent]}`}>
      <header className={styles.terminalHeader}><b>STARWATCH / CRATES / {crate.id.toUpperCase()}</b><span>TIRAGE SÉCURISÉ</span></header>
      <div className={styles.bOpeningGrid}>
        <section><small>SÉQUENCE 02/03</small><h2>SÉLECTION DU LOT</h2><OpeningReel compact /><div className={styles.tickList}><span>✓ Clé consommée</span><span>✓ Résultat reçu</span><span className={styles.waiting}>● Animation en cours</span></div></section>
        <aside><CrateGlyph name={crate.name} /><b>CAISSE {crate.name.toUpperCase()}</b><Pity current={crate.pity} max={crate.max} /><small>Maintenir ESPACE pour accélérer</small></aside>
      </div>
    </div>
  );
  if (phase === "result") return <ResultScreen concept="b" crate={crate} onAgain={() => setPhase("opening")} />;
  return (
    <div className={`${styles.screen} ${styles.screenB} ${styles[crate.accent]}`}>
      <header className={styles.terminalHeader}><b>STARWATCH / INSPECTION / CAISSE PULSAR</b><span>BLOC CIBLÉ À 2 M</span></header>
      <div className={styles.bLayout}>
        <section className={styles.bCrates}><div className={styles.sectionTitle}><span>BLOC INSPECTÉ</span><small>CLIC GAUCHE</small></div><div className={styles.bInspected}><CrateGlyph name={crate.name} large /><small>CAISSE PHYSIQUE</small><h2>{crate.name}</h2><span>1 clé Pulsar dans l’inventaire</span></div><div className={styles.controlGuide}><b>CLIC GAUCHE</b><span>Voir les récompenses</span><b>CLIC DROIT</b><span>Ouvrir avec la clé</span></div></section>
        <section className={styles.bLoot}><div className={styles.bLootHead}><span>TABLE DE BUTIN · {crate.name.toUpperCase()}</span><b>100 %</b></div>{rewards.map(reward => <div className={styles.bRewardLine} key={reward.name}><i className={styles[reward.color]} /><span>{reward.tier}</span><b>{reward.name}</b><strong>{reward.chance}</strong></div>)}</section>
        <aside className={styles.bAction}><CrateGlyph name={crate.name} large /><h2>{crate.name}</h2><Pity current={crate.pity} max={crate.max} /><button className={styles.primaryButton}>FERMER</button><small>Clic droit sur le bloc pour utiliser la clé</small></aside>
      </div>
    </div>
  );
}

function ConceptC({ phase, setPhase }: CommonProps) {
  const crate = crates[2];
  if (phase === "opening") return (
    <div className={`${styles.screen} ${styles.screenC} ${styles.cinematic} ${styles[crate.accent]}`}>
      <div className={styles.starField} />
      <div className={styles.cinematicTop}><span>OUVERTURE · {crate.name.toUpperCase()}</span><small>ÉCHAP indisponible pendant la remise</small></div>
      <div className={styles.orbit}><i /><i /><i /><CrateGlyph name={crate.name} large /></div>
      <div className={styles.cinematicCopy}><small>ANALYSE DU SIGNAL</small><h2>UNE RARETÉ SE DESSINE</h2><div className={styles.rarityTicks}>{rewards.map((reward, i) => <span key={reward.tier} className={`${styles[reward.color]} ${i < 3 ? styles.tickOn : ""}`} />)}</div></div>
      <button className={styles.skipHint}>MAINTENIR ESPACE · ACCÉLÉRER</button>
    </div>
  );
  if (phase === "result") return <ResultScreen concept="c" crate={crate} onAgain={() => setPhase("opening")} />;
  return (
    <div className={`${styles.screen} ${styles.screenC} ${styles[crate.accent]}`}>
      <div className={styles.starField} />
      <header className={styles.cHeader}><span>LECTURE DU SIGNAL PULSAR</span><b>Contenu de cette caisse</b><small>Aperçu ouvert avec un clic gauche sur le bloc.</small></header>
      <div className={styles.cSingle}><div className={styles.cPhysicalCrate}><small>BLOC CIBLÉ</small><CrateGlyph name={crate.name} large /><b>{crate.name}</b><span>1 CLÉ COMPATIBLE</span></div><div className={styles.rewardConstellation}>{rewards.map((reward, index) => <div key={reward.tier} className={`${styles.constellationReward} ${styles[reward.color]}`} style={{ transform: `rotate(${index * 72}deg) translateX(215px) rotate(${-index * 72}deg)` }}><RewardIcon reward={reward} /><span>{reward.tier}<b>{reward.chance}</b></span></div>)}</div></div>
      <div className={styles.cBottom}><div><span>{crate.guarantee.toUpperCase()}</span><Pity current={crate.pity} max={crate.max} /></div><button className={styles.primaryButton}>FERMER L’APERÇU <b>×</b></button><div className={styles.cOdds}>{rewards.slice(0, 3).map(reward => <span key={reward.tier} className={styles[reward.color]}>{reward.tier}<b>{reward.chance}</b></span>)}</div></div>
    </div>
  );
}

function ResultScreen({ concept, crate, onAgain }: { concept: Concept; crate: (typeof crates)[number]; onAgain: () => void }) {
  const won = rewards[2];
  return (
    <div className={`${styles.screen} ${styles.resultScreen} ${styles[`result${concept.toUpperCase()}`]} ${styles[crate.accent]}`}>
      <div className={styles.resultBurst}>✦</div>
      <div className={styles.resultCard}><small>CAISSE {crate.name.toUpperCase()} · {won.tier}</small><RewardIcon reward={won} /><span>RÉCOMPENSE OBTENUE</span><h2>{won.name}</h2><p>La récompense a été ajoutée à ton inventaire.</p><div className={styles.resultActions}><button onClick={onAgain}>OUVRIR À NOUVEAU</button><button>TERMINER</button></div></div>
      <aside className={styles.resultSummary}><span>NOUVEL ÉTAT</span><b>{Math.max(0, crate.keys - 1)} clé restante</b><small>{crate.max ? `Garantie : ${crate.pity + 1}/${crate.max}` : "Pas de compteur de garantie"}</small></aside>
    </div>
  );
}

type CommonProps = { phase: Phase; setPhase: (phase: Phase) => void };

export default function CratesMockupsPage() {
  const [concept, setConcept] = useState<Concept>("a");
  const [phase, setPhase] = useState<Phase>("catalog");
  const props = { phase, setPhase };
  return (
    <main className={styles.page}>
      <header className={styles.prototypeBar}>
        <div><small>COBBLESTAR · ÉTUDE UX</small><b>CAISSES & OUVERTURE</b></div>
        <nav>{(["a", "b", "c"] as Concept[]).map((item, index) => <button key={item} onClick={() => { setConcept(item); setPhase("catalog"); }} className={concept === item ? styles.conceptActive : ""}><span>0{index + 1}</span>{item === "a" ? "VITRINE ORBITALE" : item === "b" ? "TERMINAL COMPACT" : "RITUEL COSMIQUE"}</button>)}</nav>
        <PhaseSwitch phase={phase} setPhase={setPhase} />
      </header>

      <section className={styles.auditStrip}>
        <b>FLUX RÉEL RESPECTÉ</b><span>Pas de catalogue global</span><span>Clic gauche : contenu de la caisse ciblée</span><span>Clic droit + clé : ouverture directe</span><span>Résultat déterminé côté serveur</span>
      </section>

      <section className={styles.gameFrame}>
        {concept === "a" ? <ConceptA {...props} /> : concept === "b" ? <ConceptB {...props} /> : <ConceptC {...props} />}
      </section>

      <footer className={styles.notes}>
        <div><span>{concept === "a" ? "PROPOSITION A" : concept === "b" ? "PROPOSITION B" : "PROPOSITION C"}</span><b>{concept === "a" ? "La plus équilibrée" : concept === "b" ? "La plus efficace" : "La plus spectaculaire"}</b></div>
        <p>{concept === "a" ? "Aperçu clair du seul bloc ciblé, chances lisibles et roulette familière. C’est la direction la plus simple à transposer dans le mod." : concept === "b" ? "Priorité à l’information : toute la table de butin et la garantie de la caisse ciblée sont lisibles immédiatement." : "L’ouverture du bloc ciblé devient un vrai moment de récompense, avec une mise en scène propre à son type."}</p>
      </footer>
    </main>
  );
}
