"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./pokeball-fortune.module.css";

type Phase = "ready" | "spinning" | "result";

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
      <span>{reward.rarity}</span>
    </div>
  );
}

export default function PokeballFortuneMockup() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [spin, setSpin] = useState(0);
  const winner = rewards[winnerIndex];
  const wheelStyle = useMemo(() => ({
    "--landing": `${-winnerIndex * 30}deg`,
    "--spin-id": spin,
  }) as React.CSSProperties, [spin]);

  useEffect(() => {
    if (phase !== "spinning") return;
    const timer = window.setTimeout(() => setPhase("result"), 4700);
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

      <section className={styles.gameFrame}>
        <div className={styles.starfield} />
        <aside className={styles.leftPanel}>
          <div className={styles.eyebrow}>SIGNAL PULSAR · SÉRIE 07</div>
          <h1>La Pokéball<br /><em>de la fortune</em></h1>
          <p>Les Pokéballs défilent autour du noyau. Celle qui s’arrête sous le curseur libère ton lot.</p>
          <div className={styles.keyCard}><span>TA MISE</span><div><div className={styles.miniKey}>✦</div><b>1 CLÉ PULSAR</b></div><small>1 clé sera consommée au lancement</small></div>
          <div className={styles.odds}>
            <span><i className={styles.common} />COMMUN <b>52 %</b></span>
            <span><i className={styles.uncommon} />PEU COMMUN <b>27 %</b></span>
            <span><i className={styles.rare} />RARE <b>14 %</b></span>
            <span><i className={styles.epic} />TRÈS RARE <b>6 %</b></span>
            <span><i className={styles.legendary} />CONSTELLATION <b>1 %</b></span>
          </div>
        </aside>

        <section className={styles.wheelStage}>
          <div className={styles.pointer}><span>LOT SÉLECTIONNÉ</span><i /></div>
          <div className={`${styles.wheelHalo} ${phase === "spinning" ? styles.haloActive : ""}`} />
          <div key={spin} className={`${styles.wheel} ${phase === "spinning" ? styles.spinning : ""} ${phase === "result" ? styles.settled : ""}`} style={wheelStyle}>
            <div className={styles.track} />
            {rewards.map((_, index) => <Pokeball key={index} index={index} />)}
          </div>
          <div className={styles.core}>
            <small>{phase === "spinning" ? "ANALYSE" : phase === "result" ? "SIGNAL VERROUILLÉ" : "STARWATCH"}</small>
            <b>{phase === "spinning" ? "•••" : phase === "result" ? "✦" : "CS"}</b>
            <span>{phase === "spinning" ? "TIRAGE EN COURS" : phase === "result" ? winner.rarity : "FORTUNE"}</span>
          </div>
          <div className={styles.wheelShadow} />
        </section>

        <aside className={styles.rightPanel}>
          <div className={styles.rightHead}><span>RÉCOMPENSE</span><small>{phase === "result" ? "DÉVERROUILLÉE" : "EN ATTENTE"}</small></div>
          {phase === "result" ? (
            <div className={`${styles.result} ${styles[winner.color]}`}>
              <div className={styles.resultBall}><div className={styles.pokeball}><i /><b>{winner.symbol}</b></div></div>
              <small>{winner.rarity}</small><h2>{winner.name}</h2>
              <p>Ajouté directement à ton compte.</p>
              <div className={styles.resultBurst}>✦</div>
            </div>
          ) : (
            <div className={styles.mystery}><div className={styles.lockedBall}><i /><b>?</b></div><b>LE SIGNAL EST MASQUÉ</b><span>Le lot existe déjà côté serveur, l’animation ne change jamais les chances.</span></div>
          )}
          <div className={styles.history}><span>DERNIERS SIGNAUX</span><div><i className={styles.rare}>◆</i><b>Luma</b><small>Clé Nova</small></div><div><i className={styles.epic}>●</i><b>Nox</b><small>Master Ball</small></div><div><i className={styles.uncommon}>◇</i><b>Sana</b><small>8 Super Bonbons</small></div></div>
        </aside>

        <footer className={styles.actionBar}>
          <div><span>GARANTIE PULSAR</span><b>13 / 20</b><div><i /></div><small>Très rare garanti dans 7 tirages maximum</small></div>
          <button onClick={phase === "result" ? () => setPhase("ready") : launch} disabled={phase === "spinning"}>
            <span>{phase === "spinning" ? "LE CERCLE TOURNE…" : phase === "result" ? "TERMINER" : "LANCER LE TIRAGE"}</span>
            <kbd>{phase === "result" ? "↵" : "1 CLÉ"}</kbd>
          </button>
          <p><b>ESPACE</b> maintenir pour accélérer <span>·</span> <b>ÉCHAP</b> fermer avant le tirage</p>
        </footer>
      </section>

      <footer className={styles.note}><b>DIRECTION RETENUE</b><span>Une roulette circulaire constituée de vraies Pokéballs, lisible en groupe et cohérente avec la DA StarWatch. Le curseur reste fixe ; tout le cercle accélère puis ralentit naturellement.</span></footer>
    </main>
  );
}
