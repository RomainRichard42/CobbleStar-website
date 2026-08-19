"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./crates-admin.module.css";

type Concept = "guided" | "board";
type RewardType = "item" | "command" | "currency" | "grade";

const tiers = [
  { id: "common", name: "Commun", chance: 40, color: "#b7c7c8" },
  { id: "uncommon", name: "Peu commun", chance: 33, color: "#7ee2a8" },
  { id: "rare", name: "Rare", chance: 20, color: "#62c9ff" },
  { id: "veryrare", name: "Très rare", chance: 6, color: "#e77ee5" },
  { id: "constellation", name: "Constellation", chance: 1, color: "#ffd65a" },
] as const;

const rewards = [
  { id: 1, tier: "common", name: "Lingots de fer", detail: "minecraft:iron_ingot · ×12", type: "item", weight: 60, icon: "▰" },
  { id: 2, tier: "common", name: "CobbleCoins", detail: "2 500 pièces", type: "currency", weight: 40, icon: "⬡" },
  { id: 3, tier: "uncommon", name: "Super Bonbons", detail: "cobblemon:rare_candy · ×8", type: "item", weight: 70, icon: "◆" },
  { id: 4, tier: "uncommon", name: "Poké Dollars", detail: "Commande économie · 5 000", type: "command", weight: 30, icon: "$" },
  { id: 5, tier: "rare", name: "Master Ball", detail: "cobblemon:master_ball · ×1", type: "item", weight: 65, icon: "◉" },
  { id: 6, tier: "rare", name: "Clé Nova", detail: "cobblestar:nova_key · ×1", type: "item", weight: 35, icon: "⌑" },
  { id: 7, tier: "veryrare", name: "Clé Quasar", detail: "Commande crate give", type: "command", weight: 75, icon: "✦" },
  { id: 8, tier: "veryrare", name: "Grade Nova", detail: "LuckPerms · 7 jours", type: "grade", weight: 25, icon: "♛" },
  { id: 9, tier: "constellation", name: "Grade Astral", detail: "LuckPerms · 30 jours", type: "grade", weight: 100, icon: "★" },
] as const;

const typeCopy: Record<RewardType, { label: string; icon: string; description: string }> = {
  item: { label: "Objet", icon: "◇", description: "Un objet Minecraft ou Cobblemon" },
  command: { label: "Commande", icon: ">_", description: "Une ou plusieurs commandes serveur" },
  currency: { label: "Monnaie", icon: "$", description: "Des CobbleCoins ou Poké Dollars" },
  grade: { label: "Grade", icon: "♛", description: "Un grade permanent ou temporaire" },
};

function TypeBadge({ type }: { type: string }) {
  const config = typeCopy[type as RewardType] ?? typeCopy.command;
  return <span className={`${styles.typeBadge} ${styles[`type_${type}`]}`}>{config.icon} {config.label}</span>;
}

function CrateContext() {
  return (
    <div className={styles.contextBar}>
      <div className={styles.crateMini}><i /><b>P</b><span>✦</span></div>
      <div><small>BLOC CIBLÉ</small><b>CAISSE PULSAR</b></div>
      <span className={styles.contextDivider} />
      <div><small>ACCÈS</small><b className={styles.online}>● ADMINISTRATEUR</b></div>
      <div className={styles.gesture}><kbd>MAJ</kbd><b>+</b><span>CLIC GAUCHE</span><small>depuis la caisse</small></div>
    </div>
  );
}

