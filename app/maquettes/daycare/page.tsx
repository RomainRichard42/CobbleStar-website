"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./daycare.module.css";

type Concept = "a" | "b" | "c" | "d" | "e";
type Pokemon = { name: string; species: string; sex: string; level: number; nature: string; item: string; tone: string };

const pokemon: Pokemon[] = [
  { name: "Amande", species: "Évoli", sex: "♀", level: 38, nature: "Assuré", item: "Pierre Stase", tone: "cream" },
  { name: "Nox", species: "Évoli", sex: "♂", level: 42, nature: "Timide", item: "Nœud Destin", tone: "blue" },
  { name: "Moka", species: "Goupix", sex: "♀", level: 31, nature: "Modeste", item: "Aucun objet", tone: "orange" },
  { name: "Kumo", species: "Métamorph", sex: "—", level: 28, nature: "Calme", item: "Nœud Destin", tone: "violet" },
];

function Mon({ mon, small = false }: { mon: Pokemon; small?: boolean }) {
  return <span className={`${styles.mon} ${styles[mon.tone]} ${small ? styles.monSmall : ""}`}><i /><b>{mon.species.slice(0, 1)}</b></span>;
}

function ParentCard({ mon, side, onChange }: { mon: Pokemon; side: string; onChange?: () => void }) {
  return (
    <article className={styles.parentCard}>
      <div className={styles.parentTop}><span>PARENT {side}</span><button onClick={onChange}>CHANGER</button></div>
      <div className={styles.parentIdentity}><Mon mon={mon} /><div><small>{mon.species} · Niv. {mon.level}</small><strong>{mon.name} <em>{mon.sex}</em></strong><span>Nature {mon.nature}</span></div></div>
      <div className={styles.held}><span>OBJET TENU</span><b>{mon.item}</b></div>
    </article>
  );
}

function Egg({ ready = false, label = "Œuf d’Évoli" }: { ready?: boolean; label?: string }) {
  return <span className={`${styles.egg} ${ready ? styles.eggReady : ""}`}><i>◆</i><b>{label}</b><small>{ready ? "PRÊT À RÉCUPÉRER" : "EN INCUBATION"}</small></span>;
}

function ConceptA() {
  const [second, setSecond] = useState(1);
  const [collected, setCollected] = useState(false);
  return (
    <div className={`${styles.screen} ${styles.screenA}`}>
      <header className={styles.gameHeader}><div><span>PENSION COBBLESTAR</span><b>Comptoir d’élevage</b></div><div className={styles.npcBadge}><span>ÉLEVEUSE</span><b>Maëlys</b></div><button>×</button></header>
      <nav className={styles.innerTabs}><button className={styles.activeTab}>COUPLE EN PENSION</button><button>ŒUFS <i>2</i></button><button>INCUBATEUR <i>1</i></button></nav>
      <main className={styles.aLayout}>
        <section className={styles.couplePanel}>
          <div className={styles.sectionHead}><div><small>PENSION N°01</small><h2>Couple actif</h2></div><span className={styles.online}>● PRODUCTION EN COURS</span></div>
          <div className={styles.parents}><ParentCard mon={pokemon[0]} side="A" onChange={() => {}} /><div className={styles.link}>＋<span>TRÈS BONNE<br/>COMPATIBILITÉ</span></div><ParentCard mon={pokemon[second]} side="B" onChange={() => setSecond(second === 1 ? 3 : 1)} /></div>
          <div className={styles.forecast}>
            <div><span>PROCHAIN ŒUF</span><b>12 min environ</b><div className={styles.progress}><i style={{ width: "64%" }} /></div></div>
            <div><span>ESPÈCE POSSIBLE</span><b>Évoli</b><small>Forme standard</small></div>
            <div><span>HÉRITAGE PRÉVU</span><b>Nature Assuré</b><small>3 à 5 IV des parents</small></div>
            <div><span>CHANCE CHROMATIQUE</span><b>1 / 1 365</b><small>Prévision DayCare+</small></div>
          </div>
        </section>
        <aside className={styles.eggPanel}>
          <div className={styles.sectionHead}><div><small>STOCKAGE</small><h2>Œufs produits</h2></div><b>2 / 6</b></div>
          {collected ? <div className={styles.emptyEgg}><span>✓</span><b>Œuf envoyé</b><small>Il est maintenant dans ton incubateur.</small></div> : <><Egg ready /><button className={styles.primary} onClick={() => setCollected(true)}>ENVOYER À L’INCUBATEUR</button></>}
          <Egg label="Emplacement occupé" />
          <button className={styles.secondary}>OUVRIR L’INCUBATEUR</button>
          <div className={styles.jobBonus}><span>✦ MÉTIER ÉLEVEUR · NIV. 18</span><b>+8 % de vitesse de production</b><small>Encore 240 XP avant le prochain bonus.</small></div>
        </aside>
      </main>
    </div>
  );
}

