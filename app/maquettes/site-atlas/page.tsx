"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useDownloadUrl } from "@/app/components/DownloadLauncher";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { HOME_FAQ } from "@/app/lib/faq";
import newsData from "../../../news.default.json";
import styles from "./site-atlas.module.css";

const SERVER_ADDRESS = "play.cobblestar-mc.fr";

const mainNavigation = [
  { label: "Accueil", href: "/maquettes/site-atlas/" },
  { label: "Actualités", href: "/actualites/" },
  { label: "Boutique", href: "/boutique/" },
  { label: "Votes", href: "/vote/" },
  { label: "Roadmap", href: "/roadmap/" },
  { label: "Wiki", href: "/wiki/" },
] as const;

const adventures = [
  {
    number: "01",
    label: "Explorer",
    title: "Deux mondes, une aventure sans rails.",
    description: "Traverse Asteria et Nébélia, découvre leurs biomes et suis les apparitions légendaires sans itinéraire imposé.",
    image: "/cobblemon-lakeside.webp",
    tone: "sky",
  },
  {
    number: "02",
    label: "Progresser",
    title: "Ton parcours te ressemble.",
    description: "Quêtes, six métiers, arbres de compétences et Battle Pass récompensent ce que tu aimes vraiment faire.",
    image: "/cobblemon-berries.webp",
    tone: "orange",
  },
  {
    number: "03",
    label: "Découvrir",
    title: "Le monde se lit entre les lignes.",
    description: "Explore les lieux, écoute les personnages et rassemble les fragments d’un lore qui relie Asteria et Nébélia.",
    image: "/cobblemon-ocean.webp",
    tone: "violet",
  },
  {
    number: "04",
    label: "Jouer ensemble",
    title: "Les rencontres font le serveur.",
    description: "Forme ton équipe pour les raids, échange sur le GTS et développe ton club sans jamais perdre ta progression.",
    image: "/cobblemon-team.webp",
    tone: "teal",
  },
] as const;

const chapters = {
  exploration: {
    index: "CHAPITRE 01",
    eyebrow: "Exploration libre",
    title: "Asteria au lever du jour. Nébélia quand l’appel de l’inconnu se fait sentir.",
    copy: "Deux mondes persistants, chacun avec son Overworld, son Nether et son End. Pas de décor jetable : tu construis, tu explores et tu reviens exactement là où ton histoire continue.",
    image: "/cobblemon-desert.webp",
    facts: ["Frontières de 40 000 × 40 000", "Téléportations aléatoires sécurisées", "Événements légendaires localisés"],
  },
  progression: {
    index: "CHAPITRE 02",
    eyebrow: "Progression personnelle",
    title: "Un métier, une spécialité, cent niveaux pour la maîtriser.",
    copy: "Mineur, Bûcheron, Pêcheur, Herboriste, Ranger ou Éleveur : chaque activité apporte ses propres bonus. Les quêtes et le Battle Pass complètent ton parcours sans dicter ta façon de jouer.",
    image: "/cobblemon-berries.webp",
    facts: ["6 métiers actifs", "Arbres de compétences", "100 paliers saisonniers"],
  },
  lore: {
    index: "CHAPITRE 03",
    eyebrow: "Lore vivant",
    title: "Une histoire à découvrir dans le monde, pas dans un pavé de texte.",
    copy: "Asteria et Nébélia partagent des traces, des personnages et des mystères. Le lore se dévoile par les quêtes, les lieux et les événements, avec des fragments que la communauté peut relier ensemble.",
    image: "/cobblemon-ocean.webp",
    facts: ["Deux mondes liés", "Personnages et lieux mémorables", "Mystères communautaires"],
  },
  communaute: {
    index: "CHAPITRE 04",
    eyebrow: "Économie et entraide",
    title: "Une économie de joueurs, pas une boutique qui joue à leur place.",
    copy: "Le GTS, PokéSell et les raids créent une économie vivante. La boutique finance le projet avec des objets cosmétiques et des probabilités publiques, sans vendre la victoire.",
    image: "/cobblemon-shop.webp",
    facts: ["GTS avec analyse du marché", "Raids instanciés de 1 à 5", "Boutique sans pay-to-win"],
  },
} as const;

type ChapterKey = keyof typeof chapters;