function GuidedEditor() {
  const [tierId, setTierId] = useState("rare");
  const [rewardId, setRewardId] = useState(5);
  const [rewardType, setRewardType] = useState<RewardType>("item");
  const [saved, setSaved] = useState(false);
  const tierRewards = rewards.filter(reward => reward.tier === tierId);
  const activeTier = tiers.find(tier => tier.id === tierId)!;

  return (
    <section className={styles.editorShell}>
      <header className={styles.editorHeader}>
        <div><span>CONFIGURATION DE LA CAISSE</span><h2>Pulsar</h2><small>Les joueurs verront ces changements à la prochaine ouverture.</small></div>
        <div className={styles.headerActions}><button>ANNULER</button><button className={styles.testButton}>▷ TESTER UN TIRAGE</button><button className={styles.saveButton} onClick={() => setSaved(true)}>{saved ? "✓ ENREGISTRÉ" : "ENREGISTRER"}</button></div>
      </header>

      <div className={styles.guidedGrid}>
        <aside className={styles.tierRail}>
          <div className={styles.panelTitle}><span>1</span><div><b>Choisir une rareté</b><small>Total de la caisse : 100 %</small></div></div>
          <div className={styles.totalBar}>{tiers.map(tier => <i key={tier.id} style={{ width: `${tier.chance}%`, background: tier.color }} />)}</div>
          {tiers.map(tier => (
            <button key={tier.id} className={tierId === tier.id ? styles.selectedTier : ""} onClick={() => { setTierId(tier.id); const next = rewards.find(reward => reward.tier === tier.id); if (next) setRewardId(next.id); }}>
              <i style={{ background: tier.color }} /><span><b>{tier.name}</b><small>{rewards.filter(reward => reward.tier === tier.id).length} récompense(s)</small></span><strong>{tier.chance} %</strong>
            </button>
          ))}
          <div className={styles.validBox}>✓ Répartition valide <b>100 %</b></div>
        </aside>

        <section className={styles.rewardList}>
          <div className={styles.panelTitle}><span>2</span><div><b>Lots · {activeTier.name}</b><small>Le poids partage les chances dans cette rareté.</small></div></div>
          <button className={styles.addReward}>＋ AJOUTER UNE RÉCOMPENSE</button>
          <div className={styles.rewardCards}>
            {tierRewards.map(reward => (
              <button key={reward.id} onClick={() => { setRewardId(reward.id); setRewardType(reward.type as RewardType); }} className={rewardId === reward.id ? styles.selectedReward : ""}>
                <span className={styles.rewardGlyph} style={{ color: activeTier.color }}>{reward.icon}</span>
                <span className={styles.rewardCardCopy}><b>{reward.name}</b><small>{reward.detail}</small><TypeBadge type={reward.type} /></span>
                <span className={styles.rewardWeight}><small>POIDS</small><b>{reward.weight}</b><em>≡</em></span>
              </button>
            ))}
            {tierRewards.length === 0 && <div className={styles.emptyTier}><b>Aucun lot dans cette rareté</b><span>Ajoute une première récompense pour l’activer.</span></div>}
          </div>
          <div className={styles.weightHelp}><span>ⓘ</span><p><b>Pas besoin de calculer.</b> Les probabilités exactes sont recalculées automatiquement selon les poids.</p></div>
        </section>

        <section className={styles.inspector}>
          <div className={styles.panelTitle}><span>3</span><div><b>Configurer le lot</b><small>Les champs s’adaptent au type choisi.</small></div></div>
          <label className={styles.fieldLabel}>TYPE DE RÉCOMPENSE</label>
          <div className={styles.typeGrid}>
            {(Object.keys(typeCopy) as RewardType[]).map(type => <button key={type} onClick={() => setRewardType(type)} className={rewardType === type ? styles.selectedType : ""}><i>{typeCopy[type].icon}</i><span><b>{typeCopy[type].label}</b><small>{typeCopy[type].description}</small></span></button>)}
          </div>
          <div className={styles.formGrid}>
            <label className={styles.fullField}><span>NOM AFFICHÉ AUX JOUEURS</span><input defaultValue={rewardType === "item" ? "Master Ball" : rewardType === "currency" ? "2 500 CobbleCoins" : rewardType === "grade" ? "Grade Nova · 7 jours" : "Clé Quasar"} /></label>
            {rewardType === "item" && <><label className={styles.fullField}><span>OBJET</span><div className={styles.searchInput}><b>◉</b><input defaultValue="cobblemon:master_ball" /><button>PARCOURIR</button></div></label><label><span>QUANTITÉ</span><input type="number" defaultValue="1" /></label><label><span>POIDS DU LOT</span><input type="number" defaultValue="65" /></label></>}
            {rewardType === "command" && <><label className={styles.fullField}><span>COMMANDE SERVEUR</span><textarea defaultValue="crates key give {player} quasar 1" /></label><div className={styles.variables}><span>VARIABLES DISPONIBLES</span><button>{"{player}"}</button><button>{"{amount}"}</button><small>Le « / » est facultatif.</small></div><label><span>POIDS DU LOT</span><input type="number" defaultValue="75" /></label></>}
            {rewardType === "currency" && <><label><span>MONNAIE</span><select defaultValue="cobblecoins"><option value="cobblecoins">CobbleCoins</option><option value="pokedollars">Poké Dollars</option></select></label><label><span>MONTANT</span><input type="number" defaultValue="2500" /></label><label><span>POIDS DU LOT</span><input type="number" defaultValue="40" /></label></>}
            {rewardType === "grade" && <><label className={styles.fullField}><span>GRADE</span><select defaultValue="nova"><option value="nova">Nova</option><option value="astral">Astral</option><option value="constellation">Constellation</option></select></label><label><span>DURÉE</span><select defaultValue="7"><option value="7">7 jours</option><option value="30">30 jours</option><option value="permanent">Permanent</option></select></label><label><span>POIDS DU LOT</span><input type="number" defaultValue="25" /></label></>}
          </div>
          <div className={styles.previewBox}><span>APERÇU JOUEUR</span><div className={styles.previewIcon}>◉</div><div><b>{rewardType === "item" ? "Master Ball ×1" : rewardType === "currency" ? "2 500 CobbleCoins" : rewardType === "grade" ? "Grade Nova · 7 jours" : "Clé Quasar ×1"}</b><small>RARE · chance réelle estimée 13 %</small></div></div>
          <div className={styles.inspectorFooter}><button className={styles.deleteButton}>SUPPRIMER LE LOT</button><button className={styles.applyButton}>✓ APPLIQUER</button></div>
        </section>
      </div>
    </section>
  );
}

