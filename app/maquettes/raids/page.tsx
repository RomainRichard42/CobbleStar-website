"use client";

import { useMemo, useState } from "react";
import styles from "./raids.module.css";

type Difficulty = "facile" | "difficile";
type View = "missions" | "squad";

const missions = {
  facile: {
    eyebrow: "EXPÉDITION DÉCOUVERTE",
    title: "Lisière cristalline",
    subtitle: "Reconnaissance · Asteria",
    description: "Explore les galeries, sécurise les balises et affronte le gardien de la faille.",
    level: "45–70",
    waves: "4 secteurs",
    boss: "Gardien rare",
    team: "2 Pokémon",
    reward: "Butin rare",
    accent: "#79e7d2",
    picture: "/cobblemon-lakeside.webp",
  },
  difficile: {
    eyebrow: "OPÉRATION À HAUT RISQUE",
    title: "Faille de Nébélia",
    subtitle: "Assaut · Nébélia",
    description: "Traverse quatre secteurs instables et brise les boucliers du Pokémon Totem.",
    level: "100",
    waves: "4 secteurs",
    boss: "Totem légendaire",
    team: "2 Pokémon",
    reward: "1 chance sur 40",
    accent: "#f2a0cf",
    picture: "/cobblemon-ocean.webp",
  },
} as const;

