import { z } from "zod";
import { arenaPokemon, type ArenaCatalog } from "./arena-studio-schema.js";

export const PASTE_MAX_BYTES = 64 * 1024;
export const pasteInput = z.object({ source: z.string().trim().min(1).max(PASTE_MAX_BYTES) }).strict();
type Pokemon = z.infer<typeof arenaPokemon>;
type Choice = { id: string; label: string };
type Issue = { slot: number; line: number; message: string };
export type PastePreview = { team: Pokemon[]; errors: Issue[]; warnings: Issue[]; notes: string[]; source: "text" | "pokepaste" };
// Showdown names omit spaces/punctuation; match registry IDs AND translated display names.
const key = (v: string) => v.replaceAll("♀", "f").replaceAll("♂", "m").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
// Unown ! and ? are different forms, not disposable display punctuation.
const speciesName = (v: string) => v.replaceAll("♀", "f").replaceAll("♂", "m").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const speciesAlias = (v: string) => speciesName(v).replace(/[^a-z0-9!?]/g, "");
const path = (v: string) => v.substring(v.indexOf(":") + 1);
const stats = (n: number): Pokemon["ivs"] => ({ hp: n, atk: n, def: n, spa: n, spd: n, spe: n });
const statKeys: Record<string, keyof Pokemon["ivs"]> = { hp: "hp", atk: "atk", def: "def", spa: "spa", spatk: "spa", spd: "spd", spdef: "spd", spe: "spe", speed: "spe" };

/** This is an import preview, never a publication or a permissive Showdown legality validator.
 * Syntax reference: https://github.com/smogon/pokemon-showdown/blob/master/sim/teams.ts
 * Every resulting ID and form comes from the selected server's synchronized registries.
 */
