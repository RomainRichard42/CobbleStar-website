"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./ranked.module.css";

type Scene = "ladder" | "found" | "order" | "result";
type Variant = "a" | "b" | "c";

const modes = [
  { id: "solo", short: "SOLO", name: "Solo OU", rule: "National Dex OU", color: "cyan" },
  { id: "double", short: "DOUBLE", name: "Double VGC", rule: "NatDex VGC", color: "pink" },
  { id: "duo", short: "DUO", name: "Duo coop", rule: "2v2 · NatDex VGC", color: "gold" },
];

const mons = [
  { name: "Pikachu", icon: "⚡", type: "ÉLECTRIK", color: "yellow" },
  { name: "Dracaufeu", icon: "♨", type: "FEU · VOL", color: "orange" },
  { name: "Gardevoir", icon: "✦", type: "PSY · FÉE", color: "mint" },
  { name: "Métalosse", icon: "◆", type: "ACIER · PSY", color: "blue" },
  { name: "Motisma", icon: "ϟ", type: "ÉLECTRIK", color: "pink" },
  { name: "Carchacrok", icon: "▲", type: "DRAGON · SOL", color: "violet" },
];

const leaders = [
  { name: "Asterion", rating: 1842, record: "31 — 8", form: "WWWWW" },
  { name: "NoxDawn", rating: 1796, record: "27 — 11", form: "WWWLW" },
  { name: "Maeve", rating: 1731, record: "24 — 9", form: "WLWWW" },
  { name: "Pika_test", rating: 1684, record: "19 — 12", form: "WWLWW" },
  { name: "Voltis", rating: 1649, record: "21 — 15", form: "LWWLW" },
  { name: "Soren", rating: 1588, record: "18 — 14", form: "WLWLW" },
];

const duoLeaders = [
  { name: "Asterion × Lyra", rating: 1578, record: "18 — 4", form: "WWWWW" },
  { name: "NoxDawn × Maeve", rating: 1488, record: "14 — 6", form: "WWWLW" },
  { name: "Pika_test × Asterion", rating: 1452, record: "12 — 5", form: "WLWWW" },
  { name: "Voltis × Soren", rating: 1409, record: "11 — 7", form: "WWLWW" },
  { name: "Kira × Bloom", rating: 1361, record: "9 — 8", form: "LWWLW" },
];

function Ball() {
  return <Image src="/mockups/daycare/poke_ball.png" alt="Poké Ball" width={22} height={22} />;
}

function Portrait({ index, small = false }: { index: number; small?: boolean }) {
  const mon = mons[index % mons.length];
  return <span className={`${styles.portrait} ${styles[mon.color]} ${small ? styles.portraitSmall : ""}`}><i>{mon.icon}</i></span>;
}

function PlayerHead({ name, tone = "cyan", small = false }: { name: string; tone?: "cyan" | "pink" | "gold" | "mint"; small?: boolean }) {
  return <span className={`${styles.minecraftHead} ${styles[`head${tone}`]} ${small ? styles.headSmall : ""}`}><i/><i/><i/><i/><b>{name.slice(0,1)}</b></span>;
}

function GameWorld({ children, calm = false }: { children: React.ReactNode; calm?: boolean }) {
  return (
    <div className={`${styles.gameWorld} ${calm ? styles.calmWorld : ""}`}>
      <div className={styles.fakeHud}><span>RÉSEAU COBBLESTAR</span><b>24 MS</b></div>
      <div className={styles.fakeMap}><i>N</i><span>FORÊT</span></div>
      <div className={styles.crosshair}>＋</div>
      <div className={styles.hotbar}>{[0, 1, 2, 3, 4, 5, 6, 7, 8].map(slot => <i key={slot}>{slot === 0 ? "⚔" : slot === 2 ? "●" : ""}</i>)}</div>
      {children}
    </div>
  );
}

