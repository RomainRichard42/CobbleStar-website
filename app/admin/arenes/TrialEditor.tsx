"use client";

import { useState } from "react";
import { TeamEditor, TeamPortrait } from "./TeamEditor";
import { RewardEditor } from "./RewardEditor";
import { type ArenaContent, type ArenaStage, type Catalog, type TrialSpec } from "./model";
import s from "./arenas.module.css";

const PUZZLES: Record<string, { title: string; setting: string }> = {
  canopy_sequence: { title: "Le chant de la canopée", setting: "Insecte · une serre vivante, des feuillages et une séquence à retrouver" },
  root_paths: { title: "Le jardin des racines", setting: "Plante · un jardin luxuriant et des chemins à démêler" },
  tide_valves: { title: "Les vannes des marées", setting: "Eau · un sanctuaire aquatique et un mécanisme de vannes" },
  frozen_route: { title: "La traversée du givre", setting: "Glace · un palais gelé et un itinéraire à observer" },
  resonant_crystals: { title: "L’écho des cristaux", setting: "Roche · une grotte minérale et des cristaux résonnants" },
  ember_furnaces: { title: "Le cœur de la forge", setting: "Feu · une forge volcanique et ses foyers" },
  wind_currents: { title: "Les courants du ciel", setting: "Vol · un belvédère ouvert sur le ciel et les vents" },
  astral_memory: { title: "La mémoire des astres", setting: "Psy · un observatoire spectral et un défi de mémoire" },
};

export function TrialEditor({ stage, content, catalog, onChange, showTrainers }: { stage: ArenaStage; content: ArenaContent; catalog: Catalog | null; onChange: (trial: TrialSpec) => void; showTrainers: () => void }) {
  const [tab, setTab] = useState<"story" | "alpha" | "rewards">("story");
  if (stage.league) return <section>
    <div className={s.sectionHeading}><div><span className={s.eyebrow}>UN SEUL PARCOURS · UNE SEULE TENTATIVE</span><h3>Les portes de la Ligue.</h3><p>Un grand palais, son lobby, puis cinq rencontres successives. Les équipes de chaque salle se règlent dans le menu de gauche.</p></div></div>
    <div className={s.leagueAdmission}><span>08</span><div><h4>Les huit badges ouvrent la porte.</h4><p>Le lobby précède la zone réservée aux challengers. Sans tous les badges, le joueur ne peut pas commencer le Conseil.</p></div></div>
    <ol className={s.leagueRoute} aria-label="Ordre des combats de Ligue">{content.stages.filter(value => value.league).map((room, i) => <li key={room.id} data-selected={room.id === stage.id}><span>{i === 4 ? "✦" : i + 1}</span><div><small>{i === 4 ? "LE MAÎTRE" : `CONSEIL ${i + 1}`}</small><b>{room.champion}</b><p>{room.name} · {room.team.length} Pokémon</p></div>{room.team[0] && <div className={s.leaguePortrait}><TeamPortrait pokemon={room.team[0]} catalog={catalog}/></div>}</li>)}</ol>
    <div className={s.hint}><b>La victoire ouvre la salle suivante.</b><p>Une défaite met fin à la tentative : le joueur doit reprendre au premier membre du Conseil. Aucun raccourci vers une salle déjà franchie pendant une ancienne tentative.</p><small>Ce schéma explique les règles. Ce n’est pas un aperçu du bâtiment en jeu.</small></div>
  </section>;
  const trial = stage.trial;
  if (!trial) return <section className={s.emptySmall}><span className={s.eyebrow}>PARCOURS NATIF REQUIS</span><h3>Le serveur doit partager cette épreuve.</h3><p>Installe la version CobbleStar avec les arènes d’aventure. Le Totem, l’énigme et les indications réelles apparaîtront à la prochaine synchronisation.</p><p>Les équipes, champions et récompenses déjà enregistrés sont conservés. Aucun parcours fictif ne remplace tes réglages.</p></section>;
  const puzzle = PUZZLES[trial.puzzleId];
  const patch = (value: Partial<TrialSpec>) => onChange({ ...trial, ...value });
  return <section>
    <div className={s.sectionHeading}><div><span className={s.eyebrow}>UNE ARÈNE · UNE AVENTURE</span><h3>{puzzle?.title ?? "L’épreuve de cette arène"}</h3><p>{puzzle?.setting ?? "Un parcours propre à cette arène, fourni par le mod."}</p></div></div>
    <ol className={s.adventureRoute} aria-label="Conditions pour affronter le champion"><li><span>01</span><h4>Explorer & combattre</h4><p>Résoudre l’énigme et battre les <b>{stage.trainers.filter(t => t.enabled).length} dresseur(s)</b> présents.</p><button type="button" onClick={showTrainers}>Préparer les dresseurs →</button></li><li><span>02</span><h4>Trouver le Totem</h4><p>Découvrir <b>{trial.alpha.name}</b>, puis remporter son combat.</p><button type="button" onClick={() => setTab("alpha")}>Préparer le gardien →</button></li><li><span>03</span><h4>Défier le champion</h4><p>L’accès à <b>{stage.champion}</b> s’ouvre une fois les conditions remplies. Sa victoire rapporte le badge.</p></li></ol>
    <nav className={s.subtabs} aria-label="Réglages du parcours">{([['story', 'Énigme & indications'], ['alpha', 'Pokémon Alpha / Totem'], ['rewards', 'Bonus du Totem']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
    {tab === "story" && <section className={s.trialStory}><div className={s.hint}><b>Un mécanisme propre à chaque arène.</b><p>L’énigme et le décor sont construits par le mod. Ici, tu écris l’accueil et l’indice présentés aux joueurs : aucune commande, aucun code à saisir.</p><small>Modifier un texte ne déplace pas les objets, ne change pas la solution et ne remplace pas le mécanisme de l’épreuve.</small></div><label>Présentation de l’épreuve<textarea maxLength={600} value={trial.intro} onChange={e => patch({ intro: e.target.value })}/><small>{trial.intro.length} / 600 · Ce que le joueur doit comprendre en arrivant.</small></label><label>Indice de l’énigme<textarea maxLength={400} value={trial.hint} onChange={e => patch({ hint: e.target.value })}/><small>{trial.hint.length} / 400 · Garde un indice cohérent avec le mécanisme en jeu.</small></label><div className={s.hint}><b>Le parcours n’est pas facultatif.</b><p>Dresseurs, énigme et Totem font partie des conditions du champion. Masquer un dresseur le retire du parcours ; un dresseur présent reste obligatoire.</p></div></section>}
    {tab === "alpha" && <section><label className={s.alphaName}>Nom affiché du gardien<input maxLength={80} value={trial.alpha.name} onChange={e => patch({ alpha: { ...trial.alpha, name: e.target.value } })}/></label><TeamEditor single team={[trial.alpha.pokemon]} catalog={catalog} level={stage.level} onChange={team => patch({ alpha: { ...trial.alpha, pokemon: team[0] } })}/></section>}
    {tab === "rewards" && <section><p className={s.hint}>Ces bonus récompensent la première victoire contre le Totem. Le badge est réservé à la victoire contre le champion, et ses récompenses se règlent séparément.</p><RewardEditor rewards={trial.alpha.rewards} catalog={catalog} onChange={rewards => patch({ alpha: { ...trial.alpha, rewards } })}/></section>}
  </section>;
}