export function previewArenaPaste(source: string, catalog: ArenaCatalog): PastePreview {
  const result: PastePreview = { team: [], errors: [], warnings: [], notes: ["Sans Level : niveau 100. Sans IVs : 31 partout. EV non indiqués : 0 (conventions Showdown).", "L’import remplace uniquement l’équipe du brouillon. Enregistrer puis publier reste nécessaire ; le serveur vérifie à nouveau les Pokémon."], source: "text" };
  const issue = (list: Issue[], slot: number, line: number, message: string) => { if (list.length < 60) list.push({ slot, line, message }); };
  if (Buffer.byteLength(source, "utf8") > PASTE_MAX_BYTES || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f§]/.test(source)) {
    issue(result.errors, 0, 0, "Texte trop volumineux (64 Kio maximum) ou caractères de contrôle interdits."); return result;
  }
  const resolve = (value: string, choices: Choice[], label: string, slot: number, line: number): string => {
    const exact = choices.filter(c => c.id === value);
    const matches = exact.length ? exact : choices.filter(c => key(path(c.id)) === key(value) || key(c.label) === key(value));
    if (matches.length !== 1) { issue(result.errors, slot, line, `${label} « ${value} » : ${matches.length ? "nom ambigu ; utilise l’identifiant complet du serveur" : "absent du catalogue du serveur"}.`); return ""; }
    return matches[0]!.id;
  };
  const resolveSpecies = (value: string, slot: number, line: number): { species: string; aspects: string[] } => {
    type Candidate = { species: string; aspects: string[] };
    const exact: Candidate[] = [], aliases: Candidate[] = [];
    const consider = (names: string[], candidate: Candidate) => {
      if (names.some(n => speciesName(n) === speciesName(value))) exact.push(candidate);
      else if (names.some(n => speciesAlias(n) === speciesAlias(value))) aliases.push(candidate);
    };
    for (const species of catalog.species) {
      const names = [species.id, path(species.id), species.label];
      consider(names, { species: species.id, aspects: [] });
      for (const form of species.forms ?? []) {
        if (!form.aspects.length) continue;
        // Cobblemon form names (Alola, Therian, Wash…) are authoritative. No invented aspects.
        consider(names.flatMap(n => [form.id, form.label].map(f => `${n}-${f}`)), { species: species.id, aspects: [...form.aspects] });
      }
    }
    const candidates = exact.length ? exact : aliases;
    const unique = [...new Map(candidates.map(c => [`${c.species}|${[...c.aspects].sort().join(",")}`, c])).values()];
    if (unique.length !== 1) { issue(result.errors, slot, line, `Espèce ou forme « ${value} » : ${unique.length ? "nom ambigu" : "absente du catalogue du serveur"}. Aucun remplacement par une forme normale.`); return { species: "", aspects: [] }; }
    return unique[0]!;
  };
  const blocks: { text: string; line: number }[][] = [];
  let current: { text: string; line: number }[] = [];
  for (const [i, raw] of source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n").entries()) {
    const text = raw.trim();
    if (!text || text === "---") { if (current.length) blocks.push(current); current = []; }
    else if (text.startsWith("===")) issue(result.errors, 0, i + 1, "Colle une seule équipe (export texte), pas une sauvegarde de plusieurs équipes.");
    else current.push({ text, line: i + 1 });
  }
  if (current.length) blocks.push(current);
  if (!blocks.length || blocks.length > 6) { issue(result.errors, 0, 0, "Il faut une équipe de 1 à 6 Pokémon, séparés par une ligne vide."); return result; }
  for (const [index, lines] of blocks.entries()) {
    const slot = index + 1, first = lines[0]!, errorCount = result.errors.length;
    const p: Pokemon = { species: "", aspects: [], level: 100, shiny: false, gender: "random", heldItem: "", ability: "", nature: "", moves: [], ivs: stats(31), evs: stats(0) };
    const header = first.text.split(/\s+@\s+/);
    if (header.length > 2) issue(result.errors, slot, first.line, "En-tête invalide : un seul objet tenu est autorisé.");
    let species = header[0]!;
    if (header[1] && key(header[1]) !== "noitem") p.heldItem = resolve(header[1], catalog.items.filter(c => c.id !== "minecraft:air"), "Objet tenu", slot, first.line);
    const gender = species.match(/\s+\(([MF])\)$/i);
    if (gender) { p.gender = gender[1]!.toUpperCase() === "M" ? "male" : "female"; species = species.slice(0, gender.index); }
    const named = species.match(/^(.+)\s+\(([^()]+)\)$/);
    if (named) { issue(result.warnings, slot, first.line, `Surnom « ${named[1]} » non transféré : les équipes d’arène n’ont pas encore de champ surnom.`); species = named[2]!; }
    Object.assign(p, resolveSpecies(species, slot, first.line));
    const seen = new Set<string>();
    const once = (field: string, line: number) => {
      if (seen.has(field)) { issue(result.errors, slot, line, `Champ ${field} répété : corrige la source pour éviter un écrasement silencieux.`); return false; }
      seen.add(field); return true;
    };
    for (const { text, line } of lines.slice(1)) {
      if (/^[-~]/.test(text)) {
        const move = text.slice(1).trim();
        p.moves.push(resolve(move, catalog.moves, "Attaque", slot, line));
        continue;
      }
      const nature = text.match(/^(.+)\s+Nature$/i);
      if (nature) { if (once("Nature", line)) p.nature = resolve(nature[1]!, catalog.natures, "Nature", slot, line); continue; }
      const field = text.match(/^([\w ]+):\s*(.*)$/);
      if (!field || !field[2]) { issue(result.errors, slot, line, `Ligne non reconnue : « ${text.slice(0, 160)} ». Rien ne sera ignoré.`); continue; }
      let name = field[1]!.toLowerCase(); const value = field[2]!;
      if (name === "trait") name = "ability";
      if (!once(name, line)) continue;
      if (name === "ability") p.ability = resolve(value, catalog.abilities, "Talent", slot, line);
      else if (name === "level") { if (!/^\d+$/.test(value) || +value < 1 || +value > 100) issue(result.errors, slot, line, "Le niveau doit être un entier de 1 à 100."); else p.level = +value; }
      else if (name === "shiny") { if (!/^(yes|no)$/i.test(value)) issue(result.errors, slot, line, "Shiny doit valoir Yes ou No."); else p.shiny = value.toLowerCase() === "yes"; }
      else if (name === "ivs" || name === "evs") {
        const used = new Set<string>();
        for (const allocation of value.split("/")) {
          const match = allocation.trim().match(/^(\d+)\s+([a-z. ]+)$/i), stat = match ? statKeys[key(match[2]!)] : undefined, number = match ? +match[1]! : -1;
          if (!stat || number > (name === "ivs" ? 31 : 252) || used.has(stat)) { issue(result.errors, slot, line, `${name.toUpperCase()} invalides ou statistique répétée : « ${allocation.trim()} ».`); continue; }
          used.add(stat); p[name][stat] = number;
        }
      } else if (["tera type", "happiness", "dynamax level", "gigantamax", "pokeball", "hidden power"].includes(name)) {
        const invalid = name === "happiness" ? !/^\d+$/.test(value) || +value > 255 : name === "dynamax level" ? !/^\d+$/.test(value) || +value > 10 : name === "gigantamax" ? !/^(yes|no)$/i.test(value) : value.length > 100;
        if (invalid) issue(result.errors, slot, line, `Valeur invalide pour ${field[1]}.`);
        else issue(result.warnings, slot, line, `Non transféré : ${field[1]} = ${value}. Ce réglage n’existe pas dans les équipes d’arène ; le combat peut différer du Poképaste.`);
      } else issue(result.errors, slot, line, `Champ non reconnu : ${field[1]}. Corrige la source ; aucune valeur inconnue n’est ignorée.`);
    }
    if (!p.moves.length) issue(result.warnings, slot, first.line, "Aucune attaque dans la source : le serveur utilisera les attaques automatiques du Pokémon.");
    if (!p.ability) issue(result.warnings, slot, first.line, "Talent non précisé : le serveur choisira un talent naturel.");
    if (!p.nature) issue(result.warnings, slot, first.line, "Nature non précisée : le serveur la choisira automatiquement.");
    const checked = arenaPokemon.safeParse(p);
    if (!checked.success) for (const e of checked.error.issues) issue(result.errors, slot, first.line, `${e.path.join(".")} : ${e.message}`);
    if (checked.success && result.errors.length === errorCount) result.team.push(checked.data);
  }
  return result;
}