function ConceptB() {
  const [step, setStep] = useState(1);
  const selectedA = pokemon[0];
  const selectedB = pokemon[1];
  return (
    <div className={`${styles.screen} ${styles.screenB}`}>
      <header className={styles.gameHeader}><div><span>NOUVEL ÉLEVAGE</span><b>Maëlys te guide</b></div><div className={styles.npcLine}>« Choisis tranquillement, je vérifie tout avant de commencer. »</div><button>×</button></header>
      <div className={styles.steps}>{["PREMIER PARENT", "SECOND PARENT", "RÉSULTAT PRÉVU", "CONFIRMATION"].map((label, index) => <button key={label} onClick={() => setStep(index)} className={step === index ? styles.stepActive : step > index ? styles.stepDone : ""}><i>{step > index ? "✓" : index + 1}</i><span>{label}</span></button>)}</div>
      {step < 2 ? <main className={styles.picker}>
        <section><div className={styles.sectionHead}><div><small>ÉTAPE {step + 1} SUR 4</small><h2>Choisis {step === 0 ? "le premier" : "le second"} parent</h2></div><span className={styles.help}>Seuls les Pokémon compatibles sont proposés.</span></div><div className={styles.filters}><button className={styles.filterActive}>COMPATIBLES</button><button>ÉQUIPE</button><button>BOÎTES PC</button><input aria-label="Rechercher" placeholder="Rechercher un Pokémon…" /></div><div className={styles.monGrid}>{pokemon.map((mon, index) => <button key={mon.name} className={(step === 0 ? index === 0 : index === 1) ? styles.monSelected : ""}><Mon mon={mon}/><span><b>{mon.name} {mon.sex}</b><small>{mon.species} · Niv. {mon.level}</small><em>{mon.nature} · {mon.item}</em></span><i>{(step === 0 ? index === 0 : index === 1) ? "✓" : "+"}</i></button>)}</div></section>
        <aside className={styles.selectionSummary}><span>TON CHOIX</span><ParentCard mon={step === 0 ? selectedA : selectedB} side={step === 0 ? "A" : "B"}/><div className={styles.tip}><b>ⓘ Bon à savoir</b><p>La compatibilité, les objets tenus et le résultat seront vérifiés à l’étape suivante.</p></div><button className={styles.primary} onClick={() => setStep(step + 1)}>CONTINUER</button></aside>
      </main> : <main className={styles.review}>
        <div className={styles.reviewHead}><small>ÉTAPE {step + 1} SUR 4</small><h2>{step === 2 ? "Vérifie le résultat prévu" : "Tout est prêt"}</h2><p>{step === 2 ? "Rien n’est lancé tant que tu n’as pas confirmé." : "Le couple sera confié à Maëlys et produira des œufs même hors ligne."}</p></div>
        <div className={styles.reviewParents}><ParentCard mon={selectedA} side="A"/><span>＋</span><ParentCard mon={selectedB} side="B"/></div>
        <section className={styles.resultPreview}><div className={styles.bigEgg}>◆</div><div><span>DESCENDANCE POSSIBLE</span><h3>Œuf d’Évoli</h3><p>Nature Assuré garantie · Talent Fuite ou Adaptabilité · 3 à 5 IV hérités</p></div><dl><div><dt>Compatibilité</dt><dd>Très bonne</dd></div><div><dt>Premier œuf</dt><dd>≈ 20 min</dd></div><div><dt>Coût</dt><dd>Gratuit</dd></div></dl></section>
        <div className={styles.reviewActions}><button onClick={() => setStep(1)}>← MODIFIER</button><button className={styles.primary} onClick={() => setStep(step === 2 ? 3 : 0)}>{step === 2 ? "PASSER À LA CONFIRMATION" : "CONFIER LE COUPLE"}</button></div>
      </main>}
    </div>
  );
}