export default function RaidMockup() {
  const [difficulty, setDifficulty] = useState<Difficulty>("difficile");
  const [view, setView] = useState<View>("missions");
  const [ready, setReady] = useState(false);
  const mission = missions[difficulty];
  const tokens = 3;
  const members = useMemo(() => [
    { name: "LhShiroe", role: "CHEF D'ESCOUADE", team: "2 / 2", ready: true },
    { name: "Emplacement libre", role: "INVITER UN DRESSEUR", team: "—", ready: false },
    { name: "Emplacement libre", role: "INVITER UN DRESSEUR", team: "—", ready: false },
    { name: "Emplacement libre", role: "INVITER UN DRESSEUR", team: "—", ready: false },
  ], []);

  return (
    <main className={styles.viewport} style={{ "--mission": mission.accent } as React.CSSProperties}>
      <div className={styles.world} />
      <section className={styles.prototype} aria-label="Maquette du centre des expéditions CobbleStar">
        <div className={styles.prototypeFlag}>MAQUETTE WEB · PAS ENCORE INTÉGRÉE AU MOD</div>

        <header className={styles.header}>
          <div className={styles.brandMark} aria-hidden="true"><span /><i /></div>
          <div className={styles.brand}>
            <small>STARWATCH // TERMINAL DU WARP RAID</small>
            <strong>COBBLESTAR</strong>
            <span>CENTRE DES EXPÉDITIONS</span>
          </div>
          <nav className={styles.steps} aria-label="Étapes du raid">
            <button className={view === "missions" ? styles.activeStep : ""} onClick={() => setView("missions")}><i>01</i><span>MISSION</span></button>
            <b />
            <button className={view === "squad" ? styles.activeStep : ""} onClick={() => setView("squad")}><i>02</i><span>ESCOUADE</span></button>
            <b />
            <button disabled><i>03</i><span>EXPÉDITION</span></button>
          </nav>
          <div className={styles.tokens}><span>✦</span><div><small>JETONS DU JOUR</small><b>{tokens} / 3</b></div></div>
          <button className={styles.close} aria-label="Fermer">×</button>
        </header>

        {view === "missions" ? (
          <div className={styles.missionView}>
            <aside className={styles.missionRail}>
              <div className={styles.railTitle}><small>MISSIONS DISPONIBLES</small><b>02 EXPÉDITIONS</b></div>
              {(Object.keys(missions) as Difficulty[]).map((key, index) => {
                const item = missions[key];
                return <button key={key} className={`${styles.missionEntry} ${difficulty === key ? styles.selectedMission : ""}`} onClick={() => setDifficulty(key)}>
                  <span className={styles.missionIndex}>0{index + 1}</span>
                  <div><small>{item.eyebrow}</small><strong>{item.title}</strong><span>{item.subtitle}</span></div>
                  <i>{key === "difficile" ? "EXPERT" : "NORMAL"}</i>
                </button>;
              })}
              <div className={styles.dailyInfo}><span>↻</span><p><b>ROTATION QUOTIDIENNE</b>Les jetons et missions sont actualisés à 06:00.</p></div>
            </aside>

            <article className={styles.missionPoster} style={{ backgroundImage: `linear-gradient(90deg, rgba(10,7,24,.96) 0%, rgba(10,7,24,.68) 48%, rgba(10,7,24,.05) 100%), url(${mission.picture})` }}>
              <div className={styles.posterCopy}>
                <small>{mission.eyebrow}</small>
                <h1>{mission.title}</h1>
                <span>{mission.subtitle}</span>
                <p>{mission.description}</p>
                <div className={styles.difficultyDots} aria-label={difficulty === "difficile" ? "Difficulté élevée" : "Difficulté normale"}>
                  {[0, 1, 2, 3, 4].map((dot) => <i key={dot} className={dot < (difficulty === "difficile" ? 5 : 2) ? styles.dotActive : ""} />)}
                </div>
              </div>
              <div className={styles.posterStamp}><span>CS</span><b>{difficulty === "difficile" ? "NIV. 100" : "NIV. 45+"}</b></div>
            </article>

            <section className={styles.briefing}>
              <div className={styles.briefHeading}><span>DOSSIER DE MISSION</span><b>{difficulty === "difficile" ? "RISQUE ÉLEVÉ" : "INITIATION"}</b></div>
              <div className={styles.stats}>
                <div><small>NIVEAU</small><strong>{mission.level}</strong></div>
                <div><small>PARCOURS</small><strong>{mission.waves}</strong></div>
                <div><small>ÉQUIPE</small><strong>{mission.team}</strong></div>
                <div><small>ACCÈS</small><strong>1 jeton</strong></div>
              </div>
              <div className={styles.objective}>
                <span className={styles.objectiveIcon}>◇</span>
                <div><small>CIBLE PRINCIPALE</small><b>{mission.boss}</b><p>Chaque membre doit préparer exactement deux Pokémon valides.</p></div>
              </div>
              <div className={styles.loot}><span>✦</span><div><small>BUTIN REMARQUABLE</small><b>{mission.reward}</b></div><button>VOIR LE BUTIN</button></div>
              <button className={styles.primary} onClick={() => setView("squad")}><span>FORMER L&apos;ESCOUADE</span><b>CONTINUER&nbsp; →</b></button>
            </section>
          </div>
        ) : (
          <div className={styles.squadView}>
            <section className={styles.squadMain}>
              <div className={styles.squadHeading}>
                <div><small>MISSION SÉLECTIONNÉE</small><h1>{mission.title}</h1><span>{mission.subtitle}</span></div>
                <button onClick={() => setView("missions")}>← CHANGER DE MISSION</button>
              </div>
              <div className={styles.memberGrid}>
                {members.map((member, index) => <button key={index} className={`${styles.memberCard} ${index === 0 ? styles.memberPresent : ""}`}>
                  <span className={styles.slotNumber}>0{index + 1}</span>
                  <div className={styles.avatar}>{index === 0 ? <><b>LH</b><i /></> : <span>+</span>}</div>
                  <div><strong>{member.name}</strong><small>{member.role}</small></div>
                  <span className={styles.partyCount}>{member.team}</span>
                  <i className={styles.status}>{index === 0 ? "PRÊT" : "LIBRE"}</i>
                </button>)}
              </div>
              <div className={styles.invitation}><span>⌕</span><input placeholder="Rechercher un dresseur à proximité…" /><button>INVITER</button></div>
            </section>

            <aside className={styles.launchPanel}>
              <div className={styles.launchTop}><small>PRÉPARATION</small><strong>ESCOUADE 1 / 4</strong><span>HÔTE · LhShiroe</span></div>
              <div className={styles.requirements}>
                <div><span>✓</span><p><b>Mission choisie</b>{mission.title}</p></div>
                <div><span>✓</span><p><b>Jeton disponible</b>Consommé uniquement au départ</p></div>
                <div><span className={!ready ? styles.pending : ""}>{ready ? "✓" : "!"}</span><p><b>Équipe Pokémon</b>Exactement 2 Pokémon requis</p></div>
              </div>
              <button className={styles.readyButton} onClick={() => setReady((value) => !value)}>{ready ? "✓ ÉQUIPE VALIDÉE" : "VÉRIFIER MON ÉQUIPE"}</button>
              <div className={styles.teamPreview}><span /><span /><i>2 POKÉMON</i></div>
              <button className={styles.primary} disabled={!ready}><span>{ready ? "LANCER L'EXPÉDITION" : "PRÉPARATION REQUISE"}</span><b>{ready ? "DÉPART →" : "VERROUILLÉ"}</b></button>
            </aside>
          </div>
        )}

        <footer className={styles.footer}>
          <div><span><kbd>ESC</kbd> FERMER</span><span><kbd>CLIC</kbd> SÉLECTIONNER</span></div>
          <b>ACCÈS EXCLUSIF DEPUIS LE GUIDE DU WARP RAID</b>
          <span className={styles.connection}><i /> TERMINAL CONNECTÉ</span>
        </footer>
      </section>
    </main>
  );
}