function BoardEditor() {
  const [selected, setSelected] = useState(7);
  const [drawer, setDrawer] = useState(true);
  const [search, setSearch] = useState("");
  const selectedReward = rewards.find(reward => reward.id === selected) ?? rewards[0];
  const visibleRewards = useMemo(() => rewards.filter(reward => reward.name.toLowerCase().includes(search.toLowerCase())), [search]);

  return (
    <section className={`${styles.editorShell} ${styles.boardShell}`}>
      <header className={styles.editorHeader}>
        <div><span>VUE D’ENSEMBLE DE LA CAISSE</span><h2>Pulsar · 9 lots</h2><small>Glisse un lot vers une autre colonne pour changer sa rareté.</small></div>
        <div className={styles.headerActions}><label className={styles.boardSearch}>⌕<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher un lot…" /></label><button>HISTORIQUE</button><button className={styles.saveButton}>PUBLIER LES CHANGEMENTS</button></div>
      </header>

      <div className={styles.boardSummary}>
        <div><span>RÉPARTITION GLOBALE</span><b>100 %</b></div>
        <div className={styles.boardBar}>{tiers.map(tier => <i key={tier.id} title={tier.name} style={{ width: `${tier.chance}%`, background: tier.color }} />)}</div>
        <span className={styles.allGood}>✓ Aucun problème détecté</span>
        <button>⚙ PARAMÈTRES DE LA CAISSE</button>
      </div>

      <div className={styles.lootBoard}>
        {tiers.map(tier => {
          const items = visibleRewards.filter(reward => reward.tier === tier.id);
          return <section key={tier.id} className={styles.tierColumn} style={{ "--tier-color": tier.color } as React.CSSProperties}>
            <header><i /><div><b>{tier.name}</b><small>{items.length} lot(s)</small></div><label><input type="number" defaultValue={tier.chance} /><span>%</span></label></header>
            <div className={styles.columnBody}>
              {items.map(reward => <button key={reward.id} onClick={() => { setSelected(reward.id); setDrawer(true); }} className={selected === reward.id && drawer ? styles.boardCardSelected : ""}>
                <em>⠿</em><span className={styles.boardIcon}>{reward.icon}</span><span><b>{reward.name}</b><small>{reward.detail}</small><TypeBadge type={reward.type} /></span><strong><small>POIDS</small>{reward.weight}</strong>
              </button>)}
              <button className={styles.addCard}>＋<span>Ajouter un lot</span></button>
            </div>
          </section>;
        })}
      </div>

      {drawer && <aside className={styles.quickDrawer}>
        <button className={styles.closeDrawer} onClick={() => setDrawer(false)}>×</button>
        <div className={styles.drawerIdentity}><div>{selectedReward.icon}</div><span><small>MODIFICATION RAPIDE</small><b>{selectedReward.name}</b><TypeBadge type={selectedReward.type} /></span></div>
        <label><span>RARETÉ</span><select defaultValue={selectedReward.tier}>{tiers.map(tier => <option key={tier.id} value={tier.id}>{tier.name} · {tier.chance} %</option>)}</select></label>
        <label><span>NOM AFFICHÉ</span><input defaultValue={selectedReward.name} /></label>
        <label><span>{selectedReward.type === "item" ? "OBJET ET QUANTITÉ" : "COMMANDE EXÉCUTÉE"}</span><input defaultValue={selectedReward.type === "item" ? selectedReward.detail : "crates key give {player} quasar 1"} /></label>
        <div className={styles.drawerDuo}><label><span>POIDS</span><input type="number" defaultValue={selectedReward.weight} /></label><div><span>CHANCE ESTIMÉE</span><b>4,5 %</b><small>Calculée automatiquement</small></div></div>
        <div className={styles.drawerActions}><button>SUPPRIMER</button><button>MODIFIER EN DÉTAIL</button><button>✓ TERMINER</button></div>
      </aside>}
    </section>
  );
}

