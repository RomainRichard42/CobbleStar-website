"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import styles from "./roadmap.module.css";

type Stop = {
  id: string;
  number: string;
  x: number;
  y: number;
  kicker: string;
  title: string;
  accent: string;
  copy: string;
  status: string;
  window: string;
  image: string;
  secondImage?: string;
  visual?: "worlds" | "lore" | "progression" | "economy" | "raids" | "collection" | "daycare" | "community" | "quality" | "closure";
  milestone?: string;
  nextMilestone?: string;
  placeholder?: string;
  facts: { value: string; label: string }[];
  kind?: "intro";
};

const stops: Stop[] = [
  {
    id: "depart", number: "00", x: 2, y: 0, kind: "intro", kicker: "ROADMAP · ORDRE PRÉVISIONNEL",
    title: "D’abord, on descend.", accent: "Puis chaque cran avance dans le temps.",
    copy: "Cette fois, le tracé suit l’ordre des livraisons CobbleStar. Chaque arrêt indique une fenêtre de sortie, ce qu’elle doit contenir et le jalon qui vient ensuite.",
    status: "MODE D’EMPLOI", window: "DU SOCLE AUX SAISONS", image: "/cobblemon-lakeside.webp", facts: [],
  },
  {
    id: "fondations", number: "01", x: 2, y: 1.05, kicker: "JALON 01 · FONDATIONS",
    title: "Le socle CobbleStar est assemblé.", accent: "Site, launcher & modpack",
    copy: "Avant la première saison : une identité commune, une installation guidée et une base serveur capable de recevoir les systèmes sans casser l’expérience.",
    status: "BASE ACTUELLE", window: "PHASE 00 · EN COURS DE CONSOLIDATION", image: "/cobblemon-lakeside.webp",
    visual: "quality", milestone: "Site, launcher, modpack et langage visuel commun aux interfaces CobbleStar.", nextMilestone: "Figer la version et le contenu exacts inclus au lancement.", placeholder: "Capture finale du launcher et de l’écran d’accueil du site côte à côte",
    facts: [{ value: "WEB", label: "site public" }, { value: "APP", label: "launcher guidé" }, { value: "PACK", label: "mise à jour commune" }],
  },
  {
    id: "lancement", number: "02", x: 3.025, y: 1.445, kicker: "JALON 02 · OUVERTURE",
    title: "Asteria et Nébélia ouvrent ensemble.", accent: "Le lancement public",
    copy: "Les deux mondes arrivent dans le même jalon : exploration Cobblemon, construction persistante et dimensions reliées, sans présenter l’un sans l’autre.",
    status: "PRÉVU AU LANCEMENT", window: "LANCEMENT · DATE À CONFIRMER", image: "/cobblemon-lakeside.webp", secondImage: "/cobblemon-desert.webp",
    visual: "worlds", milestone: "Asteria et Nébélia, avec leur Overworld, leur Nether et leur End.", nextMilestone: "Activer le premier fil narratif et ses quêtes en jeu.",
    facts: [{ value: "02", label: "mondes simultanés" }, { value: "06", label: "dimensions reliées" }, { value: "J0", label: "ouverture commune" }],
  },
  {
    id: "recit", number: "03", x: 3.45, y: 2.4, kicker: "JALON 03 · PREMIER ARC",
    title: "Le lore met les mondes en mouvement.", accent: "Quêtes, PNJ & indices",
    copy: "Le journal natif, les personnages liés et les lieux-signatures lancent le premier arc commun à Asteria et Nébélia.",
    status: "APRÈS L’OUVERTURE", window: "LANCEMENT + · DATE À CONFIRMER", image: "/cobblemon-ocean.webp",
    visual: "lore", milestone: "Premier chapitre narratif, journal de quêtes et PNJ localisables.", nextMilestone: "Brancher les activités durables sur la progression du joueur.", placeholder: "Capture nocturne d’un PNJ devant l’Observatoire d’Asteria",
    facts: [{ value: "ARC 01", label: "récit de départ" }, { value: "PNJ", label: "liés aux missions" }, { value: "/Q", label: "journal intégré" }],
  },
  {
    id: "progression", number: "04", x: 3.025, y: 3.355, kicker: "JALON 04 · PROGRESSION",
    title: "La Saison 01 donne plusieurs chemins.", accent: "Métiers, talents & spécialisations",
    copy: "Mineur, Bûcheron, Pêcheur, Herboriste, Ranger et Éleveur structurent la progression sans imposer une seule bonne manière de jouer.",
    status: "PRÉVU SAISON 01", window: "SAISON 01 · DATE À CONFIRMER", image: "/cobblemon-berries.webp",
    visual: "progression", milestone: "Six métiers, leurs niveaux et les premiers arbres de compétences.", nextMilestone: "Ouvrir une économie lisible pour valoriser les activités.", placeholder: "Capture du journal /quetes et de l’arbre de talents dans le client",
    facts: [{ value: "06", label: "métiers" }, { value: "100", label: "niveaux" }, { value: "BUILD", label: "choix de talents" }],
  },
  {
    id: "economie", number: "05", x: 2, y: 3.75, kicker: "JALON 05 · ÉCONOMIE",
    title: "Les échanges deviennent un système clair.", accent: "GTS, PokéSell & boutique cosmétique",
    copy: "Le marché valorise ce que les joueurs capturent et produisent. Les achats d’apparat restent séparés de la puissance pour préserver l’équilibre.",
    status: "PRÉVU SAISON 01", window: "SAISON 01 · DATE À CONFIRMER", image: "/cobblemon-shop.webp",
    visual: "economy", milestone: "GTS, PokéSell, historique de marché et boutique sans avantage pay-to-win.", nextMilestone: "Donner à cette économie un premier grand rendez-vous coopératif.", placeholder: "Capture réelle du GTS avec historique et prix d’un Pokémon sélectionné",
    facts: [{ value: "GTS", label: "échanges sécurisés" }, { value: "SELL", label: "vente Pokémon" }, { value: "0", label: "pay-to-win" }],
  },
  {
    id: "raids", number: "06", x: .975, y: 3.355, kicker: "JALON 06 · COOPÉRATION",
    title: "La première mise à jour ouvre les raids.", accent: "Escouades de 1 à 5 joueurs",
    copy: "Des salles thématiques reliées par des portes physiques, des positions individuelles et un boss final donnent un vrai objectif de groupe.",
    status: "MISE À JOUR 01", window: "APRÈS SAISON 01 · DATE À CONFIRMER", image: "/cobblemon-team.webp",
    visual: "raids", milestone: "Premier parcours de raid, vagues, rassemblement d’escouade et récompenses.", nextMilestone: "Transformer les récompenses en collections visibles et équipables.", placeholder: "Capture d’une escouade devant la herse d’une salle de raid",
    facts: [{ value: "1—5", label: "joueurs" }, { value: "04", label: "temps du parcours" }, { value: "BOSS", label: "rencontre finale" }],
  },
  {
    id: "cosmedex", number: "07", x: .55, y: 2.4, kicker: "JALON 07 · COLLECTION",
    title: "Le Cosmédex rassemble ce qui est débloqué.", accent: "Cartes, apparences & compagnons",
    copy: "La deuxième mise à jour centralise les cosmétiques activables, les incarnations, les compagnons renommables et les premières séries de cartes.",
    status: "MISE À JOUR 02", window: "APRÈS LES RAIDS · DATE À CONFIRMER", image: "/cobblemon-shop.webp",
    visual: "collection", milestone: "Cosmédex, album de cartes et gestion des éléments possédés.", nextMilestone: "Relier la collection à l’élevage et à la vie quotidienne.", placeholder: "Montage réel du Cosmédex, d’une carte rare et d’un compagnon en jeu",
    facts: [{ value: "TCG", label: "album" }, { value: "COS", label: "équipement" }, { value: "NAME", label: "compagnons" }],
  },
  {
    id: "pension", number: "08", x: .975, y: 1.445, kicker: "JALON 08 · ÉLEVAGE",
    title: "La pension enrichit la boucle quotidienne.", accent: "Couples, œufs & métier Éleveur",
    copy: "Le couple confié, le stockage PC et le suivi des œufs se rejoignent dans une interface pensée pour les joueurs qui construisent leurs lignées.",
    status: "MISE À JOUR 03", window: "APRÈS LE COSMÉDEX · DATE À CONFIRMER", image: "/cobblemon-berries.webp",
    visual: "daycare", milestone: "Pension personnelle, stockage connecté et progression du métier Éleveur.", nextMilestone: "Faire converger les systèmes dans des objectifs de clubs et de saison.", placeholder: "Capture de Maëlys avec le couple confié et les œufs disponibles",
    facts: [{ value: "02", label: "parents" }, { value: "PC", label: "stockage" }, { value: "XP", label: "éleveur" }],
  },
  {
    id: "saisons", number: "09", x: 2, y: 1.05, kicker: "JALON 09 · VIE DU SERVEUR",
    title: "Clubs et saisons prolongent la roadmap.", accent: "Un calendrier qui continuera d’évoluer",
    copy: "Défis de clubs, rotations classées, nouvelles cartes et arcs narratifs prennent ensuite le relais. Les dates seront publiées ici lorsqu’elles seront verrouillées.",
    status: "HORIZON SUIVANT", window: "CYCLE SAISONNIER · DATES À CONFIRMER", image: "/cobblemon-team.webp",
    visual: "community", milestone: "Clubs, formats classés et premiers objectifs saisonniers communs.", nextMilestone: "Publier une date et un changelog pour chaque nouvelle rotation.", placeholder: "Photo d’équipe du premier club mis à l’honneur par la saison",
    facts: [{ value: "CLUBS", label: "défis communs" }, { value: "RANK", label: "rotations" }, { value: "↻", label: "mises à jour" }],
  },
];