function ConceptC() {
  const [eggs, setEggs] = useState(3);
  const [tab, setTab] = useState<"nursery" | "incubator">("nursery");
  return (
    <div className={`${styles.screen} ${styles.screenC}`}>
      <header className={styles.compactHeader}><div><span>✦</span><p><small>PENSION DE MAËLYS</small><b>Bonjour Pika_test</b></p></div><nav><button onClick={() => setTab("nursery")} className={tab === "nursery" ? styles.activeTab : ""}>MA PENSION</button><button onClick={() => setTab("incubator")} className={tab === "incubator" ? styles.activeTab : ""}>INCUBATEUR <i>1</i></button></nav><button>FERMER ×</button></header>
      {tab === "nursery" ? <main className={styles.cLayout}>
        <section className={styles.activeBreeding}><div className={styles.sectionHead}><div><small>COUPLE ACTIF</small><h2>Évoli × Évoli</h2></div><button>GÉRER LE COUPLE</button></div><div className={styles.cParents}><div><Mon mon={pokemon[0]}/><span><b>Amande ♀</b><small>Pierre Stase</small></span></div><span className={styles.heart}>＋</span><div><Mon mon={pokemon[1]}/><span><b>Nox ♂</b><small>Nœud Destin</small></span></div></div><div className={styles.production}><span>PRODUCTION DU PROCHAIN ŒUF</span><b>64 %</b><div className={styles.progress}><i style={{ width: "64%" }}/></div><small>Environ 12 minutes restantes</small></div><div className={styles.quickStats}><span>COMPATIBILITÉ <b>TRÈS BONNE</b></span><span>CHROMATIQUE <b>1 / 1 365</b></span><span>PRODUCTION TOTALE <b>14 ŒUFS</b></span></div></section>
        <section className={styles.readyShelf}><div className={styles.sectionHead}><div><small>À RÉCUPÉRER</small><h2>{eggs} œuf{eggs > 1 ? "s" : ""} prêt{eggs > 1 ? "s" : ""}</h2></div><b>{eggs} / 6</b></div><div className={styles.eggSlots}>{[0,1,2,3,4,5].map(index => <button key={index} className={index < eggs ? styles.slotFilled : ""}>{index < eggs ? <><span>◆</span><small>ÉVOLI</small></> : <i>VIDE</i>}</button>)}</div><div className={styles.shelfActions}><button className={styles.primary} onClick={() => setEggs(0)} disabled={!eggs}>TOUT ENVOYER À L’INCUBATEUR</button><button>CHOISIR UN ŒUF</button></div></section>
        <aside className={styles.daily}><span>AUJOURD’HUI</span><h2>Métier Éleveur</h2><div className={styles.levelRing}><b>18</b><small>NIVEAU</small></div><div className={styles.progress}><i style={{ width: "72%" }}/></div><p>240 XP avant le niveau 19</p><ul><li><b>+8 %</b> vitesse d’élevage</li><li><b>+1</b> place de stockage</li></ul><button>VOIR MES BONUS</button></aside>
      </main> : <main className={styles.incubator}><section><div className={styles.sectionHead}><div><small>INCUBATEUR ACTIF</small><h2>Œufs en développement</h2></div><span className={styles.online}>● ACTIF MÊME HORS LIGNE</span></div><div className={styles.incubatorRows}><article><Egg label="Œuf d’Évoli"/><div><span>PROGRESSION</span><div className={styles.progress}><i style={{width:"78%"}}/></div><small>2 184 / 2 800 pas</small></div><button>RÉCUPÉRER</button></article><article className={styles.emptyIncubator}><span>＋</span><div><b>Emplacement libre</b><small>Ajoute un œuf depuis la pension.</small></div></article></div></section><aside><span>COMMENT ÇA MARCHE ?</span><ol><li>Récupère les œufs produits par ton couple.</li><li>Place-les ici pour commencer l’incubation.</li><li>Marche et joue normalement : la progression est conservée.</li></ol><button onClick={() => setTab("nursery")}>← RETOUR À LA PENSION</button></aside></main>}
    </div>
  );
}