export default function CratesAdminMockupsPage() {
  const [concept, setConcept] = useState<Concept>("guided");
  return (
    <main className={styles.page}>
      <header className={styles.prototypeHeader}>
        <div><small>COBBLESTAR · MAQUETTES ADMIN</small><b>ÉDITION DIRECTE DES CAISSES</b></div>
        <nav>
          <button className={concept === "guided" ? styles.activeConcept : ""} onClick={() => setConcept("guided")}><span>01</span><div><b>ÉDITEUR GUIDÉ</b><small>Simple et sécurisé</small></div></button>
          <button className={concept === "board" ? styles.activeConcept : ""} onClick={() => setConcept("board")}><span>02</span><div><b>TABLEAU DES LOTS</b><small>Rapide et visuel</small></div></button>
        </nav>
        <Link href="/maquettes/crates/">← RETOUR AUX CAISSES JOUEUR</Link>
      </header>
      <CrateContext />
      <div className={styles.gameBackdrop}>
        <div className={styles.worldHint}><span>INTERACTION ADMIN</span><b>La fenêtre s’ouvre sur la caisse visée.</b><small>Aucun menu global, aucune commande à mémoriser.</small></div>
        {concept === "guided" ? <GuidedEditor /> : <BoardEditor />}
      </div>
      <footer className={styles.conceptNote}>
        <span>{concept === "guided" ? "PROPOSITION 01" : "PROPOSITION 02"}</span>
        <b>{concept === "guided" ? "La plus accessible pour les admins non techniques" : "La plus pratique pour équilibrer une grosse caisse"}</b>
        <p>{concept === "guided" ? "Un chemin en trois étapes : rareté, lot, configuration. Les champs techniques disparaissent derrière des choix compréhensibles." : "Toutes les raretés et tous les lots sont visibles ensemble. On déplace, compare et corrige sans changer d’écran."}</p>
      </footer>
    </main>
  );
}
