"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./pokeball-fortune.module.css";

type Phase = "ready" | "spinning" | "result";
type Concept = "pcBox" | "pokedex" | "terrain";

const concepts: { id: Concept; number: string; name: string; description: string }[] = [
  { id: "pcBox", number: "01", name: "PC BOX", description: "Écrans crème, cadres turquoise et cases inspirées du PC Cobblemon." },
  { id: "pokedex", number: "02", name: "POKÉDEX", description: "Rouge Pokéball, panneaux ivoire et lecture proche d’un Pokédex." },
  { id: "terrain", number: "03", name: "TERRAIN", description: "Blocs verts, pierre sombre et accents orange façon interface Minecraft." },
];

const rewards = [
  { name: "5 000 CobbleCoins", rarity: "COMMUN", color: "common", symbol: "⬡" },
  { name: "8 Super Bonbons", rarity: "PEU COMMUN", color: "uncommon", symbol: "◆" },
  { name: "Clé Nova", rarity: "RARE", color: "rare", symbol: "⌑" },
  { name: "Master Ball", rarity: "TRÈS RARE", color: "epic", symbol: "●" },
  { name: "Grade Astral · 30 j", rarity: "CONSTELLATION", color: "legendary", symbol: "✦" },
  { name: "Capsule d’Argent", rarity: "RARE", color: "rare", symbol: "◇" },
  { name: "2 500 CobbleCoins", rarity: "COMMUN", color: "common", symbol: "⬡" },
  { name: "Poké Ball cosmétique", rarity: "EXCLUSIF", color: "pulsar", symbol: "◉" },
  { name: "Pierre évolutive", rarity: "PEU COMMUN", color: "uncommon", symbol: "◆" },
  { name: "Clé Pulsar", rarity: "TRÈS RARE", color: "epic", symbol: "⌑" },
  { name: "1 000 CobbleCoins", rarity: "COMMUN", color: "common", symbol: "⬡" },
  { name: "Ruban stellaire", rarity: "RARE", color: "rare", symbol: "✧" },
] as const;

const winnerIndex = 7;

function Pokeball({ index }: { index: number }) {
  const reward = rewards[index];
  return (
    <div className={`${styles.ballSlot} ${styles[reward.color]}`} style={{ "--slot": index } as React.CSSProperties}>
      <div className={styles.pokeball}><i /><b>{reward.symbol}</b></div>
      <span><strong>{reward.name}</strong><small>{reward.rarity}</small></span>
    </div>
  );
}