function ConceptD() {
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState(2);
  return (
    <div className={`${styles.screen} ${styles.screenC} ${styles.screenD}`}>
      <header className={styles.compactHeader}><div><span>✦</span><p><small>PENSION DE MAËLYS</small><b>Bonjour Pika_test</b></p></div><nav><button className={styles.activeTab}>MA PENSION</button><button>INCUBATEUR <i>1</i></button></nav><button>FERMER ×</button></header>
      <main className={styles.hybridDashboard}>
        <section className={styles.hybridCouple}><div className={styles.sectionHead}><div><small>COUPLE ACTIF</small><h2>Évoli × Évoli</h2></div><button onClick={() => { setEditing(true); setStep(0); }}>GÉRER LE COUPLE</button></div><div className={styles.cParents}><div><Mon mon={pokemon[0]}/><span><b>Amande ♀</b><small>Pierre Stase</small></span></div><span className={styles.heart}>＋</span><div><Mon mon={pokemon[1]}/><span><b>Nox ♂</b><small>Nœud Destin</small></span></div></div><div className={styles.production}><span>PROCHAIN ESSAI DE PRODUCTION</span><b>64 %</b><div className={styles.progress}><i style={{width:"64%"}}/></div><small>Environ 12 minutes restantes</small></div></section>
        <section className={styles.hybridEggs}><div className={styles.sectionHead}><div><small>À RÉCUPÉRER</small><h2>3 œufs prêts</h2></div><b>3 / 6</b></div><div className={styles.eggSlots}>{[0,1,2,3,4,5].map(index => <button key={index} className={index < 3 ? styles.slotFilled : ""}>{index < 3 ? <><span>◆</span><small>ÉVOLI</small></> : <i>VIDE</i>}</button>)}</div><button className={styles.primary}>TOUT ENVOYER À L’INCUBATEUR</button></section>
        <aside className={styles.hybridJob}><span>MÉTIER ÉLEVEUR</span><div className={styles.levelRing}><b>18</b><small>NIVEAU</small></div><div className={styles.progress}><i style={{width:"72%"}}/></div><p>240 XP avant le niveau 19</p></aside>
      </main>
      {editing && <div className={styles.guideShade}><section className={styles.guideDrawer}>
        <header><div><small>MODIFIER LE COUPLE</small><h2>{step === 0 ? "Choisis le parent à remplacer" : step === 1 ? "Choisis son remplaçant" : "Vérifie avant de confirmer"}</h2></div><button onClick={() => setEditing(false)}>×</button></header>
        <div className={styles.drawerSteps}>{["PARENT", "REMPLAÇANT", "VÉRIFICATION"].map((label,index)=><span key={label} className={index === step ? styles.drawerActive : index < step ? styles.drawerDone : ""}><i>{index < step ? "✓" : index+1}</i>{label}</span>)}</div>
        {step === 0 && <div className={styles.replaceChoice}><div className={styles.replaceSelected}><ParentCard mon={pokemon[0]} side="A"/></div><div><ParentCard mon={pokemon[1]} side="B"/></div></div>}
        {step === 1 && <div className={styles.drawerPokemon}>{pokemon.slice(2).map((mon,index)=><button key={mon.name} onClick={()=>setChoice(index+2)} className={choice===index+2?styles.monSelected:""}><Mon mon={mon}/><span><b>{mon.name} {mon.sex}</b><small>{mon.species} · Niv. {mon.level}</small><em>{mon.nature} · {mon.item}</em></span><i>{choice===index+2?"✓":"+"}</i></button>)}</div>}
        {step === 2 && <div className={styles.drawerReview}><div><ParentCard mon={pokemon[choice]} side="NOUVEAU"/></div><span>＋</span><div><ParentCard mon={pokemon[1]} side="CONSERVÉ"/></div><p><b>COMPATIBLES</b> · Descendance possible : {choice === 2 ? "Goupix" : "Évoli"}<br/>Aucun changement ne sera appliqué avant confirmation.</p></div>}
        <footer><button onClick={()=>step ? setStep(step-1) : setEditing(false)}>{step ? "← RETOUR" : "ANNULER"}</button><button className={styles.primary} onClick={()=>step<2?setStep(step+1):setEditing(false)}>{step<2?"CONTINUER":"CONFIRMER LE COUPLE"}</button></footer>
      </section></div>}
    </div>
  );
}

