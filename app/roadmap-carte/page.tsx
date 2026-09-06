"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import styles from "./roadmap.module.css";

type RoadmapStatus = "available" | "improving" | "next";
type Accent = "orange" | "sky" | "violet" | "teal";
type RoadmapItem = {
  id: string;
  chapter: string;
  eyebrow: string;
  title: string;
  summary: string;
  status: RoadmapStatus;
  image: string;
  accent: Accent;
  position: { x: number; y: number };
  highlights: string[];
};

const statusMeta: Record<RoadmapStatus, { label: string; short: string; code: string }> = {
  available: { label: "Disponible", short: "En jeu", code: "LIVE" },
  improving: { label: "En amélioration", short: "Maintenant", code: "TUNE" },
  next: { label: "Prochaine étape", short: "Ensuite", code: "NEXT" },
};

const roadmapItems: RoadmapItem[] = [
  {
    id: "mondes-persistants", chapter: "01", eyebrow: "Fondations", title: "Asteria & Nébélia",
    summary: "Deux mondes persistants pour construire, explorer et retrouver sa progression sans remise à zéro artificielle.",
    status: "available", image: "/cobblemon-lakeside.webp", accent: "sky", position: { x: 12, y: 23 },
    highlights: ["Overworld, Nether et End dédiés", "Frontières de 40 000 × 40 000", "Téléportations aléatoires sécurisées"],
  },
  {
    id: "launcher", chapter: "01", eyebrow: "Fondations", title: "Launcher automatique",
    summary: "Installer, mettre à jour et lancer CobbleStar depuis une seule interface, sans manipulation manuelle du modpack.",
    status: "available", image: "/cobblemon-desert.webp", accent: "orange", position: { x: 34, y: 12 },
    highlights: ["Installation guidée", "Mises à jour automatiques", "Connexion directe au serveur"],
  },
  {
    id: "progression", chapter: "02", eyebrow: "Progression", title: "Quêtes, métiers & talents",
    summary: "Une progression qui récompense la manière de jouer de chacun, de l’exploration à l’élevage.",
    status: "improving", image: "/cobblemon-berries.webp", accent: "violet", position: { x: 58, y: 24 },
    highlights: ["Six métiers spécialisés", "Arbres de compétences", "Journal de quêtes intégré"],
  },
  {
    id: "economie", chapter: "02", eyebrow: "Économie", title: "GTS & PokéSell",
    summary: "Des échanges lisibles, des prix utiles et une économie façonnée par l’activité réelle des joueurs.",
    status: "improving", image: "/cobblemon-shop.webp", accent: "teal", position: { x: 82, y: 13 },
    highlights: ["Historique du marché", "Vente sécurisée de Pokémon", "Valeurs adaptées à l’offre"],
  },
  {
    id: "cosmedex", chapter: "03", eyebrow: "Identité", title: "Cosmédex vivant",
    summary: "Un catalogue visuel pour équiper, désactiver et retrouver tous les éléments qui rendent un dresseur unique.",
    status: "improving", image: "/cobblemon-ocean.webp", accent: "violet", position: { x: 75, y: 47 },
    highlights: ["Effets et accessoires", "Incarnations animées", "Compagnons renommables"],
  },
  {
    id: "raids", chapter: "03", eyebrow: "Coopération", title: "Raids instanciés",
    summary: "Des combats de groupe en plusieurs vagues, construits pour jouer ensemble sans perturber le monde principal.",
    status: "available", image: "/cobblemon-team.webp", accent: "orange", position: { x: 48, y: 43 },
    highlights: ["Escouades de 1 à 5 joueurs", "Arènes temporaires", "Retour au point de départ"],
  },
  {
    id: "nouvelles-cartes", chapter: "04", eyebrow: "Collection", title: "Nouvelles séries de cartes",
    summary: "Étendre l’album avec de nouvelles illustrations et des séries thématiques sans dévaloriser la collection existante.",
    status: "next", image: "/cobblemon-ocean.webp", accent: "sky", position: { x: 20, y: 56 },
    highlights: ["Séries thématiques", "Album enrichi", "Probabilités transparentes"],
  },
  {
    id: "rotations-classees", chapter: "04", eyebrow: "Compétition", title: "Rotations classées",
    summary: "Faire évoluer les formats solo, duo et double au fil de rotations lisibles sans effacer l’historique des performances.",
    status: "next", image: "/cobblemon-team.webp", accent: "teal", position: { x: 31, y: 82 },
    highlights: ["Formats tournants", "Archives des classements", "Récompenses d’apparat"],
  },
  {
    id: "defis-clubs", chapter: "04", eyebrow: "Communauté", title: "Défis de clubs",
    summary: "Ajouter aux clubs des objectifs communs qui valorisent la coopération sans imposer une course permanente au classement.",
    status: "next", image: "/cobblemon-lakeside.webp", accent: "orange", position: { x: 68, y: 79 },
    highlights: ["Objectifs communs", "Progression collective", "Récompenses d’identité"],
  },
];

