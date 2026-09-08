"use client";
import { useState } from "react";
import { ChoiceField, NumberField } from "./Fields";
import { blankRewards, type ArenaStage, type Catalog, type TrainerSpec } from "./model";
import { TeamEditor, TeamPortrait } from "./TeamEditor";
import { RewardEditor } from "./RewardEditor";
import s from "./arenas.module.css";

export function TrainerEditor({ stage, catalog, serverId, onChange }: { stage: ArenaStage; catalog: Catalog | null; serverId?: string; onChange: (trainers: TrainerSpec[]) => void }) {
  const [selected, setSelected] = useState(""), [tab, setTab] = useState<"identity" | "team" | "rewards">("identity");
  const trainer = stage.trainers.find(t => t.id === selected) ?? stage.trainers[0];
  const active = stage.trainers.filter(t => t.enabled);
  const patch = (value: Partial<TrainerSpec>) => onChange(stage.trainers.map(t => t.id === trainer.id ? { ...t, ...value } : t));
  if (stage.league) return <section className={s.hint}><h3>Un membre du Conseil, puis la salle suivante.</h3><p>La Ligue utilise les équipes du Conseil et du Maître, sans dresseurs secondaires supplémentaires. Les éventuels anciens réglages restent conservés dans la configuration.</p></section>;
  const freeSlot = Array.from({ length: 6 }, (_, i) => i).find(slot => !stage.trainers.some(t => t.slot === slot));
  return <section><div className={s.sectionHeading}><div><h3>Deux rencontres. Deux indices.</h3><p>Chaque victoire révèle l’indice prévu par le lieu, consultable dans le HUD et le carnet.</p></div><span className={s.pill}>{active.length} / 2 présents</span></div>
    {active.length !== 2 && <p className={s.notice}>Le parcours sera bloqué en jeu tant qu’il n’aura pas exactement deux dresseurs présents avec leurs équipes. Tu peux enregistrer sa préparation.</p>}
    <div className={s.trainerSwitch}>{stage.trainers.map(t => <button type="button" key={t.id} aria-pressed={trainer?.id === t.id} onClick={() => { setSelected(t.id); setTab("identity"); }}>{t.team[0] && <TeamPortrait pokemon={t.team[0]} catalog={catalog}/>}<span><b>{t.name}</b><small>{t.enabled ? "Rencontre · place " + (t.slot + 1) : "Conservé · masqué"}</small></span></button>)}</div>
    <button type="button" disabled={active.length >= 2 || freeSlot === undefined} onClick={() => { const next: TrainerSpec = { id: "trainer_" + crypto.randomUUID().replaceAll("-", "").slice(0, 12), name: "Dresseur à préparer", enabled: true, required: true, slot: freeSlot!, npcClass: stage.npcClass, skill: 50, team: [], rewards: blankRewards() }; onChange([...stage.trainers, next]); setSelected(next.id); setTab("identity"); }}>＋ Préparer un dresseur</button>
    {trainer && <div className={s.trainerDetail}><nav className={s.subtabs} aria-label="Réglages du dresseur">{([['identity', 'Identité & place'], ['team', 'Son équipe'], ['rewards', 'Ses récompenses']] as const).map(([id, name]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{name}</button>)}</nav>
      {tab === "identity" && <><div className={s.grid}><label>Nom du dresseur<input maxLength={64} value={trainer.name} onChange={e => patch({ name: e.target.value })}/></label><label>Ordre des rencontres<select value={trainer.slot} onChange={e => patch({ slot: Number(e.target.value) })}>{Array.from({ length: 6 }, (_, slot) => <option key={slot} value={slot} disabled={stage.trainers.some(t => t.id !== trainer.id && t.slot === slot)}>Place {slot + 1}{slot > 1 ? " · historique" : ""}</option>)}</select></label><ChoiceField label="Modèle du dresseur" choices={catalog?.npcClasses} value={trainer.npcClass} onChange={npcClass => patch({ npcClass })}/><NumberField label="Stratégie du dresseur" max={100} value={trainer.skill} onChange={skill => patch({ skill })}/></div><label className={s.checkbox}><input type="checkbox" checked={trainer.enabled} disabled={!trainer.enabled && active.length >= 2} onChange={e => patch({ enabled: e.target.checked, required: e.target.checked })}/>Présent dans l’épreuve</label><p className={s.hint}>Les deux dresseurs présents sont ordonnés par leur place. Les indices sont liés aux vrais puzzles. Masquer conserve les équipes ; aucune suppression automatique des anciens réglages.</p></>}
      {tab === "team" && <TeamEditor key={trainer.id} serverId={serverId} team={trainer.team} level={stage.level} catalog={catalog} onChange={team => patch({ team })}/>}
      {tab === "rewards" && <RewardEditor rewards={trainer.rewards} catalog={catalog} onChange={rewards => patch({ rewards })}/>}
    </div>}
  </section>;
}