function ConceptSimple() {
  const [eggs, setEggs] = useState(3);
  const [second, setSecond] = useState(1);
  const mate = pokemon[second];
  return (
    <div className={styles.simpleScreen}>
      <section className={styles.simpleWindow}>
        <header className={styles.simpleHeader}>
          <div><span><Image src="/mockups/daycare/daycare_spark.png" alt="" width={22} height={22} /></span><p><b>PENSION POKÉMON</b><small>Maëlys s’occupe de ton couple</small></p></div>
          <button>×</button>
        </header>

        <main className={styles.simpleBody}>
          <section className={styles.simpleCouple}>
            <div className={styles.simpleParent}>
              <span className={styles.simplePokemon}><Image src="/mockups/daycare/poke_ball.png" alt="Pokémon Cobblemon" width={52} height={52} /></span>
              <p><b>{pokemon[0].name} <em>{pokemon[0].sex}</em></b><small>{pokemon[0].species} · Niv. {pokemon[0].level}</small><span><Image src="/mockups/daycare/everstone.png" alt="" width={14} height={14} />{pokemon[0].item}</span></p>
            </div>

            <div className={styles.simpleMatch}>
              <b><Image src="/mockups/daycare/love_ball.png" alt="" width={24} height={24} /></b>
              <span>COMPATIBLES</span>
              <small>Prochain œuf dans<br/>environ 12 min</small>
            </div>

            <div className={styles.simpleParent}>
              <span className={styles.simplePokemon}><Image src="/mockups/daycare/love_ball.png" alt="Pokémon Cobblemon" width={52} height={52} /></span>
              <p><b>{mate.name} <em>{mate.sex}</em></b><small>{mate.species} · Niv. {mate.level}</small><span><Image src="/mockups/daycare/destiny_knot.png" alt="" width={14} height={14} />{mate.item}</span></p>
            </div>
          </section>

          <button className={styles.simpleChange} onClick={() => setSecond(second === 1 ? 3 : 1)}>CHANGER LES POKÉMON</button>

          <section className={styles.simpleEggs}>
            <div className={styles.simpleEggTitle}><p><b>Pokémon-œufs disponibles</b><small>{eggs ? `${eggs} Pokémon peuvent rejoindre ton équipe ou ton PC` : "Aucun œuf pour le moment"}</small></p><span>{eggs} / 6</span></div>
            <div className={styles.simpleEggRow}>
              {[0, 1, 2, 3, 4, 5].map(index => <i key={index} className={index < eggs ? styles.simpleEggFull : ""}>{index < eggs && <Image src="/mockups/daycare/pokemon_egg.png" alt="Œuf Pokémon" width={30} height={30} />}</i>)}
            </div>
            <div className={styles.simpleEggActions}>
              <button disabled={!eggs} onClick={() => setEggs(value => Math.max(0, value - 1))}><Image src="/mockups/daycare/party_slot_active.png" alt="" width={31} height={15} /><span><b>AJOUTER À L’ÉQUIPE</b><small>1 place libre · ajoute 1 œuf</small></span></button>
              <button disabled={!eggs} onClick={() => setEggs(0)}><Image src="/mockups/daycare/pc_base.png" alt="" width={31} height={18} /><span><b>TOUT ENVOYER AU PC</b><small>Boîte Œufs</small></span></button>
            </div>
          </section>
        </main>

        <footer className={styles.simpleFooter}>
          <span>ÉLEVEUR · NIV. 18 <b>+8 % VITESSE</b></span>
          <span className={styles.simpleStorageNote}>LES ŒUFS OCCUPENT UNE PLACE POKÉMON</span>
        </footer>
      </section>
    </div>
  );
}