const statusItems = [
  { title: "Asteria & Nébélia", detail: "Mondes persistants", status: "Disponible", kind: "live" },
  { title: "Quêtes & métiers", detail: "Progression serveur", status: "Disponible", kind: "live" },
  { title: "GTS & PokéSell", detail: "Économie joueurs", status: "Disponible", kind: "live" },
  { title: "Raids instanciés", detail: "Escouades de 1 à 5", status: "Disponible", kind: "live" },
  { title: "Clubs", detail: "Organisations", status: "Actif", kind: "live" },
  { title: "Combats classés", detail: "Solo, duo et double", status: "Disponible", kind: "live" },
] as const;

const fieldNotes = [
  { code: "RAID", title: "Quatre vagues, puis le boss", copy: "Des arènes temporaires pour 1 à 5 joueurs, avec retour exact à ton point de départ." },
  { code: "MARCHÉ", title: "Une économie qui respire", copy: "GTS, historique des prix et PokéSell avec une valeur qui évolue selon l’offre réelle." },
  { code: "PENSION", title: "Élever sans perdre ses repères", copy: "Confie deux Pokémon au PNJ de la pension et accélère les cycles avec le métier Éleveur." },
  { code: "CAISSES", title: "Du hasard, mais transparent", copy: "Vote, Nova, Pulsar et Quasar affichent leurs chances, leur historique et leurs garanties." },
  { code: "HUD", title: "Les légendaires de ta zone", copy: "Conditions locales et prochain événement restent visibles sans polluer ton chat." },
  { code: "PROFIL", title: "Une identité de dresseur", copy: "Carte de profil, double tag, cosmétiques persistants et compagnon renommable." },
] as const;