const stars = Array.from({ length: 32 }, (_, index) => ({
  x: (index * 47 + 9) % 99,
  y: (index * 61 + 3) % 97,
  delay: (index % 12) * -.27,
}));

const summaryNodes = stops.slice(1, 9);

function ChapterModule({ stop }: { stop: Stop }) {
  switch (stop.visual) {
    case "worlds":
      return <div className={styles.worldModule}>
        <span><b>ASTERIA</b><small>MONDE 01</small></span>
        <i aria-hidden="true">×</i>
        <span><b>NÉBÉLIA</b><small>MONDE 02</small></span>
        <div><em>OVERWORLD</em><em>NETHER</em><em>END</em></div>
      </div>;
    case "lore":
      return <div className={styles.loreModule}>
        <span>FRAGMENT · 03</span>
        <strong>L’OBSERVATOIRE<br />NE RÉPOND PLUS</strong>
        <div><i />SOURCE : PNJ LIÉ <b>INDICE TROUVÉ</b></div>
      </div>;
    case "progression":
      return <div className={styles.skillModule}>
        <div className={styles.skillPath}><i /><i /><i /><i /><i /></div>
        <div className={styles.jobStrip}>{["MINEUR", "BÛCHERON", "PÊCHEUR", "HERBORISTE", "RANGER", "ÉLEVEUR"].map((job, index) => <span key={job}><b>{String(index + 1).padStart(2, "0")}</b>{job}</span>)}</div>
      </div>;
    case "economy":
      return <div className={styles.economyModule}>
        <div><small>MARCHÉ · DERNIÈRES TRANSACTIONS</small>{[["Pokémon #0184", "+ 4 200"], ["Pokémon #0133", "+ 2 850"], ["Pokémon #0447", "+ 3 600"]].map(([name, price], index) => <span key={name}><i>{index + 1}</i><b>{name}</b><em>{price}</em></span>)}</div>
        <aside><small>ÉQUILIBRE</small><strong>100%</strong><p>Puissance achetable</p><b>0</b></aside>
      </div>;
    case "raids":
      return <div className={styles.raidModule}>
        <div className={styles.raidGate}><span>HERSE</span><b>ESCOUADE PRÊTE</b></div>
        <div className={styles.raidSteps}>{["ENTRÉE", "SALLE", "CHOIX", "BOSS"].map((step, index) => <span key={step}><i>{index + 1}</i>{step}</span>)}</div>
        <div className={styles.partySlots}>{Array.from({ length: 5 }, (_, index) => <i key={index}>{index + 1}</i>)}</div>
      </div>;
    case "collection":
      return <div className={styles.collectionModule}>
        <article><small>ALBUM</small><b>CARTE<br />017</b><span>À RÉVÉLER</span></article>
        <article><small>COSMÉDEX</small><b>12 / 24</b><span>ACTIVABLE</span></article>
        <article><small>COMPAGNON</small><b>SURNOM</b><span>RENOMMABLE</span></article>
      </div>;
    case "daycare":
      return <div className={styles.daycareModule}>
        <div><span>COUPLE CONFIÉ</span><i>01</i><b>+</b><i>02</i></div>
        <img src="/mockups/daycare/pokemon_egg.png" alt="Œuf Pokémon utilisé dans l’interface de pension" />
        <p><small>ŒUF PRÊT</small><strong>01</strong><span>ÉLEVEUR · NIV. 38</span></p>
      </div>;
    case "community":
      return <div className={styles.communityModule}>
        <div className={styles.clubCrest}><span>CS</span></div>
        <div><small>CLUB DE LA SEMAINE</small><strong>LES ASTRES</strong><span><b>04</b> MEMBRES EN LIGNE</span><span><b>12</b> DÉFIS ACCOMPLIS</span></div>
      </div>;
    case "quality":
      return <div className={styles.qualityModule}>
        {[{ name: "LISIBILITÉ", value: 92 }, { name: "COHÉRENCE", value: 88 }, { name: "FLUIDITÉ", value: 96 }].map((metric) => <span key={metric.name}><small>{metric.name}</small><i><b style={{ width: `${metric.value}%` }} /></i><strong>{metric.value}</strong></span>)}
        <div>JEU <i /> SITE <i /> LAUNCHER</div>
      </div>;
    case "closure":
      return <div className={styles.closureModule}>
        <span className={styles.closureOrbit} />
        <img src="/cobblestar-logo.png" alt="Dracolosse, mascotte de CobbleStar" />
        <div><small>CAP COMMUN</small><strong>COBBLESTAR</strong><span>LE MONDE · LES JOUEURS · LEURS HISTOIRES</span></div>
      </div>;
    default:
      return null;
  }
}

