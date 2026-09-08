export type Choice = { id: string; label: string; forms?: { id: string; label: string; aspects: string[] }[] };
export type Catalog = { protocol: number; species: Choice[]; items: Choice[]; moves: Choice[]; abilities: Choice[]; natures: Choice[]; npcClasses: Choice[] };
export const STATS = [["hp", "PV"], ["atk", "Attaque"], ["def", "Défense"], ["spa", "Att. spéciale"], ["spd", "Déf. spéciale"], ["spe", "Vitesse"]] as const;
export type Stats = Record<(typeof STATS)[number][0], number>;
export type PokemonSpec = { species: string; level: number; shiny: boolean; nature: string; ability: string; moves: string[]; heldItem: string; gender: "random" | "male" | "female" | "genderless"; ivs: Stats; evs: Stats; aspects: string[]; legacyProperties?: string };
export type RewardSpec = { items: { item: string; count: number }[]; experiencePoints: number; cobbleCoins: number };
export type TrainerSpec = { id: string; name: string; enabled: boolean; required: boolean; slot: number; npcClass: string; skill: number; team: PokemonSpec[]; rewards: RewardSpec };
export type ArenaStage = { id: string; index: number; name: string; theme: string; champion: string; level: number; x: number; z: number; league: boolean; badgeItem: string; npcClass: string; skill: number; team: PokemonSpec[]; rewards: RewardSpec; trainers: TrainerSpec[] };
export type ArenaContent = { schemaVersion: 1; stages: ArenaStage[] };
export type ArenaRuntime = { pendingRewards: number; reviewRewards: number; activeBattles: number; worldReady: boolean };
export type ArenaState = { content: ArenaContent; observed: ArenaContent | null; catalog: Catalog | null; runtime?: ArenaRuntime | null; draftRevision: number; publishedRevision: number; appliedRevision: number; hasUnpublishedChanges?: boolean; lastSeenAt: string | null; error: string; canWrite: boolean; history: { revision: number; actor: string; reason: string; createdAt: string }[] };
export type Server = { serverId: string };
export const THEME: Record<string, string> = { bug: "Insecte", grass: "Plante", water: "Eau", ice: "Glace", rock: "Roche", fire: "Feu", flying: "Vol", psychic: "Psy", league: "Ligue" };
// The player enters from +Z facing the champion at -Z: slots 0/1 are at the back.
export const SLOT_LABELS = ["Fond gauche", "Fond droite", "Milieu gauche", "Milieu droite", "Avant gauche", "Avant droite"];
export const total = (values: Stats) => Object.values(values).reduce((a, b) => a + b, 0);
export const normalized = (id: string) => id.includes(":") ? id : `cobblemon:${id}`;
export const labelFor = (choices: Choice[] | undefined, id: string) => choices?.find(c => normalized(c.id) === normalized(id))?.label ?? id.replace(/^\w+:/, "").replaceAll("_", " ");
export const blankRewards = (): RewardSpec => ({ items: [], experiencePoints: 0, cobbleCoins: 0 });
export const allStats = (n: number): Stats => ({ hp: n, atk: n, def: n, spa: n, spd: n, spe: n });
export const newPokemon = (species: string, level: number): PokemonSpec => ({ species, level, shiny: false, nature: "", ability: "", moves: [], heldItem: "", gender: "random", ivs: allStats(0), evs: allStats(0), aspects: [] });
export function validate(content: ArenaContent, catalog: Catalog | null): string[] {
  const errors: string[] = [];
  const validChoice = (choices: Choice[] | undefined, value: string) => !value || !choices?.length || choices.some(c => normalized(c.id) === normalized(value));
  const teamErrors = (team: PokemonSpec[], prefix: string) => {
    if (!team.length || team.length > 6) errors.push(`${prefix} : compose une équipe de 1 à 6 Pokémon.`);
    team.forEach((p, i) => {
      const name = `${prefix}, Pokémon ${i + 1}`;
      if (!p.species || !validChoice(catalog?.species, p.species)) errors.push(`${name} : choisis une espèce du serveur.`);
      if (!Number.isInteger(p.level) || p.level < 1 || p.level > 100) errors.push(`${name} : niveau de 1 à 100.`);
      if (total(p.evs) > 510 || Object.values(p.evs).some(v => !Number.isInteger(v) || v < 0 || v > 252)) errors.push(`${name} : 510 EV au total, 252 maximum par statistique.`);
      if (Object.values(p.ivs).some(v => !Number.isInteger(v) || v < 0 || v > 31)) errors.push(`${name} : les IV doivent être entre 0 et 31.`);
      if (!validChoice(catalog?.natures, p.nature) || !validChoice(catalog?.abilities, p.ability) || !validChoice(catalog?.items, p.heldItem)) errors.push(`${name} : une nature, un talent ou un objet n’est plus disponible sur le serveur.`);
      if (p.moves.length > 4 || new Set(p.moves).size !== p.moves.length || p.moves.some(m => !validChoice(catalog?.moves, m))) errors.push(`${name} : sélectionne jusqu’à 4 attaques différentes du serveur.`);
    });
  };
  const rewardErrors = (r: RewardSpec, prefix: string) => {
    if (!Number.isInteger(r.experiencePoints) || r.experiencePoints < 0 || r.experiencePoints > 100000 || !Number.isInteger(r.cobbleCoins) || r.cobbleCoins < 0 || r.cobbleCoins > 1000000) errors.push(`${prefix} : vérifie les montants XP et CobbleCoins.`);
    if (r.items.length > 8 || r.items.some(v => !v.item || !validChoice(catalog?.items, v.item) || !Number.isInteger(v.count) || v.count < 1 || v.count > 64)) errors.push(`${prefix} : jusqu’à 8 objets, de 1 à 64 unités chacun.`);
  };
  content.stages.forEach(stage => {
    if (!stage.champion.trim()) errors.push(`${stage.name} : nom du champion requis.`);
    if (!validChoice(catalog?.npcClasses, stage.npcClass) || !Number.isInteger(stage.skill) || stage.skill < 0 || stage.skill > 100) errors.push(`${stage.name} : vérifie le modèle et la stratégie du champion.`);
    teamErrors(stage.team, stage.name); rewardErrors(stage.rewards, stage.name);
    if (stage.trainers.length > 6 || new Set(stage.trainers.map(t => t.slot)).size !== stage.trainers.length) errors.push(`${stage.name} : six emplacements distincts maximum pour les dresseurs.`);
    stage.trainers.forEach(t => {
      if (!t.name.trim()) errors.push(`${stage.name} : nom du dresseur requis.`);
      if (!validChoice(catalog?.npcClasses, t.npcClass) || !Number.isInteger(t.skill) || t.skill < 0 || t.skill > 100) errors.push(`${stage.name}, ${t.name} : vérifie le modèle et la stratégie.`);
      teamErrors(t.team, `${stage.name}, ${t.name}`); rewardErrors(t.rewards, `${stage.name}, ${t.name}`);
    });
  });
  return errors;
}
