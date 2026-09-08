"use client";
import { TeamPortrait } from "./TeamEditor";
import { signaturePokemon, type ArenaContent, type ArenaStage, type Catalog, type TrialSpec } from "./model";
import { RewardEditor } from "./RewardEditor";
import s from "./arenas.module.css";
const PLANS: Record<string, string[]> = {
  bug: ["La Maison des métamorphoses", "La passerelle tissée", "Les écrans d’écorce", "Piste de pollen"],
  grass: ["Les Terrasses de la floraison", "La haie des trois hauteurs", "La pergola des saisons", "La petite récolte"],
  water: ["L’Atelier des marées profondes", "Le ponton de charge", "Le sas à deux réservoirs", "Tournée des balises"],
  ice: ["Le Palais des glaces anciennes", "Le pont en glissade", "L’arche thermique", "Palet boréal"],
  rock: ["Le Musée du canyon vivant", "L’arche fragmentée", "Le convoi à deux wagons", "Fouille de précision"],
  fire: ["La Manufacture du soleil enfoui", "La transmission croisée", "Le moule négatif", "Le planage"],
  flying: ["L’Aérogare des hautes falaises", "Les voiles porteuses", "La charpente à deux ailes", "Vol des ascendances"],
  psychic: ["Le Théâtre des perspectives", "Le motif en profondeur", "Le couloir sans reflet", "L’écho en retard"],
};
export function EpreuvePlanEditor({ stage, content, catalog, onChange, showTrainers }: { stage: ArenaStage; content: ArenaContent; catalog: Catalog | null; onChange: (trial: TrialSpec) => void; showTrainers: () => void }) {
  if (stage.league) return <section><h3>Le Palais des Horizons.</h3><p>Huit badges pour entrer. Spectre, Dragon, Fée, Acier, puis le Maître : cinq rencontres de niveau 100, une seule équipe pendant la tentative.</p><ol className={s.leagueRoute}>{content.stages.filter(s => s.league).map((room, i) => <li key={room.id}><span>{i + 1}</span><div><b>{room.name}</b><p>{room.champion || "Identité à renseigner"}</p><small>{room.team.length} Pokémon · une seule équipe</small></div></li>)}</ol><p className={s.hint}>Une défaite reprend le Conseil depuis sa première salle. Les puzzles se recommencent localement. Les équipes vides bloquent le lancement de la rencontre ; aucune composition de remplissage n’est créée.</p></section>;
  const plan = PLANS[stage.id], trial = stage.trial;
  const principals = [signaturePokemon(stage)];
  return <section><div className={s.sectionHeading}><div><span className={s.eyebrow}>DEUX INDICES · UN TOTEM · UN CAPITAINE</span><h3>{plan?.[0] ?? stage.name}</h3><p>Les mécanismes et la place des rencontres sont propres au bâtiment. Les victoires ouvrent de vrais passages, pas un raccourci direct vers le Capitaine.</p></div></div>
    <div className={s.grid}>{plan?.slice(1).map((name, i) => <section key={name} className={s.hint}><small>{i === 2 ? "MINI-JEU" : "PUZZLE " + (i + 1)}</small><h4>{name}</h4></section>)}</div>
    <p className={s.hint}>Les deux indices sont remis après les deux victoires et restent consultables dans le carnet. Leur formulation et leurs prérequis sont liés aux dispositifs natifs pour éviter les indications impossibles.</p><button type="button" onClick={showTrainers}>Préparer les deux dresseurs →</button>
    <section className={s.subsection}><h4>Le Totem vient de l’équipe du Capitaine.</h4><div className={s.grid}>{principals.map((pokemon, i) => <article key={i} className={s.hint}><b>Pokémon principal</b>{pokemon ? <><TeamPortrait pokemon={pokemon} catalog={catalog}/><p>{pokemon.species} · niveau {pokemon.level}</p><small>Même forme, attaques et statistiques que le membre choisi.</small></> : <p>Principal à désigner dans l’onglet Équipe.</p>}</article>)}</div></section>
    {trial && <><label>Nom affiché du Totem<input maxLength={80} value={trial.alpha.name} onChange={e => onChange({ ...trial, alpha: { ...trial.alpha, name: e.target.value } })}/></label><section className={s.subsection}><h4>Bonus du Totem</h4><p>Le badge reste réservé à la victoire contre le Capitaine. Ces bonus utilisent le registre de récompenses existant.</p><RewardEditor rewards={trial.alpha.rewards} catalog={catalog} onChange={rewards => onChange({ ...trial, alpha: { ...trial.alpha, rewards } })}/></section></>}
  </section>;
}