function ChapterVisual({ stop }: { stop: Stop }) {
  return <aside className={`${styles.chapterVisual} ${stop.visual ? styles[`visual_${stop.visual}`] : ""}`} aria-label={`Dossier visuel : ${stop.kicker}`}>
    <header><span>DOSSIER {stop.number}</span><i /><em>{stop.window}</em><b>{stop.status}</b></header>
    <div className={styles.visualMedia}>
      {stop.secondImage ? <div className={styles.visualSplit}>
        <figure><img src={stop.image} alt="Paysage utilisé pour représenter Asteria" /><figcaption>ASTERIA</figcaption></figure>
        <figure><img src={stop.secondImage} alt="Paysage utilisé pour représenter Nébélia" /><figcaption>NÉBÉLIA</figcaption></figure>
      </div> : <img src={stop.image} alt="Illustration actuelle du chapitre" />}
      <ChapterModule stop={stop} />
      {stop.placeholder && <div className={styles.placeholderNote}><span>PLAN IMAGE À PRODUIRE</span><p>{stop.placeholder}</p></div>}
    </div>
    <div className={styles.visualBrief}>
      <article><small>DANS CE CHAPITRE</small><p>{stop.milestone}</p></article>
      <article><small>CAP SUIVANT</small><p>{stop.nextMilestone}</p></article>
    </div>
  </aside>;
}