export default function DaycareMockupsPage() {
  const [concept, setConcept] = useState<Concept>("e");
  const labels = { a: "COMPTOIR COMPLET", b: "ASSISTANT GUIDÉ", c: "NURSERIE EXPRESS", d: "C + GUIDAGE", e: "VERSION SIMPLE" };
  return (
    <main className={styles.page}>
      <header className={styles.prototypeBar}><div><small>COBBLESTAR · MAQUETTES</small><b>PENSION POKÉMON</b></div><nav>{(["a","b","c","d","e"] as Concept[]).map((item, index) => <button key={item} onClick={() => setConcept(item)} className={concept === item ? styles.conceptActive : ""}><span>0{index + 1}</span>{labels[item]}</button>)}</nav></header>
      <section className={styles.context}><b>FLUX PROPOSÉ</b><span>Interaction avec Maëlys, le PNJ de la pension</span><span>DayCare+ reste le moteur serveur</span><span>Pasture Block : sortir et rappeler ses Pokémon uniquement</span></section>
      <section className={styles.gameFrame}>{concept === "a" ? <ConceptA/> : concept === "b" ? <ConceptB/> : concept === "c" ? <ConceptC/> : concept === "d" ? <ConceptD/> : <ConceptSimple/>}</section>
      <footer className={styles.notes}><div><span>PROPOSITION {concept.toUpperCase()}</span><b>{concept === "a" ? "La plus complète" : concept === "b" ? "La plus accessible" : concept === "c" ? "V1 VALIDÉE · LA PLUS RAPIDE" : concept === "d" ? "COMPARATIF C + B" : "SIMPLE ET IMMÉDIATE"}</b></div><p>{concept === "a" ? "Toutes les informations utiles sur une seule vue, sans ressembler à un menu d’administration." : concept === "b" ? "Le meilleur choix pour les joueurs qui ne connaissent ni l’élevage ni les objets d’héritage." : concept === "c" ? "Conçue comme un vrai comptoir de pension : on voit immédiatement le couple, les œufs prêts et la progression du métier." : concept === "d" ? "L’écran C ne change pas. Le guidage apparaît uniquement dans un panneau temporaire au moment de remplacer un parent." : "Un couple, les œufs et trois actions. Aucun chiffre technique ni navigation inutile."}</p><span className={styles.scale}>{concept === "e" ? "GUI COMPACTE · 55 % DE L’ÉCRAN" : "APERÇU GUI · 70 % DE L’ÉCRAN"}</span></footer>
    </main>
  );
}