function ModeTabs({ selected, onSelect }: { selected: number; onSelect: (value: number) => void }) {
  return <nav className={styles.modeTabs}>{modes.map((mode, index) => <button key={mode.id} onClick={() => onSelect(index)} className={selected === index ? styles.modeActive : ""}><span className={styles[mode.color]}>{mode.short}</span><b>{mode.name}</b><small>{mode.rule}</small></button>)}</nav>;
}

function LadderA({ mode }: { mode: number }) {
  const board = mode === 2 ? duoLeaders : leaders;
  const podiumOrder = [1, 0, 2];
  const myName = mode === 2 ? "Pika_test × Asterion" : "Pika_test";
  const myRank = mode === 2 ? 3 : 4;
  const myRating = mode === 2 ? 1452 : 1684;
  return (
    <div className={styles.ladderA}>
      <header className={styles.windowHeader}><div><span>◆</span><p><small>SAISON 08 · AOÛT</small><b>CLASSEMENT {modes[mode].short}</b></p></div><p>FIN DE SAISON <b>12 J 07 H</b></p><button>×</button></header>
      <main className={styles.fusionMain}>
        <section className={styles.fusionTop}>
          <div className={styles.fusionPodium}>
            <div className={styles.podiumTitle}><small>LE SOMMET DE LA LIGUE</small><h2>{mode === 2 ? "Les meilleurs duos" : "Les meilleurs dresseurs"}</h2><p>{mode === 2 ? "Chaque composition de duo possède son propre classement." : "Le podium de la saison en cours."}</p></div>
            <div className={styles.podium}>{podiumOrder.map((leaderIndex, place) => <article key={leaderIndex} className={leaderIndex === 0 ? styles.first : ""}><PlayerHead name={board[leaderIndex].name}/><b>{board[leaderIndex].name}</b><small>{board[leaderIndex].rating} PTS</small><i>{place === 0 ? "2" : place === 1 ? "1" : "3"}</i></article>)}</div>
          </div>
          <aside className={styles.fusionJourney}>
            <span>TON PARCOURS</span><div className={styles.fusionIdentity}><div className={styles.largeRank}>◆</div><p><small>{mode === 2 ? "DUO ACTIF" : "RANG ACTUEL"}</small><b>{myName}</b><em>DIAMANT II · #{myRank}</em></p><strong>{myRating}<small> PTS</small></strong></div>
            <div className={styles.nextRank}><span>PROCHAIN PALIER · MAÎTRE</span><div><i style={{width:mode===2?"52%":"68%"}}/></div><small>{mode===2?"148":"116"} points nécessaires</small></div>
            <div className={styles.fusionForm}><span>10 DERNIERS MATCHS</span><div>{[1,1,0,1,1,0,1,1,1,0].map((value,index)=><i key={index} className={value?styles.winGame:styles.lossGame}>{value?"V":"D"}</i>)}</div><p><b>7 — 3</b><small>+94 points</small></p></div>
            {mode === 2 && <div className={styles.duoNotice}><b>CLASSEMENT LIÉ À CE DUO</b><small>Jouer avec un autre partenaire créera un rang séparé.</small></div>}
          </aside>
        </section>
        <section className={styles.fusionAround}><header><div><span>AUTOUR DE {mode===2?"VOTRE DUO":"TOI"}</span><small>La course au podium</small></div><p><b>RÉCOMPENSE ACTUELLE</b><span><Ball/> 3 clés classées · titre Diamant</span></p></header><div>{board.slice(1,5).map((leader,index)=><article key={leader.name} className={leader.name===myName?styles.you:""}><span>#{index+2}</span><PlayerHead name={leader.name} small/><b>{leader.name}</b><small>{leader.record}</small><strong>{leader.rating} PTS</strong></article>)}</div></section>
      </main>
    </div>
  );
}

function LadderB({ mode }: { mode: number }) {
  return (
    <div className={styles.ladderB}>
      <header className={styles.slimHeader}><div><b>RANKED</b><span>SAISON 08</span></div><ModeTabs selected={mode} onSelect={() => {}}/><button>FERMER ×</button></header>
      <main>
        <section className={styles.tablePanel}>
          <div className={styles.tableHead}><div><small>CLASSEMENT MONDIAL</small><h2>{modes[mode].name}</h2></div><div><button className={styles.activeFilter}>TOP 100</button><button>AMIS</button><button>AUTOUR DE MOI</button></div></div>
          <div className={styles.leaderTable}><header><span>#</span><span>DRESSEUR</span><span>FORME</span><span>V — D</span><span>POINTS</span></header>{leaders.map((leader, index) => <article key={leader.name} className={leader.name === "Pika_test" ? styles.me : ""}><span>{index + 1}</span><span><i>{leader.name.slice(0, 1)}</i><b>{leader.name}</b></span><span>{leader.form.split("").map((value, formIndex) => <i key={formIndex} className={value === "W" ? styles.winDot : styles.lossDot}/>)}</span><span>{leader.record}</span><strong>{leader.rating}</strong></article>)}</div>
        </section>
        <aside className={styles.profileRank}><span>TA SAISON</span><div className={styles.largeRank}>◆<small>DIAMANT II</small></div><h2>1 684</h2><small>POINTS DE CLASSEMENT</small><dl><div><dt>Rang</dt><dd>#4</dd></div><div><dt>Victoires</dt><dd>19</dd></div><div><dt>Taux de victoire</dt><dd>61 %</dd></div><div><dt>Meilleur score</dt><dd>1 712</dd></div></dl><button>CHERCHER UN MATCH</button></aside>
      </main>
    </div>
  );
}

function LadderC({ mode }: { mode: number }) {
  return (
    <div className={styles.ladderC}>
      <header className={styles.windowHeader}><div><span>◆</span><p><small>RANKED · {modes[mode].short} · SAISON 08</small><b>MON PARCOURS</b></p></div><p>RÉINITIALISATION <b>01 SEPT.</b></p><button>×</button></header>
      <main>
        <section className={styles.seasonHero}><div className={styles.heroRank}><span>◆</span><p><small>RANG ACTUEL</small><b>DIAMANT II</b><em>#4 DU SERVEUR</em></p></div><div className={styles.heroScore}><strong>1 684</strong><span>PTS</span><small>▲ 26 depuis hier</small></div><div className={styles.nextRank}><span>PROCHAIN PALIER · MAÎTRE</span><div><i style={{ width: "68%" }}/></div><small>116 points nécessaires</small></div></section>
        <section className={styles.journeyGrid}><article className={styles.formCard}><span>10 DERNIERS MATCHS</span><div>{[1,1,0,1,1,0,1,1,1,0].map((win, index) => <i key={index} className={win ? styles.winGame : styles.lossGame}>{win ? "V" : "D"}</i>)}</div><p><b>7 — 3</b><small>+94 points</small></p></article><article className={styles.rivalCard}><span>RIVAL À DÉPASSER</span><div><i>M</i><p><b>Maeve</b><small>#3 · 1 731 PTS</small></p><strong>47 PTS</strong></div><button>VOIR SON PROFIL</button></article><article className={styles.goalCard}><span>OBJECTIF HEBDOMADAIRE</span><b>Gagner 5 matchs</b><div><i style={{width:"60%"}}/></div><small>3 / 5 · récompense : 1 clé classée</small></article></section>
        <section className={styles.nearby}><header><span>AUTOUR DE TOI</span><small>La course au Top 3</small></header>{leaders.slice(1,6).map((leader,index)=><article key={leader.name} className={leader.name === "Pika_test" ? styles.you : ""}><span>#{index+2}</span><i>{leader.name.slice(0,1)}</i><b>{leader.name}</b><small>{leader.record}</small><strong>{leader.rating}</strong></article>)}</section>
      </main>
    </div>
  );
}

function MatchFoundA({ mode }: { mode: number }) {
  return <GameWorld><div className={styles.foundA}><div className={styles.scanLine}/><header><span>◆ MATCH TROUVÉ</span><small>{modes[mode].rule}</small></header><main><article><i>P</i><b>PIKA_TEST</b><span>1 684</span></article><div><small>ADVERSAIRE TROUVÉ</small><b>VS</b><em>18</em></div><article><i>N</i><b>NOXDAWN</b><span>1 796</span></article></main><footer><button>REFUSER</button><button>ACCEPTER LE MATCH</button></footer></div></GameWorld>;
}

function MatchFoundB({ mode }: { mode: number }) {
  return <GameWorld><div className={styles.foundB}><div className={styles.readyIcon}><Ball/></div><div><small>MATCH CLASSÉ TROUVÉ</small><b>{modes[mode].name}</b><span>{modes[mode].rule} · adversaire proche de ton niveau</span></div><strong>18</strong><button>PRÊT</button><button className={styles.cancelMini}>×</button><div className={styles.timerLine}><i style={{width:"72%"}}/></div></div></GameWorld>;
}

function MatchFoundC({ mode }: { mode: number }) {
  if (mode === 2) return <GameWorld><div className={`${styles.foundC} ${styles.foundCDuo}`}><header><span>DUO CLASSÉ TROUVÉ · CONNEXION AU MATCH</span><b>00:18</b></header><main className={styles.duoSignalMain}><section className={styles.signalTeam}><div className={styles.duoRank}><span>VOTRE DUO · #3</span><b>1 452 PTS</b></div><div className={styles.signalRoster}><div className={styles.foundPlayer}><PlayerHead name="Pika_test" small/><span><small>TOI</small><b>PIKA_TEST</b></span><em>PRÊT ✓</em></div><div className={styles.foundPlayer}><PlayerHead name="Asterion" tone="gold" small/><span><small>PARTENAIRE</small><b>ASTERION</b></span><em>PRÊT ✓</em></div></div></section><div className={styles.signal}><i/><i/><span>VS</span><i/><i/></div><section className={styles.signalTeam}><div className={styles.duoRank}><span>DUO ADVERSE · #2</span><b>1 488 PTS</b></div><div className={styles.signalRoster}><div className={styles.foundPlayer}><PlayerHead name="NoxDawn" tone="pink" small/><span><small>ADVERSAIRE</small><b>NOXDAWN</b></span><em>PRÊT ✓</em></div><div className={styles.foundPlayer}><PlayerHead name="Maeve" tone="mint" small/><span><small>PARTENAIRE</small><b>MAEVE</b></span><em>EN ATTENTE</em></div></div></section></main><footer><span>DUO COOP · NATDEX VGC · rang propre à cette paire</span><button>ANNULER LA RECHERCHE</button></footer></div></GameWorld>;
  return <GameWorld><div className={styles.foundC}><header><span>CONNEXION AU MATCH</span><b>00:18</b></header><main><div className={styles.foundPlayer}><PlayerHead name="Pika_test" small/><span><small>TOI · DIAMANT II</small><b>PIKA_TEST</b></span><em>PRÊT ✓</em></div><div className={styles.signal}><i/><i/><i/><span>VS</span><i/><i/><i/></div><div className={styles.foundPlayer}><PlayerHead name="NoxDawn" tone="pink" small/><span><small>ADVERSAIRE · DIAMANT I</small><b>NOXDAWN</b></span><em>EN ATTENTE</em></div></main><footer><span>{modes[mode].name} · {modes[mode].rule}</span><button>ANNULER LA RECHERCHE</button></footer></div></GameWorld>;
}

function PokemonStrip({ order, setOrder, compact = false }: { order: number[]; setOrder: (order: number[]) => void; compact?: boolean }) {
  const move = (position: number, direction: number) => {
    const target = position + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[position], next[target]] = [next[target], next[position]];
    setOrder(next);
  };
  return <div className={`${styles.pokemonStrip} ${compact ? styles.compactStrip : ""}`}>{order.map((monIndex, position) => <article key={monIndex} className={position === 0 ? styles.leadMon : ""}><span className={styles.orderNumber}>{position + 1}</span><Portrait index={monIndex}/><b>{mons[monIndex].name}</b><small>{mons[monIndex].type}</small><div><button onClick={() => move(position,-1)}>‹</button><button onClick={() => move(position,1)}>›</button></div>{position === 0 && <em>EN TÊTE</em>}</article>)}</div>;
}

function OrderA({ mode, order, setOrder }: { mode: number; order: number[]; setOrder: (order: number[]) => void }) {
  return <div className={styles.orderA}><header className={styles.orderHeader}><div><small>PRÉPARATION DU MATCH</small><b>CHOISIS TON ORDRE</b></div><div><span>{modes[mode].name}</span><small>{modes[mode].rule}</small></div><strong>00:42</strong></header><main><div className={styles.orderHelp}><span>1</span><p><b>Le premier Pokémon sera envoyé au combat.</b><small>Utilise les flèches pour réorganiser ton équipe. L’ordre des réserves pourra compter.</small></p></div><PokemonStrip order={order} setOrder={setOrder}/><div className={styles.teamPreview}><span>ÉQUIPE ADVERSE</span><div>{mons.map((_,index)=><Portrait key={index} index={index} small/>)}</div><small>L’ordre adverse reste secret.</small></div></main><footer><span>ⓘ Tes objets et capacités seront contrôlés à la confirmation.</span><button>CONFIRMER CET ORDRE</button></footer></div>;
}

function OrderB({ order, setOrder }: { order: number[]; setOrder: (order: number[]) => void }) {
  const rotate = (index: number) => setOrder([...order.slice(index), ...order.slice(0,index)]);
  return <div className={styles.orderB}><header><p><small>DOUBLE VGC · SÉLECTION</small><b>QUI ENTRE SUR LE TERRAIN ?</b></p><strong>00:42</strong></header><main><section className={styles.fieldChoice}><span>TITULAIRES</span><div>{order.slice(0,2).map((monIndex,index)=><article key={monIndex}><i>{index+1}</i><Portrait index={monIndex}/><p><b>{mons[monIndex].name}</b><small>{index === 0 ? "POSITION GAUCHE" : "POSITION DROITE"}</small></p></article>)}</div><span>RÉSERVES · DANS L’ORDRE</span><div className={styles.reserveRow}>{order.slice(2,4).map((monIndex,index)=><article key={monIndex}><i>{index+3}</i><Portrait index={monIndex} small/><b>{mons[monIndex].name}</b></article>)}</div></section><aside className={styles.teamPicker}><span>TON ÉQUIPE · CHOISIS 4</span>{order.map((monIndex,index)=><button key={monIndex} onClick={()=>rotate(index)} className={index<4?styles.picked:""}><Portrait index={monIndex} small/><p><b>{mons[monIndex].name}</b><small>{mons[monIndex].type}</small></p><i>{index<4?index+1:"+"}</i></button>)}<small>Clique sur un Pokémon pour le placer en premier.</small></aside></main><footer><button>REVENIR À L’ÉQUIPE</button><button>VALIDER LES 4 POKÉMON</button></footer></div>;
}

function OrderC({ mode, order, setOrder }: { mode: number; order: number[]; setOrder: (order: number[]) => void }) {
  const promote = (index: number) => setOrder([...order.slice(index), ...order.slice(0,index)]);
  return <div className={`${styles.orderC} ${styles.adaptiveOrder}`}><header className={styles.windowHeader}><div><span>◆</span><p><small>{modes[mode].name.toUpperCase()} · PRÉPARATION</small><b>{mode===0?"ORDRE DE L’ÉQUIPE":mode===1?"FORMATION DE DÉPART":"PLAN DU DUO"}</b></p></div><p>VERROUILLAGE <b>00:42</b></p></header><main>
    {mode===0 ? <section className={styles.soloOrderPlan}><div className={styles.planIntro}><span>SOLO · 6 CONTRE 6</span><h2>Qui ouvre le combat ?</h2><p>Le premier Pokémon part au combat. Les cinq suivants forment ton ordre de remplacement.</p></div><div className={styles.soloLead}><Portrait index={order[0]}/><p><small>POKÉMON DE DÉPART</small><b>{mons[order[0]].name}</b><span>{mons[order[0]].type}</span></p><em>1</em></div><PokemonStrip order={order} setOrder={setOrder}/></section>
    : mode===1 ? <section className={styles.doubleOrderPlan}><header><div><span>DOUBLE VGC · CHOISIS 4</span><h2>Deux titulaires, deux réserves</h2></div><small>Clique sur un Pokémon pour le placer en premier.</small></header><div className={styles.doubleZones}><section><span>SUR LE TERRAIN</span><div>{order.slice(0,2).map((monIndex,index)=><article key={monIndex}><i>{index+1}</i><Portrait index={monIndex}/><p><b>{mons[monIndex].name}</b><small>{index===0?"GAUCHE · PREMIER CHOIX":"DROITE · SECOND CHOIX"}</small></p></article>)}</div></section><section><span>RÉSERVES</span><div>{order.slice(2,4).map((monIndex,index)=><article key={monIndex}><i>{index+3}</i><Portrait index={monIndex}/><p><b>{mons[monIndex].name}</b><small>REMPLAÇANT {index+1}</small></p></article>)}</div></section></div><div className={styles.adaptiveRoster}>{order.map((monIndex,index)=><button key={monIndex} onClick={()=>promote(index)} className={index<4?styles.rosterPicked:""}><Portrait index={monIndex} small/><b>{mons[monIndex].name}</b><span>{index<4?index+1:"—"}</span></button>)}</div></section>
    : <><section className={styles.duoPlan}><div className={styles.trainerColumn}><span>PIKA_TEST · TOI · DUO 1 452 PTS</span>{order.slice(0,2).map((monIndex,index)=><article key={monIndex}><i>{index+1}</i><Portrait index={monIndex}/><p><b>{mons[monIndex].name}</b><small>{index === 0 ? "DÉPART" : "REMPLAÇANT"}</small></p></article>)}</div><div className={styles.centerPlan}><small>PREMIER TOUR</small><div><Portrait index={order[0]} small/><span>＋</span><Portrait index={3} small/></div><b>2 POKÉMON ENSEMBLE</b><p>Chacun contrôle son côté du terrain.</p></div><div className={styles.trainerColumn}><span>ASTERION · PARTENAIRE · PRÊT</span><article><i>1</i><Portrait index={3}/><p><b>Métalosse</b><small>DÉPART · PRÊT</small></p></article><article><i>2</i><Portrait index={4}/><p><b>Motisma</b><small>REMPLAÇANT</small></p></article></div></section><div className={styles.duoBench}><span>CHANGE TON ORDRE</span><PokemonStrip order={order.slice(0,2)} setOrder={(next)=>setOrder([...next,...order.slice(2)])} compact/></div></>}
  </main><footer><span>{mode===2?"PARTENAIRE PRÊT ✓":"ÉQUIPE LÉGALE ✓"}</span><button>{mode===0?"CONFIRMER L’ORDRE":mode===1?"CONFIRMER LES 4":"CONFIRMER MON CÔTÉ"}</button></footer></div>;
}

function ResultA({ win, mode }: { win: boolean; mode: number }) {
  const ownTeam = mode===2?["Pika_test","Asterion"]:["Pika_test"];
  const enemyTeam = mode===2?["NoxDawn","Maeve"]:["NoxDawn"];
  const before = mode===2?1452:1684;
  const delta = win?(mode===2?31:24):(mode===2?23:18);
  const after = win?before+delta:before-delta;
  return <GameWorld calm><div className={`${styles.resultA} ${styles.impactResult} ${win ? styles.victory : styles.defeat}`}><div className={styles.impactGlow}/><header><span>MATCH CLASSÉ TERMINÉ</span><b>{modes[mode].name} · {modes[mode].rule}</b></header><section className={styles.impactVersus}><article className={win?styles.winningSide:""}><div>{ownTeam.map((name,index)=><PlayerHead key={name} name={name} tone={index?"gold":"cyan"}/>)}</div><p><small>{mode===2?"VOTRE DUO":"TOI"}</small><b>{ownTeam.join(" × ")}</b><span>{mode===2?"DUO #3 · 1 452 PTS":"DIAMANT II · #4"}</span></p></article><div className={styles.impactCenter}><small>{win?"VAINQUEUR":"MATCH PERDU"}</small><h2>{win ? "VICTOIRE" : "DÉFAITE"}</h2><i>{win?"1 — 0":"0 — 1"}</i></div><article className={!win?styles.winningSide:""}><div>{enemyTeam.map((name,index)=><PlayerHead key={name} name={name} tone={index?"mint":"pink"}/>)}</div><p><small>{mode===2?"DUO ADVERSE":"ADVERSAIRE"}</small><b>{enemyTeam.join(" × ")}</b><span>{mode===2?"DUO #2 · 1 488 PTS":"DIAMANT I · #2"}</span></p></article></section><section className={styles.impactRating}><div><small>{mode===2?"CLASSEMENT DE CE DUO":"TON CLASSEMENT"}</small><b>{mode===2?"DUO DIAMANT III":"DIAMANT II"}</b></div><strong className={win?styles.positive:styles.negative}>{win?"+":"−"}{delta}</strong><p><small>{before} PTS</small><span>→</span><b>{after} PTS</b></p></section><div className={styles.resultProgress}><i style={{width:win?"74%":"61%"}}/></div><p className={styles.impactMessage}>{win ? "Une victoire de plus vers le rang Maître." : "La série s’arrête ici. Le prochain match peut tout relancer."}</p><footer><button>RETOUR AU MONDE</button><button>VOIR LE RÉSUMÉ</button><button>REJOUER</button></footer></div></GameWorld>;
}

function ResultB({ win }: { win: boolean }) {
  return <GameWorld><div className={`${styles.resultB} ${win ? styles.victory : styles.defeat}`}><header><span>{win ? "▲ VICTOIRE CLASSÉE" : "▼ DÉFAITE CLASSÉE"}</span><button>×</button></header><div className={styles.scoreDelta}><strong>{win ? "+24" : "−18"}</strong><p><b>{win ? "1 708" : "1 666"} PTS</b><small>DIAMANT II</small></p></div><div className={styles.miniStats}><span><small>TOURS</small><b>17</b></span><span><small>K.O.</small><b>{win?"4":"2"}</b></span><span><small>DURÉE</small><b>08:42</b></span></div><p>{win ? "Série de 3 victoires" : "Prochain gain estimé : +25"}</p><footer><button>VOIR LE RÉSUMÉ</button><button>REJOUER</button></footer></div></GameWorld>;
}

function ResultC({ win }: { win: boolean }) {
  return <div className={`${styles.resultC} ${win ? styles.victory : styles.defeat}`}><header><div><small>RÉSULTAT · SOLO OU</small><h2>{win ? "MATCH GAGNÉ" : "MATCH PERDU"}</h2></div><span>{win ? "+24 PTS" : "−18 PTS"}</span></header><main><section className={styles.versusResult}><article><i>P</i><b>PIKA_TEST</b><span>{win ? "VAINQUEUR" : "1 — 0"}</span></article><strong>{win ? "1 — 0" : "0 — 1"}</strong><article><i>N</i><b>NOXDAWN</b><span>{win ? "0 — 1" : "VAINQUEUR"}</span></article></section><section className={styles.performance}><header><span>PERFORMANCE DU MATCH</span><small>08:42 · 17 tours</small></header><div><article><Portrait index={0}/><p><b>Pikachu</b><small>2 K.O. · 34 % PV restants</small></p><em>✦ MVP</em></article>{mons.slice(1,4).map((mon,index)=><article key={mon.name}><Portrait index={index+1}/><p><b>{mon.name}</b><small>{index === 0 ? "1 K.O. · K.O." : "0 K.O. · en réserve"}</small></p></article>)}</div></section><aside className={styles.ratingSummary}><span>CLASSEMENT</span><div className={styles.largeRank}>◆<small>DIAMANT II</small></div><strong>{win?"1 708":"1 666"}</strong><small>POINTS</small><div className={styles.rankProgress}><i style={{width:win?"74%":"61%"}}/></div><p>{win?"92":"134"} points avant Maître</p></aside></main><footer><button>RETOUR AU MONDE</button><button>REVANCHE</button><button>RELANCER LA FILE</button></footer></div>;
}

const sceneNames: Record<Scene,string> = { ladder: "CLASSEMENT", found: "MATCH TROUVÉ", order: "ORDRE DES POKÉMON", result: "VICTOIRE / DÉFAITE" };
const variantNames: Record<Scene,Record<Variant,string>> = {
  ladder: { a: "PODIUM + PARCOURS", b: "LIGUE", c: "PARCOURS" },
  found: { a: "VERSUS", b: "BANDEAU", c: "SIGNAL" },
  order: { a: "ORDRE LIBRE", b: "TERRAIN VGC", c: "PLAN ADAPTATIF" },
  result: { a: "IMPACT + JOUEURS", b: "COMPACT", c: "ANALYSE" },
};

export default function RankedMockupsPage() {
  const [scene,setScene] = useState<Scene>("ladder");
  const [variant,setVariant] = useState<Variant>("a");
  const [mode,setMode] = useState(0);
  const [win,setWin] = useState(true);
  const [order,setOrder] = useState([0,1,2,3,4,5]);
  const preferred: Record<Scene,Variant> = { ladder:"a", found:"c", order:"c", result:"a" };
  const changeScene = (next: Scene) => { setScene(next); setVariant(preferred[next]); };
  return (
    <main className={styles.page}>
      <header className={styles.prototypeBar}><div><small>COBBLESTAR · MAQUETTES</small><b>EXPÉRIENCE RANKED</b></div><nav>{(Object.keys(sceneNames) as Scene[]).map((item,index)=><button key={item} onClick={()=>changeScene(item)} className={scene===item?styles.prototypeActive:""}><span>0{index+1}</span>{sceneNames[item]}</button>)}</nav></header>
      <section className={styles.controlBar}><nav>{(["a","b","c"] as Variant[]).map((item,index)=><button key={item} onClick={()=>setVariant(item)} className={variant===item?styles.variantActive:""}><span>{String.fromCharCode(65+index)}</span>{variantNames[scene][item]}</button>)}</nav><ModeTabs selected={mode} onSelect={setMode}/>{scene==="result"&&<button className={`${styles.outcomeToggle} ${win?styles.toggleWin:styles.toggleLoss}`} onClick={()=>setWin(!win)}>{win?"APERÇU VICTOIRE":"APERÇU DÉFAITE"}</button>}</section>
      <section className={styles.gameFrame}>
        {scene === "ladder" ? variant === "a" ? <LadderA mode={mode}/> : variant === "b" ? <LadderB mode={mode}/> : <LadderC mode={mode}/>
        : scene === "found" ? variant === "a" ? <MatchFoundA mode={mode}/> : variant === "b" ? <MatchFoundB mode={mode}/> : <MatchFoundC mode={mode}/>
        : scene === "order" ? variant === "a" ? <OrderA mode={mode} order={order} setOrder={setOrder}/> : variant === "b" ? <OrderB order={order} setOrder={setOrder}/> : <OrderC mode={mode} order={order} setOrder={setOrder}/>
        : variant === "a" ? <ResultA win={win} mode={mode}/> : variant === "b" ? <ResultB win={win}/> : <ResultC win={win}/>}</section>
      <footer className={styles.notes}><span>PROPOSITION {variant.toUpperCase()} · {sceneNames[scene]}</span><p>{scene === "ladder" ? "Le prestige du podium rejoint le suivi personnel, la forme récente et la course aux places voisines." : scene === "found" ? "Signal reste dans le monde et affiche les quatre joueurs ainsi que le rang propre à la paire en Coop." : scene === "order" ? "Le plan change réellement entre l’ordre 6v6, la formation Double et les deux côtés du Duo." : "Impact montre les participants, le résultat et le changement du classement concerné."}</p><b>MAQUETTE INTERACTIVE</b></footer>
    </main>
  );
}