export default function RoadmapPokeballPage() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const interactionLockedUntilRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [revealActive, setRevealActive] = useState(false);

  useEffect(() => {
    let frame = 0;
    let running = false;
    let previousTime = performance.now();
    let activeValue = 0;
    let revealValue = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const readExactPosition = () => {
      const journey = journeyRef.current;
      if (!journey) return 0;
      const travel = Math.max(journey.offsetHeight - window.innerHeight, 1);
      const progress = Math.max(0, Math.min(1, (window.scrollY - journey.offsetTop) / travel));
      return progress * stops.length;
    };

    let targetExact = readExactPosition();
    let currentExact = targetExact;

    const renderCamera = (exact: number) => {
      const journey = journeyRef.current;
      const world = worldRef.current;
      if (!journey || !world) return;

      const lastIndex = stops.length - 1;
      const pathExact = Math.min(exact, lastIndex);
      let pathX = stops[0].x;
      let pathY = stops[0].y;

      if (pathExact <= 1) {
        const entry = pathExact * pathExact * (3 - 2 * pathExact);
        pathY = stops[0].y + (stops[1].y - stops[0].y) * entry;
      } else {
        const circleProgress = (pathExact - 1) / (lastIndex - 1);
        const angle = -Math.PI / 2 + circleProgress * Math.PI * 2;
        pathX = 2 + Math.cos(angle) * 1.45;
        pathY = 2.4 + Math.sin(angle) * 1.35;
      }

      const rawReveal = Math.max(0, Math.min(1, exact - lastIndex));
      const reveal = rawReveal * rawReveal * (3 - 2 * rawReveal);
      const finalScale = window.innerWidth < 700 ? .185 : .19;
      const scale = 1 + (finalScale - 1) * reveal;
      const normalX = -pathX * window.innerWidth;
      const normalY = -pathY * window.innerHeight;
      const finalX = window.innerWidth / 2 - 2.5 * window.innerWidth * finalScale;
      const finalY = window.innerHeight / 2 - 2.85 * window.innerHeight * finalScale;

      world.style.setProperty("--camera-x", `${normalX + (finalX - normalX) * reveal}px`);
      world.style.setProperty("--camera-y", `${normalY + (finalY - normalY) * reveal}px`);
      world.style.setProperty("--camera-scale", String(scale));
      journey.style.setProperty("--journey-progress", String(exact / stops.length));
      journey.style.setProperty("--reveal-opacity", String(reveal));
      journey.style.setProperty("--reveal-scale", String(.82 + reveal * .18));
      journey.style.setProperty("--world-opacity", String(1 - reveal * .86));
      journey.style.setProperty("--hud-opacity", String(1 - reveal));

      const nextActive = rawReveal > .52 ? stops.length : Math.round(pathExact);
      if (nextActive !== activeValue) {
        activeValue = nextActive;
        setActiveIndex(nextActive);
      }
      const nextReveal = rawReveal > .72;
      if (nextReveal !== revealValue) {
        revealValue = nextReveal;
        setRevealActive(nextReveal);
      }
    };

    const tick = (time: number) => {
      const delta = Math.min(Math.max(time - previousTime, 0), 50);
      previousTime = time;
      const blend = reduceMotion ? 1 : 1 - Math.exp(-delta / 58);
      currentExact += (targetExact - currentExact) * blend;
      if (Math.abs(targetExact - currentExact) < .00025) currentExact = targetExact;
      renderCamera(currentExact);

      if (currentExact !== targetExact) {
        frame = window.requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const scheduleCamera = () => {
      targetExact = readExactPosition();
      if (!running) {
        running = true;
        previousTime = performance.now();
        frame = window.requestAnimationFrame(tick);
      }
    };

    const currentStep = () => Math.max(0, Math.min(stops.length, Math.round(readExactPosition())));
    const insideJourney = () => {
      const journey = journeyRef.current;
      if (!journey) return false;
      const start = journey.offsetTop;
      const end = start + journey.offsetHeight - window.innerHeight;
      return window.scrollY >= start - 2 && window.scrollY <= end + 2;
    };
    const moveToStep = (index: number) => {
      const journey = journeyRef.current;
      if (!journey) return;
      const safeIndex = Math.max(0, Math.min(stops.length, index));
      const travel = journey.offsetHeight - window.innerHeight;
      interactionLockedUntilRef.current = performance.now() + (reduceMotion ? 260 : 720);
      window.scrollTo({
        top: journey.offsetTop + travel * (safeIndex / stops.length),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    };

    let wheelAmount = 0;
    let lastWheelTime = 0;
    let wheelGestureConsumed = false;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !insideJourney()) return;
      const step = currentStep();
      const direction = Math.sign(event.deltaY);
      if ((step === 0 && direction < 0) || (step === stops.length && direction > 0)) return;

      event.preventDefault();
      const now = performance.now();
      if (now - lastWheelTime > 360) {
        wheelAmount = 0;
        wheelGestureConsumed = false;
      }
      lastWheelTime = now;
      if (wheelGestureConsumed) {
        interactionLockedUntilRef.current = Math.max(interactionLockedUntilRef.current, now + 380);
        return;
      }
      if (now < interactionLockedUntilRef.current) return;

      const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? window.innerHeight
          : 1;
      wheelAmount += event.deltaY * multiplier;
      if (Math.abs(wheelAmount) < 46) return;
      wheelGestureConsumed = true;
      moveToStep(step + Math.sign(wheelAmount));
      wheelAmount = 0;
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchLastX = 0;
    let touchLastY = 0;
    let touchTracking = false;
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !insideJourney()) return;
      touchStartX = touchLastX = event.touches[0].clientX;
      touchStartY = touchLastY = event.touches[0].clientY;
      touchTracking = true;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touchTracking || event.touches.length !== 1) return;
      touchLastX = event.touches[0].clientX;
      touchLastY = event.touches[0].clientY;
      const deltaX = touchStartX - touchLastX;
      const deltaY = touchStartY - touchLastY;
      if (Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return;
      const step = currentStep();
      if ((step === 0 && deltaY < 0) || (step === stops.length && deltaY > 0)) return;
      event.preventDefault();
    };
    const onTouchEnd = () => {
      if (!touchTracking) return;
      touchTracking = false;
      const deltaX = touchStartX - touchLastX;
      const deltaY = touchStartY - touchLastY;
      if (Math.abs(deltaY) < 54 || Math.abs(deltaY) <= Math.abs(deltaX) * 1.15 || performance.now() < interactionLockedUntilRef.current) return;
      const step = currentStep();
      if ((step === 0 && deltaY < 0) || (step === stops.length && deltaY > 0)) return;
      moveToStep(step + Math.sign(deltaY));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!insideJourney() || performance.now() < interactionLockedUntilRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
      const forwards = event.key === "ArrowDown" || event.key === "PageDown" || (event.key === " " && !event.shiftKey);
      const backwards = event.key === "ArrowUp" || event.key === "PageUp" || (event.key === " " && event.shiftKey);
      if (!forwards && !backwards) return;
      const step = currentStep();
      if ((step === 0 && backwards) || (step === stops.length && forwards)) return;
      event.preventDefault();
      moveToStep(step + (forwards ? 1 : -1));
    };

    window.addEventListener("scroll", scheduleCamera, { passive: true });
    window.addEventListener("resize", scheduleCamera);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    renderCamera(currentExact);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleCamera);
      window.removeEventListener("resize", scheduleCamera);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function goTo(index: number) {
    const journey = journeyRef.current;
    if (!journey) return;
    const travel = journey.offsetHeight - window.innerHeight;
    const safeIndex = Math.max(0, Math.min(stops.length, index));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // This function only runs from an explicit navigation event, never during render.
    // eslint-disable-next-line react-hooks/purity
    interactionLockedUntilRef.current = performance.now() + (reduceMotion ? 260 : 720);
    window.scrollTo({ top: journey.offsetTop + travel * (safeIndex / stops.length), behavior: reduceMotion ? "auto" : "smooth" });
  }

  function parallax(event: React.PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width - .5) * 18}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height - .5) * 14}px`);
  }

  const direction = activeIndex === stops.length
    ? "POKÉ BALL COMPLÈTE ✦"
    : activeIndex === 0
      ? "DESCENTE ↓"
      : activeIndex < 9
        ? "TRACÉ CIRCULAIRE ↻"
        : "ZOOM ARRIÈRE ⊖";

  return <main className={styles.page}>
    <SiteHeader />
    <div className={styles.journey} ref={journeyRef}>
      <div className={styles.viewport}>
        <div className={styles.stars} aria-hidden="true">{stars.map((star, index) => <i key={index} style={{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: `${star.delay}s` }} />)}</div>
        <div className={styles.directionHud} aria-live="polite"><small>TRAJECTOIRE</small><strong>{direction}</strong></div>

        <nav className={styles.routeMap} aria-label="Parcours de la roadmap">
          <span className={styles.mapStem} /><span className={styles.mapBall} /><span className={styles.mapBelt} /><span className={styles.mapCore} />
          {stops.map((stop, index) => <button type="button" key={stop.id} className={activeIndex === index ? styles.routeActive : ""} style={{ left: `${10 + stop.x * 20}%`, top: `${5 + stop.y * 22}%` }} onClick={() => goTo(index)} aria-label={`Étape ${stop.number} : ${stop.kicker}`} aria-current={activeIndex === index ? "step" : undefined}><i /></button>)}
        </nav>

        <div className={styles.world} ref={worldRef}>
          {stops.map((stop, index) => <section className={`${styles.scene} ${activeIndex === index ? styles.sceneActive : ""} ${stop.kind === "intro" ? styles.intro : ""}`} key={stop.id} id={stop.id} style={{ left: `${stop.x * 100}vw`, top: `${stop.y * 100}vh` }} onPointerMove={parallax}>
            <div className={styles.backdrop}>
              {stop.secondImage ? <div className={styles.dualWorlds}><figure><img src={stop.image} alt="Paysage d’Asteria" /><figcaption>ASTERIA</figcaption></figure><figure><img src={stop.secondImage} alt="Paysage de Nébélia" /><figcaption>NÉBÉLIA</figcaption></figure></div> : <img src={stop.image} alt="" />}
              <span />
            </div>
            <div className={styles.sceneNumber}>{stop.number}</div>

            {stop.kind === "intro" ? <>
              <div className={styles.introCopy}><small>{stop.kicker}</small><h1>D’abord,<br /><em>on descend.</em></h1><strong>{stop.accent}</strong><p>{stop.copy}</p><div className={styles.introStats}><span><b>09</b> JALONS ORDONNÉS</span><span><b>03</b> ÉTATS LISIBLES</span><span><b>↻</b> DATES MISES À JOUR</span></div><button type="button" onClick={() => goTo(1)}>Voir le calendrier <b>↓</b></button></div>
              <div className={styles.mascotOrbit}><i /><i /><img src="/cobblestar-logo.png" alt="Dracolosse, mascotte de CobbleStar" /></div>
            </> : <div className={`${styles.chapterLayout} ${index % 2 === 0 ? styles.chapterReverse : ""}`}>
              <div className={styles.content}>
                <div className={styles.meta}><span>{stop.number} / 09</span><i /><b>{stop.kicker}</b></div>
                <div className={styles.releaseWindow}><i />{stop.window}</div>
                <h2>{stop.title}</h2><strong>{stop.accent}</strong><p>{stop.copy}</p>
                <div className={styles.facts}>{stop.facts.map((fact) => <span key={fact.label}><b>{fact.value}</b><small>{fact.label}</small></span>)}</div>
              </div>
              <ChapterVisual stop={stop} />
            </div>}

            <div className={styles.status}><i /><span>{stop.status}</span></div>
            <button className={styles.next} type="button" onClick={() => goTo(index + 1)}><span>{index === stops.length - 1 ? "RÉVÉLER LE SYMBOLE" : "CONTINUER"}</span><b>{index === 0 ? "↓" : index === stops.length - 1 ? "⊖" : "↻"}</b></button>
          </section>)}
        </div>

        <section className={`${styles.finalReveal} ${revealActive ? styles.finalRevealActive : ""}`} aria-label="Vue complète de la roadmap en Poké Ball">
          <div className={styles.ballSummary}>
            <div className={styles.ballUpper} /><div className={styles.ballLower} /><div className={styles.ballDivider} />
            {summaryNodes.map((stop, index) => {
              const positions = [[50, 5], [79, 17], [93, 49], [77, 80], [50, 94], [23, 80], [7, 49], [21, 17]];
              const [left, top] = positions[index];
              return <button key={stop.id} type="button" style={{ left: `${left}%`, top: `${top}%` }} onClick={() => goTo(index + 1)}><b>{stop.number}</b><span>{stop.kicker.split(" · ")[1] ?? stop.kicker}</span></button>;
            })}
            <div className={styles.ballLogo}><span /><img src="/cobblestar-logo.png" alt="Dracolosse, mascotte de CobbleStar" /></div>
          </div>
          <div className={styles.revealCopy}><small>VUE FINALE · 09 JALONS DANS L’ORDRE</small><h2>La Poké Ball devient le calendrier CobbleStar.</h2><p>Du socle technique aux futures saisons, chaque point représente désormais une livraison. Les dates à confirmer seront remplacées ici dès qu’elles seront verrouillées.</p><div><button type="button" onClick={() => goTo(0)}>Rejouer la chronologie ↑</button><Link href="/roadmap-carte/">Vue constellation ↗</Link></div></div>
        </section>

        <div className={styles.progress}><span /><b>{String(Math.min(activeIndex + 1, stops.length + 1)).padStart(2, "0")} / {String(stops.length + 1).padStart(2, "0")}</b></div>
        <div className={styles.wheelHint}><i /><span>1 GESTE = 1 CHAPITRE</span></div>
      </div>
    </div>
    <SiteFooter />
  </main>;
}