export default function PokeballFortuneMockup() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [concept, setConcept] = useState<Concept>("pcBox");
  const [spin, setSpin] = useState(0);
  const winner = rewards[winnerIndex];
  const wheelStyle = useMemo(() => ({
    "--landing": `${-winnerIndex * 30}deg`,
    "--spin-id": spin,
  }) as React.CSSProperties, [spin]);

  useEffect(() => {
    if (phase !== "spinning") return;
    const timer = window.setTimeout(() => setPhase("result"), 9200);
    return () => window.clearTimeout(timer);
  }, [phase, spin]);

  const launch = () => {
    if (phase === "spinning") return;
    setSpin(value => value + 1);
    setPhase("spinning");
  };

  return (
    <main className={styles.page}>
      <header className={styles.prototypeBar}>
        <div><small>COBBLESTAR · MAQUETTE INTERACTIVE</small><b>POKÉBALL DE LA FORTUNE</b></div>
        <div className={styles.flow}><span className={phase === "ready" ? styles.active : ""}>01 · PRÊT</span><i /><span className={phase === "spinning" ? styles.active : ""}>02 · TIRAGE</span><i /><span className={phase === "result" ? styles.active : ""}>03 · LOT</span></div>
        <div className={styles.safe}><i /> RÉSULTAT SÉCURISÉ CÔTÉ SERVEUR</div>
      </header>

      <nav className={styles.conceptSwitch} aria-label="Choisir une direction artistique">
        <div><small>DIRECTION VISUELLE</small><b>3 MAQUETTES CUBIQUES</b></div>
        {concepts.map(item => (
          <button key={item.id} className={concept === item.id ? styles.selectedConcept : ""} onClick={() => setConcept(item.id)}>
            <span>{item.number}</span><b>{item.name}</b><small>{item.description}</small>
          </button>
        ))}
      </nav>

      <section className={`${styles.gameFrame} ${styles[concept]}`}>
        <div className={styles.starfield} />
        <aside className={styles.leftPanel}>
          <div className={styles.eyebrow}>CAISSE PULSAR · TERMINAL 07</div>
          <h1>Pokéball<br /><em>Fortune</em></h1>
          <p>Chaque case représente un lot réel de la caisse. La Pokéball sous le curseur est celle que tu récupères.</p>
          <div className={styles.keyCard}><span>TA MISE</span><div><div className={styles.miniKey}>✦</div><b>1 CLÉ PULSAR</b></div><small>1 clé sera consommée au lancement</small></div>
          <div className={styles.odds}>
            <strong>CHANCES DE TIRAGE</strong>
            <span><i className={styles.common} />COMMUN <b>52 %</b></span>
            <span><i className={styles.uncommon} />PEU COMMUN <b>27 %</b></span>
            <span><i className={styles.rare} />RARE <b>14 %</b></span>
            <span><i className={styles.epic} />TRÈS RARE <b>6 %</b></span>
            <span><i className={styles.legendary} />CONSTELLATION <b>1 %</b></span>
          </div>
        </aside>

        <section className={styles.wheelStage}>
          <div className={styles.pointer}><span>CASE SÉLECTIONNÉE</span><i /></div>
          <div className={`${styles.wheelHalo} ${phase === "spinning" ? styles.haloActive : ""}`} />
          <div key={spin} className={`${styles.wheel} ${phase === "spinning" ? styles.spinning : ""} ${phase === "result" ? styles.settled : ""}`} style={wheelStyle}>
            <div className={styles.track} />
            {rewards.map((_, index) => <Pokeball key={index} index={index} />)}
          </div>
          <div className={styles.core}>
            <small>{phase === "spinning" ? "LECTURE EN COURS" : phase === "result" ? "LOT VALIDÉ" : "COBBLESTAR"}</small>
            <b>{phase === "spinning" ? "•••" : phase === "result" ? "✦" : "CS"}</b>
            <span>{phase === "spinning" ? "ROUE EN MOUVEMENT" : phase === "result" ? winner.rarity : "OUVRIR"}</span>
          </div>
          <div className={styles.wheelShadow} />
        </section>

        <aside className={styles.rightPanel}>
          <div className={styles.rightHead}><span>CONTENU DE LA CAISSE</span><small>12 LOTS AFFICHÉS</small></div>
          {phase === "result" ? (
            <div className={`${styles.result} ${styles[winner.color]}`}>
              <div className={styles.resultBall}><div className={styles.pokeball}><i /><b>{winner.symbol}</b></div></div>
              <small>{winner.rarity}</small><h2>{winner.name}</h2>
              <p>Ajouté directement à ton compte.</p>
              <div className={styles.resultBurst}>✦</div>
            </div>
          ) : (
            <div className={styles.rewardCatalog}>
              {rewards.slice(0, 8).map((item, index) => (
                <div className={`${styles.catalogItem} ${styles[item.color]}`} key={`${item.name}-${index}`}>
                  <i>{item.symbol}</i><span><b>{item.name}</b><small>{item.rarity}</small></span>
                </div>
              ))}
            </div>
          )}
          <div className={styles.serverNote}><b>✓ LOT SERVEUR</b><span>L’animation affiche uniquement la récompense déjà tirée.</span></div>
        </aside>

        <footer className={styles.actionBar}>
          <div><span>GARANTIE PULSAR</span><b>13 / 20</b><div><i /></div><small>Très rare garanti dans 7 tirages maximum</small></div>
          <button onClick={phase === "result" ? () => setPhase("ready") : launch} disabled={phase === "spinning"}>
            <span>{phase === "spinning" ? "LE CERCLE TOURNE…" : phase === "result" ? "TERMINER" : "LANCER LE TIRAGE"}</span>
            <kbd>{phase === "result" ? "↵" : "1 CLÉ"}</kbd>
          </button>
          <p><b>10,5 S</b> de tirage doux <span>·</span> <b>ÉCHAP</b> fermer avant le tirage</p>
        </footer>
      </section>

      <footer className={styles.note}><b>{concepts.find(item => item.id === concept)?.name}</b><span>{concepts.find(item => item.id === concept)?.description} Le cercle reste lisible, mais chaque récompense vit maintenant dans une vraie case cubique.</span></footer>
    </main>
  );
}