export function AtlasLanding({ home = false }: { home?: boolean }) {
  const downloadUrl = useDownloadUrl();
  const [copied, setCopied] = useState(false);
  const [activeChapter, setActiveChapter] = useState<ChapterKey>("exploration");
  const chapter = chapters[activeChapter];
  const articles = newsData.articles.filter((article) => article.published).slice(0, 3);

  function copyAddress() {
    navigator.clipboard.writeText(SERVER_ADDRESS).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <main className={styles.atlas}>
      {home ? <SiteHeader /> : <header className={styles.header}>
        <Link href="/maquettes/site-atlas/" className={styles.brand} aria-label="CobbleStar, accueil de la proposition Atlas">
          <span className={styles.brandMark}>
            <Image src="/cobblestar-logo.png" alt="" width={54} height={54} priority />
          </span>
          <span>
            <strong>CobbleStar</strong>
            <small>Le monde des dresseurs</small>
          </span>
        </Link>

        <nav className={styles.navigation} aria-label="Navigation principale">
          {mainNavigation.map((item) => <Link className={item.href === "/maquettes/site-atlas/" ? styles.navActive : ""} href={item.href} key={item.label}>{item.label}</Link>)}
        </nav>

        <details className={styles.mobileNav}>
          <summary aria-label="Ouvrir la navigation"><i /><i /><i /></summary>
          <div>{mainNavigation.map((item) => <Link className={item.href === "/maquettes/site-atlas/" ? styles.navActive : ""} href={item.href} key={item.label}>{item.label}</Link>)}</div>
        </details>

        <a className={styles.headerCta} href={downloadUrl}>
          <span>Télécharger</span>
          <b aria-hidden="true">↓</b>
        </a>
      </header>}

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.overline}><span>SAISON 01</span><i />MINECRAFT 1.21.1</div>
          <h1>Deux mondes.<br /><em>Ton histoire.</em><br />Tes rencontres.</h1>
          <p>
            Explore Asteria et Nébélia, progresse à ton rythme et découvre un lore
            qui se raconte à travers les lieux, les quêtes et les joueurs.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href={downloadUrl}>Installer le launcher <span>↗</span></a>
            <button className={styles.addressButton} type="button" onClick={copyAddress}>
              <span><small>ADRESSE DU SERVEUR</small><strong>{SERVER_ADDRESS}</strong></span>
              <b>{copied ? "Copié !" : "Copier"}</b>
            </button>
          </div>
          <div className={styles.heroProof}>
            <span><b>01</b> Launcher automatique</span>
            <span><b>02</b> Aucune installation manuelle</span>
            <span><b>03</b> Lore à découvrir en jeu</span>
          </div>
        </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroPhoto}>
              <div className={styles.heroWorld}><Image src="/cobblemon-lakeside.webp" alt="Paysage d’Asteria" fill priority sizes="(max-width: 900px) 92vw, 25vw" /><span>Asteria</span></div>
              <div className={styles.heroWorld}><Image src="/cobblemon-desert.webp" alt="Paysage de Nébélia" fill priority sizes="(max-width: 900px) 92vw, 25vw" /><span>Nébélia</span></div>
            </div>
          <div className={styles.heroLogo}>
            <Image src="/cobblestar-logo.png" alt="Dragonite, mascotte de CobbleStar" width={430} height={430} priority />
          </div>
          <div className={styles.postcard}>
            <small>DEUX MONDES · UN MÊME RÉCIT</small>
            <strong>Asteria + Nébélia</strong>
            <span>Exploration libre · Lore vivant</span>
          </div>
          <span className={styles.heroStamp}>FR<br />1.21</span>
        </div>
      </section>

      <div className={styles.ticker} aria-hidden="true">
        <span>ASTERIA + NÉBÉLIA</span><i>✦</i><span>LORE À DÉCOUVRIR</span><i>✦</i><span>COMMUNAUTÉ FRANCOPHONE</span><i>✦</i><span>SANS PAY-TO-WIN</span>
      </div>

      <section className={styles.adventureSection} id="aventures">
        <div className={styles.sectionIntro}>
          <div><small>CHOISIS TON AVENTURE</small><h2>Tout commence par<br />ce que tu aimes.</h2></div>
          <p>Pas de liste interminable de fonctionnalités. Voici quatre façons d’entrer dans CobbleStar — et tu peux passer de l’une à l’autre quand tu veux.</p>
        </div>
        <div className={styles.adventureGrid}>
          {adventures.map((item) => (
            <article className={`${styles.adventureCard} ${styles[item.tone]}`} key={item.number}>
              <div className={styles.cardPhoto}><Image src={item.image} alt="" fill sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 23vw" /></div>
              <div className={styles.cardTop}><span>{item.number}</span><small>{item.label}</small></div>
              <div className={styles.cardBody}><h3>{item.title}</h3><p>{item.description}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.worldSection} id="mondes">
        <div className={styles.worldMap}>
          <div className={styles.worldImage}><Image src="/cobblemon-desert.webp" alt="Paysage chaud d’Asteria" fill sizes="(max-width: 900px) 100vw, 55vw" /></div>
          <div className={styles.worldImage}><Image src="/cobblemon-ocean.webp" alt="Paysage côtier de Nébélia" fill sizes="(max-width: 900px) 100vw, 45vw" /></div>
          <span className={styles.mapRoute} />
          <div className={styles.worldLabelA}><small>MONDE 01</small><strong>Asteria</strong><span>Les terres du premier départ</span></div>
          <div className={styles.worldLabelB}><small>MONDE 02</small><strong>Nébélia</strong><span>L’horizon des explorateurs</span></div>
          <div className={styles.worldSeal}><Image src="/cobblestar-logo.png" alt="" width={94} height={94} /></div>
        </div>
        <div className={styles.worldCopy}>
          <small>L’ATLAS COBBLESTAR</small>
          <h2>Deux mondes.<br />Six dimensions.<br /><em>Une seule histoire.</em></h2>
          <p>Chaque monde conserve ses constructions et ses repères. Voyage entre leurs dimensions, installe ton foyer, puis reviens reprendre ton aventure exactement où tu l’avais laissée.</p>
          <div className={styles.worldFacts}>
            <span><b>40k</b><small>blocs par frontière</small></span>
            <span><b>6</b><small>dimensions persistantes</small></span>
            <span><b>∞</b><small>façons d’explorer</small></span>
          </div>
        </div>
      </section>

      <section className={styles.journalSection} id="journal">
        <div className={styles.journalHeader}>
          <div><small>JOURNAL DE DRESSEUR</small><h2>Un serveur qui suit<br />ta façon de jouer.</h2></div>
          <div className={styles.chapterTabs} role="tablist" aria-label="Chapitres du journal">
            {(Object.keys(chapters) as ChapterKey[]).map((key) => (
              <button key={key} type="button" role="tab" aria-selected={activeChapter === key} className={activeChapter === key ? styles.activeTab : ""} onClick={() => setActiveChapter(key)}>
                {chapters[key].eyebrow.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chapterPanel} key={activeChapter}>
          <div className={styles.chapterImage}>
            <Image src={chapter.image} alt="" fill sizes="(max-width: 900px) 100vw, 48vw" />
            <span>{chapter.index}</span>
          </div>
          <div className={styles.chapterCopy}>
            <small>{chapter.eyebrow}</small>
            <h3>{chapter.title}</h3>
            <p>{chapter.copy}</p>
            <ul>{chapter.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
            {activeChapter === "lore" && <Link className={styles.chapterLink} href="/roadmap/#lore">Parcourir les chroniques <span>↗</span></Link>}
          </div>
        </div>
      </section>

      <section className={styles.fieldSection}>
        <div className={styles.fieldHeading}>
          <div><small>NOTES DE TERRAIN</small><h2>Et tout ce qui<br />relie l’aventure.</h2></div>
          <p>Les grands mondes donnent envie de partir. Ces systèmes donnent une raison de revenir, d’échanger et de construire une progression qui reste la tienne.</p>
        </div>
        <div className={styles.fieldGrid}>
          {fieldNotes.map((note, index) => (
            <article key={note.code}>
              <div><span>{String(index + 1).padStart(2, "0")}</span><small>{note.code}</small></div>
              <h3>{note.title}</h3>
              <p>{note.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.statusSection} id="etat">
        <div className={styles.statusIntro}>
          <span className={styles.liveDot} />
          <small>ÉTAT DU SERVEUR</small>
          <h2>Ce qui t’attend<br />vraiment en jeu.</h2>
          <p>Explore les mondes persistants, développe tes métiers et retrouve les grands systèmes CobbleStar réunis dans une seule aventure.</p>
        </div>
        <div className={styles.statusList}>
          {statusItems.map((item, index) => (
            <div className={styles.statusRow} key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><strong>{item.title}</strong><small>{item.detail}</small></div>
              <b className={styles[item.kind]}>{item.status}</b>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.newsSection}>
        <div className={styles.newsTitle}><small>DERNIÈRES NOUVELLES</small><h2>Depuis le carnet<br />de l’équipe.</h2><Link href="/actualites/">Toutes les actualités →</Link></div>
        <div className={styles.newsGrid}>
          {articles.map((article, index) => (
            <Link href="/actualites/" className={styles.newsCard} key={article.id}>
              <div className={styles.newsImage}><Image src={article.image} alt="" fill sizes="(max-width: 700px) 92vw, 30vw" /></div>
              <div className={styles.newsBody}>
                <div><span>{article.category}</span><time>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(article.publishedAt))}</time></div>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <b>Lire la note <span>↗</span></b>
              </div>
              <span className={styles.newsIndex}>0{index + 1}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.faqSection} id="faq">
        <div className={styles.faqHeading}><small>AVANT LE DÉPART</small><h2>Les réponses<br />essentielles.</h2><p>Les informations utiles pour rejoindre CobbleStar sans mauvaise surprise.</p></div>
        <div className={styles.faqList}>{HOME_FAQ.map((item, index) => <details key={item.question}><summary><span>{String(index + 1).padStart(2, "0")}</span><b>{item.question}</b><i>+</i></summary><p>{item.answer}</p></details>)}</div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalCloud}><Image src="/cobblestar-logo.png" alt="Dragonite sur son nuage" width={370} height={370} /></div>
        <div>
          <small>LE PROCHAIN DÉPART EST LE TIEN</small>
          <h2>Prêt à écrire<br />la suite ?</h2>
          <p>Le launcher installe Java, Fabric et le modpack automatiquement. Tu n’as plus qu’à choisir ton premier monde.</p>
          <a href={downloadUrl}>Télécharger pour Windows <span>↓</span></a>
        </div>
      </section>

      {home ? <SiteFooter /> : <footer className={styles.footer}>
        <div className={styles.footerBrand}><Image src="/cobblestar-logo.png" alt="" width={48} height={48} /><strong>CobbleStar</strong></div>
        <p>Serveur Minecraft Cobblemon francophone<br />indépendant et communautaire.</p>
        <div><Link href="/wiki/">Wiki</Link><Link href="/boutique/">Boutique</Link><Link href="/vote/">Vote</Link><Link href="/compte/">Compte</Link></div>
        <small>Proposition Atlas — prototype réel, isolé du site public.</small>
      </footer>}
    </main>
  );
}

export default function SiteAtlasPage() {
  return <AtlasLanding />;
}
