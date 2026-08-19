"use client";

import { useEffect, useState } from "react";
import styles from "./legendary-hud.module.css";

type Variant = "signal" | "dex";

type Legendary = {
  name: string;
  level: number;
  condition: string;
  ready: boolean;
  dex: number;
};

const legends: Legendary[] = [
  { name: "Fezandipiti", level: 70, condition: "Aucune condition", ready: true, dex: 1016 },
  { name: "Tornadus", level: 70, condition: "Nuit", ready: true, dex: 641 },
  { name: "Type: Null", level: 70, condition: "Nuit", ready: true, dex: 772 },
  { name: "Raikou", level: 70, condition: "Pluie", ready: false, dex: 243 },
  { name: "Zapdos", level: 70, condition: "Pluie", ready: false, dex: 145 },
];

function sprite(dex: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${dex}.png`;
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} min ${String(rest).padStart(2, "0")} s`;
}

export default function LegendaryHudMockup() {
  const [variant, setVariant] = useState<Variant>("signal");
  const [seconds, setSeconds] = useState(3495);

  useEffect(() => {
    const interval = window.setInterval(
      () => setSeconds((value) => value > 0 ? value - 1 : 3600),
      1000,
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className={styles.viewport}>
      <div className={styles.world} />
      <div className={styles.vignette} />

      <section className={styles.serverHud} aria-label="Indicateur de monde sans icône">
        <i className={styles.serverRail} />
        <div>
          <span>MONDE D&apos;AVENTURE</span>
          <strong>NÉBÉLIA</strong>
          <small><b /> OVERWORLD</small>
        </div>
        <em><b />11 MS</em>
        <button aria-label="Déplier">+</button>
      </section>

      <section
        className={`${styles.legendHud} ${variant === "signal" ? styles.signalVariant : styles.dexVariant}`}
        aria-label={`Maquette ${variant === "signal" ? "Signal" : "Pokédex"}`}
      >
        <header className={styles.hudHeader}>
          <div>
            <span>{variant === "signal" ? "SIGNAL STARWATCH" : "SCAN DE ZONE"}</span>
            <strong>{variant === "signal" ? "SIGNATURES LÉGENDAIRES" : "ARCHIVES LÉGENDAIRES"}</strong>
          </div>
          <small><i /> SYNCHRONISÉ</small>
        </header>

        <div className={styles.context}>
          <div className={styles.place}>
            <small>PROCHAINE FENÊTRE <b>· NUIT</b></small>
            <strong>Plaines</strong>
            <span>Ciel dégagé <i /> Y 69</span>
          </div>
          <div className={styles.timer}>
            <small>PROCHAIN TIRAGE</small>
            <strong>{formatTimer(seconds)}</strong>
            <span><i style={{ width: `${Math.max(4, seconds / 3600 * 100)}%` }} /></span>
          </div>
        </div>

        <div className={styles.listHeading}>
          <div><i /><span>APPARITIONS POSSIBLES</span></div>
          <strong>30%</strong>
        </div>

        <div className={styles.legendList}>
          {legends.map((legend, index) => (
            <article
              key={legend.name}
              className={`${styles.legendRow} ${legend.ready ? styles.ready : styles.missing}`}
            >
              <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              <img src={sprite(legend.dex)} alt="" />
              <div className={styles.legendCopy}>
                <strong>{legend.name}</strong>
                <span>{legend.condition}</span>
              </div>
              <div className={styles.legendState}>
                <small>N.{legend.level}</small>
                <strong><i />{legend.ready ? "PRÊT" : "MANQUANT"}</strong>
              </div>
            </article>
          ))}
        </div>

        <footer>
          <span>{legends.length} SIGNATURES DANS CE BIOME</span>
          <strong>{variant === "signal" ? "STARWATCH // ACTIVE" : "DEX // ANALYSE ACTIVE"}</strong>
        </footer>
      </section>

      <aside className={styles.prototypePanel}>
        <small>MAQUETTES HUD · GUI ×2</small>
        <h1>Deux pistes,<br /><span>sans effet tableur.</span></h1>
        <p>Les portraits sont volontairement fixes, sans cadre individuel. Le HUD est un peu plus large pour laisser respirer les noms et les conditions.</p>

        <div className={styles.variantChoices}>
          <button
            className={variant === "signal" ? styles.activeChoice : ""}
            onClick={() => setVariant("signal")}
          >
            <b>A</b><span><strong>Signal épuré</strong><small>Léger, transparent, très HUD</small></span>
          </button>
          <button
            className={variant === "dex" ? styles.activeChoice : ""}
            onClick={() => setVariant("dex")}
          >
            <b>B</b><span><strong>Pokédex terrain</strong><small>Plus structuré et plus lisible</small></span>
          </button>
        </div>

        <div className={styles.rules}>
          <span><i /> Portraits immobiles</span>
          <span><i /> Aucun cadre autour des Pokémon</span>
          <span><i /> Serveur sans icône à gauche</span>
        </div>
      </aside>

      <div className={styles.prototypeFlag}>CLIQUE SUR A OU B POUR COMPARER</div>
    </main>
  );
}
