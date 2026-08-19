"use client";

import { useState } from "react";
import styles from "./trainer-cards.module.css";

type Concept = "passport" | "holo" | "expedition";

const team = [493, 25, 133, 282, 448, 700];
const sprite = (dex: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${dex}.png`;

function Tags() {
  return (
    <div className={styles.tags}>
      <span className={styles.grade}>ADMIN</span>
      <span className={styles.title}>✦ EXPLORATEUR STELLAIRE</span>
    </div>
  );
}

function TeamStrip() {
  return (
    <div className={styles.teamStrip}>
      <small>ÉQUIPE ACTIVE</small>
      <div>
        {team.map((dex, index) => (
          <span key={dex} className={index === 0 ? styles.partnerSlot : ""}>
            <img src={sprite(dex)} alt="" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Trainer() {
  return (
    <div className={styles.trainerStage}>
      <div className={styles.orbitOne} />
      <div className={styles.orbitTwo} />
      <img className={styles.trainer} src="https://mc-heads.net/body/LhShiroe/left" alt="Skin de LhShiroe" />
      <img className={styles.partner} src={sprite(493)} alt="Arceus, partenaire" />
      <span className={styles.partnerName}><b>Zezette</b>Arceus · N.100</span>
    </div>
  );
}

function Stats() {
  return (
    <div className={styles.stats}>
      <div><small>COBBLECOINS</small><strong>1 928 026</strong></div>
      <div><small>POKÉDEX</small><strong>487 / 1 025</strong></div>
      <div><small>SHINIES</small><strong>42</strong></div>
      <div><small>TEMPS DE JEU</small><strong>85 h 26 min</strong></div>
    </div>
  );
}

function Passport() {
  return (
    <article className={`${styles.card} ${styles.passport}`}>
      <header>
        <div><i /> <span>CARTE DE DRESSEUR</span></div>
        <b>ASTERIA // CS-805C0273</b>
      </header>
      <section className={styles.passportMain}>
        <div className={styles.passportInfo}>
          <p className={styles.eyebrow}>IDENTITÉ COBBLESTAR</p>
          <h1>LhShiroe</h1>
          <Tags />
          <Stats />
          <div className={styles.metaLine}><span>PLANÈTE <b>ASTERIA</b></span><span>MÉTIER <b>MINEUR · 100</b></span></div>
          <TeamStrip />
        </div>
        <Trainer />
      </section>
      <footer><span>ARRIVÉE · 14/08/2026</span><b>PROFIL PUBLIC</b></footer>
    </article>
  );
}

function Holo() {
  return (
    <article className={`${styles.card} ${styles.holo}`}>
      <div className={styles.holoGrid} />
      <header>
        <div><i /> <span>STARWATCH ID</span></div>
        <b>PROFIL SYNCHRONISÉ</b>
      </header>
      <section className={styles.holoMain}>
        <div className={styles.holoIdentity}>
          <span className={styles.serial}>№ B05C0273</span>
          <h1>LhShiroe</h1>
          <Tags />
          <div className={styles.holoFacts}>
            <span><small>MONDE</small>ASTERIA</span>
            <span><small>MÉTIER</small>MINEUR 100</span>
            <span><small>DEX</small>487</span>
          </div>
        </div>
        <Trainer />
        <div className={styles.holoStats}><Stats /></div>
      </section>
      <TeamStrip />
      <footer><span>✦ CARTE HOLOGRAPHIQUE PERSONNELLE</span><b>14 · 08 · 2026</b></footer>
    </article>
  );
}

function Expedition() {
  return (
    <article className={`${styles.card} ${styles.expedition}`}>
      <aside>
        <span className={styles.bigNumber}>07</span>
        <small>DOSSIER D&apos;EXPÉDITION</small>
        <strong>ASTERIA</strong>
        <p>Autorisation d&apos;exploration active</p>
      </aside>
      <div className={styles.expeditionBody}>
        <header><span>COBBLESTAR // ARCHIVES</span><b>PUBLIC</b></header>
        <section>
          <div className={styles.expeditionIdentity}>
            <p className={styles.eyebrow}>DRESSEUR ENREGISTRÉ</p>
            <h1>LhShiroe</h1>
            <Tags />
            <Stats />
            <div className={styles.metaLine}><span>PLANÈTE <b>ASTERIA</b></span><span>MÉTIER <b>MINEUR · 100</b></span></div>
          </div>
          <Trainer />
        </section>
        <TeamStrip />
      </div>
    </article>
  );
}

const concepts: Record<Concept, { letter: string; name: string; note: string }> = {
  passport: { letter: "A", name: "Passeport orbital", note: "Lisible, officiel et proche d’une vraie carte de dresseur." },
  holo: { letter: "B", name: "Holo StarWatch", note: "Plus vivant, technologique et centré sur le duo joueur–partenaire." },
  expedition: { letter: "C", name: "Dossier d’expédition", note: "Plus narratif, asymétrique et lié à l’exploration des planètes." },
};

export default function TrainerCardsMockup() {
  const [concept, setConcept] = useState<Concept>("passport");
  return (
    <main className={styles.viewport}>
      <div className={styles.world} />
      <div className={styles.vignette} />
      <section className={styles.preview}>
        {concept === "passport" && <Passport />}
        {concept === "holo" && <Holo />}
        {concept === "expedition" && <Expedition />}
      </section>
      <nav className={styles.chooser} aria-label="Choix de maquette">
        <small>CARTE DRESSEUR · 3 DIRECTIONS</small>
        {Object.entries(concepts).map(([id, item]) => (
          <button key={id} className={concept === id ? styles.active : ""} onClick={() => setConcept(id as Concept)}>
            <b>{item.letter}</b><span><strong>{item.name}</strong><small>{item.note}</small></span>
          </button>
        ))}
        <p>Les trois variantes affichent le grade LuckPerms puis le tag secondaire choisi par le joueur.</p>
      </nav>
    </main>
  );
}
