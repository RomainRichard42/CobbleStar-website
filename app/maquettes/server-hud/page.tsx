"use client";

import { useState } from "react";
import styles from "./server-hud.module.css";

type ServerId = "spawn" | "asteria" | "nebelia";

const servers = {
  spawn: {
    eyebrow: "RÉSEAU COBBLESTAR",
    name: "SPAWN CENTRAL",
    dimension: "OVERWORLD",
    players: 84,
    ping: 26,
    accent: "#8e78ff",
    secondary: "#73e6ef",
    glyph: "hub",
  },
  asteria: {
    eyebrow: "MONDE D'AVENTURE",
    name: "ASTÉRIA",
    dimension: "OVERWORLD",
    players: 57,
    ping: 31,
    accent: "#72e5ee",
    secondary: "#a58bff",
    glyph: "star",
  },
  nebelia: {
    eyebrow: "MONDE D'AVENTURE",
    name: "NÉBÉLIA",
    dimension: "OVERWORLD",
    players: 42,
    ping: 34,
    accent: "#f19acb",
    secondary: "#9c78ff",
    glyph: "moon",
  },
} as const;

function WorldGlyph({ type }: { type: string }) {
  return (
    <span className={`${styles.glyph} ${styles[type]}`} aria-hidden="true">
      <i className={styles.glyphCore} />
      <i className={styles.glyphOrbit} />
      <i className={styles.glyphSpark} />
    </span>
  );
}

export default function ServerHudMockup() {
  const [selected, setSelected] = useState<ServerId>("nebelia");
  const [expanded, setExpanded] = useState(true);
  const server = servers[selected];

  return (
    <main
      className={styles.viewport}
      style={{ "--accent": server.accent, "--secondary": server.secondary } as React.CSSProperties}
    >
      <div className={styles.world} />
      <div className={styles.vignette} />

      <section className={styles.hudStage} aria-label="Maquette de l'indicateur de serveur">
        <button
          className={`${styles.serverHud} ${expanded ? styles.open : ""}`}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <span className={styles.activeRail} />
          <span className={styles.iconFrame}><WorldGlyph type={server.glyph} /></span>
          <span className={styles.copy}>
            <span className={styles.eyebrow}>{server.eyebrow}</span>
            <strong>{server.name}</strong>
            <span className={styles.dimension}><i />{server.dimension}</span>
          </span>
          <span className={styles.network}>
            <i />
            <span>{server.ping}<small> ms</small></span>
          </span>
          <span className={styles.chevron}>{expanded ? "−" : "+"}</span>
        </button>

        <div className={`${styles.drawer} ${expanded ? styles.drawerOpen : ""}`}>
          <div className={styles.drawerStat}>
            <span>JOUEURS</span>
            <strong>{server.players}</strong>
          </div>
          <div className={styles.drawerStat}>
            <span>LATENCE</span>
            <strong>{server.ping} MS</strong>
          </div>
          <div className={styles.drawerStat}>
            <span>ÉTAT</span>
            <strong className={styles.online}>STABLE</strong>
          </div>
        </div>
      </section>

      <aside className={styles.prototypePanel}>
        <small>MAQUETTE HUD · CLIQUE SUR L&apos;INDICATEUR</small>
        <h1>Présence discrète,<br /><span>identité immédiate.</span></h1>
        <p>Un seul composant compact. La couleur et le symbole indiquent le monde avant même de lire son nom.</p>
        <div className={styles.serverChoices}>
          {(Object.keys(servers) as ServerId[]).map((id) => (
            <button key={id} className={selected === id ? styles.selected : ""} onClick={() => setSelected(id)}>
              <WorldGlyph type={servers[id].glyph} />
              <span><small>{servers[id].dimension}</small><strong>{servers[id].name}</strong></span>
              <i />
            </button>
          ))}
        </div>
        <div className={styles.notes}>
          <span><b>01</b> Toujours visible</span>
          <span><b>02</b> Transparent</span>
          <span><b>03</b> Dépliable</span>
        </div>
      </aside>

      <div className={styles.coordinateHint}>HUD JOUEUR · POSITION HAUT GAUCHE · ÉCHELLE GUI ×2</div>
    </main>
  );
}