const filterOptions: { value: "all" | RoadmapStatus; label: string }[] = [
  { value: "all", label: "Toute la carte" },
  { value: "available", label: "En jeu" },
  { value: "improving", label: "En amélioration" },
  { value: "next", label: "À suivre" },
];

const particles = Array.from({ length: 26 }, (_, index) => ({
  left: (index * 37 + 11) % 97,
  top: (index * 53 + 7) % 91,
  delay: (index % 9) * -.42,
  duration: 3.8 + (index % 6) * .7,
}));

export default function RoadmapPage() {
  const pageRef = useRef<HTMLElement>(null);
  const mapScrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, x: 0, left: 0 });
  const scanTimerRef = useRef<number | null>(null);
  const [filter, setFilter] = useState<"all" | RoadmapStatus>("all");
  const [selectedId, setSelectedId] = useState(roadmapItems[0].id);
  const [followed, setFollowed] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredItems = useMemo(
    () => filter === "all" ? roadmapItems : roadmapItems.filter((item) => item.status === filter),
    [filter],
  );
  const selected = roadmapItems.find((item) => item.id === selectedId) ?? roadmapItems[0];
  const selectedIndex = roadmapItems.findIndex((item) => item.id === selected.id);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem("cobblestar:roadmap-followed");
        if (stored) setFollowed(JSON.parse(stored) as string[]);
      } catch {
        window.localStorage.removeItem("cobblestar:roadmap-followed");
      }
      const hash = window.location.hash.slice(1);
      if (roadmapItems.some((item) => item.id === hash)) setSelectedId(hash);
    });

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.setAttribute("data-visible", "true");
      });
    }, { threshold: .14 });
    document.querySelectorAll("[data-roadmap-reveal]").forEach((element) => revealObserver.observe(element));

    let ticking = false;
    const updateScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        pageRef.current?.style.setProperty("--hero-shift", `${Math.min(window.scrollY * .11, 90)}px`);
        pageRef.current?.style.setProperty("--scroll-rotation", `${Math.min(window.scrollY * .008, 7)}deg`);
        ticking = false;
      });
    };
    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    return () => {
      window.cancelAnimationFrame(frame);
      revealObserver.disconnect();
      window.removeEventListener("scroll", updateScroll);
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    };
  }, []);

  function selectItem(id: string, scrollOnMobile = false) {
    setSelectedId(id);
    window.history.replaceState(null, "", `#${id}`);
    if (scrollOnMobile && window.innerWidth < 980) {
      window.requestAnimationFrame(() => document.getElementById("mission-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function changeFilter(nextFilter: "all" | RoadmapStatus) {
    setFilter(nextFilter);
    if (nextFilter !== "all" && selected.status !== nextFilter) {
      const firstMatch = roadmapItems.find((item) => item.status === nextFilter);
      if (firstMatch) selectItem(firstMatch.id);
    }
  }

  function moveSelection(direction: -1 | 1) {
    const pool = filteredItems.length ? filteredItems : roadmapItems;
    const currentIndex = pool.findIndex((item) => item.id === selected.id);
    const safeIndex = currentIndex < 0 ? 0 : currentIndex;
    const next = pool[(safeIndex + direction + pool.length) % pool.length];
    selectItem(next.id);
  }

  function runRadar() {
    if (isScanning) return;
    setIsScanning(true);
    if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = window.setTimeout(() => {
      const pool = filteredItems.filter((item) => item.id !== selected.id);
      const target = pool[Math.floor(Math.random() * pool.length)] ?? filteredItems[0] ?? roadmapItems[0];
      selectItem(target.id);
      setIsScanning(false);
    }, 950);
  }

  function toggleFollow(id: string) {
    setFollowed((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem("cobblestar:roadmap-followed", JSON.stringify(next));
      return next;
    });
  }

  async function copyMissionLink() {
    const url = `${window.location.origin}${window.location.pathname}#${selected.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.history.replaceState(null, "", `#${selected.id}`);
    }
  }

  function tiltHero(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    event.currentTarget.style.setProperty("--tilt-x", `${y * -3.5}deg`);
    event.currentTarget.style.setProperty("--tilt-y", `${x * 4.5}deg`);
    event.currentTarget.style.setProperty("--light-x", `${50 + x * 22}%`);
    event.currentTarget.style.setProperty("--light-y", `${50 + y * 20}%`);
  }

  function resetHeroTilt(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--tilt-x", "0deg");
    event.currentTarget.style.setProperty("--tilt-y", "0deg");
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const scroller = mapScrollerRef.current;
    if (!scroller || event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
    dragRef.current = { active: true, x: event.clientX, left: scroller.scrollLeft };
    scroller.setPointerCapture(event.pointerId);
  }

  function dragMap(event: React.PointerEvent<HTMLDivElement>) {
    const scroller = mapScrollerRef.current;
    if (!scroller || !dragRef.current.active) return;
    scroller.scrollLeft = dragRef.current.left - (event.clientX - dragRef.current.x);
  }

  function stopDrag() { dragRef.current.active = false; }

  return <main className={styles.page} ref={pageRef}>
    <SiteHeader />
    <div className={styles.ambient} aria-hidden="true">{particles.map((particle, index) => <i key={index} style={{ left: `${particle.left}%`, top: `${particle.top}%`, animationDelay: `${particle.delay}s`, animationDuration: `${particle.duration}s` }} />)}</div>

    <section className={styles.hero} id="contenu">
      <div className={styles.heroCopy}>
        <div className={styles.kicker}><span>SAISON 01</span><i />CARTE D’EXPÉDITION</div>
        <h1>La suite est<br /><em>déjà en orbite.</em></h1>
        <p>Explore les systèmes CobbleStar comme une constellation : découvre ce qui vit déjà en jeu, ce que nous peaufinons et les prochains caps de l’aventure.</p>
        <div className={styles.heroActions}>
          <a href="#carte">Ouvrir la carte <span>↓</span></a>
          <button type="button" onClick={runRadar}><i />Lancer le radar</button>
        </div>
        <div className={styles.heroLegend}><span><i className={styles.available} />Disponible</span><span><i className={styles.improving} />En amélioration</span><span><i className={styles.next} />À suivre</span></div>
      </div>

      <div className={styles.heroMachine} onPointerMove={tiltHero} onPointerLeave={resetHeroTilt}>
        <div className={styles.machinePlate}>
          <div className={styles.machineGrid} />
          <div className={styles.machineRings}><i /><i /><i /></div>
          <img src="/cobblestar-logo.png" alt="Dragonite, mascotte de CobbleStar" />
          <span className={styles.machinePing}><i />SIGNAL STABLE</span>
          <span className={styles.machineCoordinate}>48° 51′ N<br />02° 21′ E</span>
          <div className={styles.machineReadout}><small>CAP ACTUEL</small><strong>Polir le cœur<br />de l’aventure.</strong><span><b>03</b> systèmes en amélioration</span></div>
        </div>
      </div>
      <a className={styles.scrollCue} href="#carte"><span>SCROLL POUR EXPLORER</span><i /></a>
    </section>

    <section className={`${styles.command} ${styles.reveal}`} id="carte" data-roadmap-reveal>
      <header className={styles.commandHeader}>
        <div><small>CONSOLE D’EXPLORATION · 09 SIGNAUX</small><h2>Choisis un signal.<br /><em>La carte réagit.</em></h2></div>
        <p>Glisse la carte, change de fréquence ou lance le radar. Chaque point ouvre une mission et peut être suivi sur cet appareil.</p>
      </header>

      <div className={styles.console}>
        <div className={styles.consoleBar}>
          <div className={styles.filters} role="group" aria-label="Fréquence de la roadmap">
            {filterOptions.map((option) => <button type="button" key={option.value} className={filter === option.value ? styles.filterActive : ""} onClick={() => changeFilter(option.value)} aria-pressed={filter === option.value}><i />{option.label}<span>{option.value === "all" ? roadmapItems.length : roadmapItems.filter((item) => item.status === option.value).length}</span></button>)}
          </div>
          <button className={`${styles.radarButton} ${isScanning ? styles.scanning : ""}`} type="button" onClick={runRadar} disabled={isScanning}><span /><b>{isScanning ? "SCAN EN COURS…" : "RADAR ALÉATOIRE"}</b></button>
        </div>

        <div className={styles.consoleBody}>
          <div className={`${styles.mapShell} ${isScanning ? styles.mapScanning : ""}`}>
            <div className={styles.mapTopline}><span><i />CARTE ACTIVE</span><small>GLISSER POUR SE DÉPLACER</small><b>{String(selectedIndex + 1).padStart(2, "0")} / {String(roadmapItems.length).padStart(2, "0")}</b></div>
            <div className={styles.mapScroller} ref={mapScrollerRef} onPointerDown={startDrag} onPointerMove={dragMap} onPointerUp={stopDrag} onPointerCancel={stopDrag} onPointerLeave={stopDrag}>
              <div className={styles.starMap}>
                <div className={styles.mapNebulaOne} /><div className={styles.mapNebulaTwo} />
                <span className={`${styles.mapZone} ${styles.zoneOne}`}>CH.01 · ORIGINE</span>
                <span className={`${styles.mapZone} ${styles.zoneTwo}`}>CH.02 · ASCENSION</span>
                <span className={`${styles.mapZone} ${styles.zoneThree}`}>CH.03 · ALLIANCE</span>
                <span className={`${styles.mapZone} ${styles.zoneFour}`}>CH.04 · HORIZON</span>
                <svg className={styles.route} viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><polyline pathLength="100" points="120,150 340,78 580,156 820,85 750,305 480,280 200,365 310,533 680,514" /></svg>
                {particles.slice(0, 18).map((particle, index) => <i className={styles.mapStar} key={index} style={{ left: `${particle.left}%`, top: `${particle.top}%`, animationDelay: `${particle.delay}s` }} />)}
                {roadmapItems.map((item, index) => {
                  const dimmed = filter !== "all" && item.status !== filter;
                  return <button type="button" key={item.id} className={`${styles.node} ${styles[item.accent]} ${selected.id === item.id ? styles.nodeActive : ""} ${dimmed ? styles.nodeDimmed : ""}`} style={{ left: `${item.position.x}%`, top: `${item.position.y}%` }} onClick={(event) => { event.stopPropagation(); if (!dimmed) selectItem(item.id, true); }} disabled={dimmed} aria-label={`${item.title}, ${statusMeta[item.status].label}`} aria-pressed={selected.id === item.id}>
                    <span className={styles.nodeOrbit}><i /><b>{String(index + 1).padStart(2, "0")}</b></span>
                    <span className={styles.nodeLabel}><small>{statusMeta[item.status].code}</small><strong>{item.title}</strong></span>
                  </button>;
                })}
                <div className={styles.scanLine} />
              </div>
            </div>
            <div className={styles.mapProgress}><span style={{ width: `${((selectedIndex + 1) / roadmapItems.length) * 100}%` }} /></div>
          </div>

          <aside className={`${styles.mission} ${styles[selected.accent]}`} id="mission-panel" key={selected.id}>
            <div className={styles.missionImage}><img src={selected.image} alt="" /><span /><b>{selected.chapter}</b></div>
            <div className={styles.missionBody}>
              <div className={styles.missionMeta}><span>MISSION {String(selectedIndex + 1).padStart(2, "0")}</span><b className={styles[selected.status]}><i />{statusMeta[selected.status].label}</b></div>
              <small>{selected.eyebrow}</small>
              <h3>{selected.title}</h3>
              <p>{selected.summary}</p>
              <ul>{selected.highlights.map((highlight) => <li key={highlight}><span>✓</span>{highlight}</li>)}</ul>
              <div className={styles.missionActions}>
                <button type="button" className={followed.includes(selected.id) ? styles.following : ""} onClick={() => toggleFollow(selected.id)}><span>{followed.includes(selected.id) ? "✓" : "+"}</span>{followed.includes(selected.id) ? "Signal suivi" : "Suivre le signal"}</button>
                <button type="button" onClick={copyMissionLink} aria-label="Copier le lien de cette étape">{copied ? "✓" : "⧉"}</button>
              </div>
              <div className={styles.missionNav}><button type="button" onClick={() => moveSelection(-1)}>← Précédent</button><span>{selectedIndex + 1} / {roadmapItems.length}</span><button type="button" onClick={() => moveSelection(1)}>Suivant →</button></div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section className={`${styles.flightLog} ${styles.reveal}`} data-roadmap-reveal>
      <div className={styles.logIntro}><small>JOURNAL DE VOL</small><h2>Une roadmap qui<br />reste honnête.</h2><p>Les animations donnent envie d’explorer. Les règles empêchent la carte de devenir une collection de promesses.</p></div>
      <div className={styles.logTrack}>
        <article className={styles.reveal} data-roadmap-reveal><span>01</span><i /><div><small>AVANT LE SIGNAL</small><h3>Concret avant d’être affiché.</h3><p>Une évolution entre sur la carte lorsqu’elle possède un objectif précis et une vraie place dans l’aventure.</p></div></article>
        <article className={styles.reveal} data-roadmap-reveal><span>02</span><i /><div><small>PENDANT LE VOYAGE</small><h3>Le cœur avant le décor.</h3><p>Le suivi, les animations et la stabilité passent avant l’empilement de nouvelles vitrines.</p></div></article>
        <article className={styles.reveal} data-roadmap-reveal><span>03</span><i /><div><small>APRÈS L’ARRIVÉE</small><h3>Disponible ne veut pas dire figé.</h3><p>Les systèmes en jeu continuent d’être ajustés grâce aux usages réels de la communauté.</p></div></article>
      </div>
    </section>

    <section className={`${styles.finalSignal} ${styles.reveal}`} data-roadmap-reveal>
      <div className={styles.finalRings}><i /><i /><img src="/cobblestar-logo.png" alt="" /></div>
      <div><small>LE VOYAGE CONTINUE</small><h2>Reviens voir<br />la constellation évoluer.</h2><p>La carte change avec CobbleStar. Les actualités expliquent chaque nouvelle arrivée en détail.</p><a href="/actualites/">Lire le journal du serveur <span>↗</span></a></div>
    </section>

    <SiteFooter />
  </main>;
}
