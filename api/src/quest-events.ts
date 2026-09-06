// Editorial catalogue. Only events emitted by the installed CobbleStar modules belong here.
export type EventField = { key: string; label: string; kind: 'species'|'items'|'blocks'|'entities'|'biomes'|'dimensions'|'npcs'|'number'|'boolean'; required?: boolean };
export type StoryEvent = { id: string; title: string; group: string; description: string; fields: EventField[]; unique?: boolean };
const pokemon: EventField[] = [{key:'species',label:'Quel Pokémon ?',kind:'species'}, {key:'min_level',label:'Niveau minimum',kind:'number'}, {key:'max_level',label:'Niveau maximum',kind:'number'}];
export const storyEvents: StoryEvent[] = [
  {id:'story_npc_talk',title:'Parler à un personnage',group:'Rencontres',description:'Le joueur doit interagir avec le PNJ choisi, une fois cette étape atteinte.',fields:[{key:'npc',label:'Personnage à rencontrer',kind:'npcs',required:true}]},
  {id:'cobblemon_capture',title:'Capturer un Pokémon',group:'Pokémon',description:'Une capture réussie, avec l’espèce et le niveau de ton choix.',fields:[...pokemon,{key:'shiny',label:'Chromatique ?',kind:'boolean'}]},
  {id:'cobblemon_new_species',title:'Capturer des espèces différentes',group:'Pokémon',description:'Chaque espèce ne compte qu’une fois dans cette étape, même si elle était déjà connue avant la quête.',fields:[],unique:true},
  {id:'cobblemon_shiny_capture',title:'Capturer un chromatique',group:'Pokémon',description:'Une capture chromatique réussie.',fields:pokemon},
  {id:'cobblemon_evolution',title:'Faire évoluer un Pokémon',group:'Pokémon',description:'Choisis éventuellement l’espèce obtenue après évolution.',fields:pokemon},
  {id:'cobblemon_hatch',title:'Faire éclore un œuf',group:'Pokémon',description:'Une éclosion Cobblemon terminée.',fields:pokemon},
  {id:'cobblemon_fossil',title:'Restaurer un fossile',group:'Pokémon',description:'Une restauration de fossile terminée.',fields:[]},
  {id:'cobblemon_wild_victory',title:'Gagner un combat sauvage',group:'Combats',description:'Une victoire contre un Pokémon sauvage, hors capture.',fields:[]},
  {id:'cobblemon_npc_victory',title:'Battre un dresseur',group:'Combats',description:'Une victoire Cobblemon contre un dresseur PNJ, pas contre un joueur.',fields:[]},
  {id:'minecraft_kill',title:'Vaincre une créature',group:'Combats',description:'Une créature vaincue par le joueur. Les joueurs et PNJ narratifs ne comptent pas.',fields:[{key:'entity',label:'Créature',kind:'entities'}]},
  {id:'vanilla_wither',title:'Vaincre le Wither',group:'Combats',description:'Porter le coup fatal au Wither.',fields:[]},
  {id:'vanilla_ender_dragon',title:'Vaincre l’Ender Dragon',group:'Combats',description:'Porter le coup fatal à l’Ender Dragon.',fields:[]},
  {id:'minecraft_visit',title:'Explorer un lieu',group:'Exploration',description:'Être dans le biome ou le monde choisi pendant cette étape. Vérifié chaque seconde.',fields:[{key:'biome',label:'Biome',kind:'biomes'},{key:'dimension',label:'Monde',kind:'dimensions'}],unique:true},
  {id:'vanilla_new_biome',title:'Explorer des biomes différents',group:'Exploration',description:'Chaque biome ne compte qu’une fois dans cette étape.',fields:[],unique:true},
  {id:'minecraft_break',title:'Casser des blocs',group:'Minecraft',description:'Un bloc réellement cassé. Les blocs reposés peuvent compter : pour les minerais naturels, utilise les événements Minage.',fields:[{key:'block',label:'Bloc à casser',kind:'blocks',required:true}]},
  {id:'minecraft_craft',title:'Fabriquer un objet',group:'Minecraft',description:'Objets fabriqués par le joueur et comptés par la statistique Minecraft.',fields:[{key:'item',label:'Objet à fabriquer',kind:'items',required:true}]},
  {id:'minecraft_use',title:'Utiliser un objet',group:'Minecraft',description:'Usages réussis comptabilisés par Minecraft, pas un simple clic dans le vide.',fields:[{key:'item',label:'Objet à utiliser',kind:'items',required:true}]},
  {id:'minecraft_fish',title:'Pêcher',group:'Minecraft',description:'Prises comptées par la statistique de pêche Minecraft.',fields:[]},
  {id:'minecraft_breed',title:'Faire reproduire des animaux',group:'Minecraft',description:'Reproductions vanilla réussies ; pour les Pokémon, utilise l’éclosion.',fields:[]},
  {id:'minecraft_trade',title:'Commercer avec un villageois',group:'Minecraft',description:'Échanges vanilla terminés, hors boutiques CobbleStar.',fields:[]},
  ...[['coal','du charbon'],['copper','du cuivre'],['iron','du fer'],['redstone','de la redstone'],['lapis','du lapis-lazuli'],['gold','de l’or'],['diamond','du diamant'],['emerald','des émeraudes']].map(([id,label]) => ({id:`vanilla_ore_${id}`,title:`Miner ${label}`,group:'Minage',description:'Minerais reconnus par le module serveur ; les placements suivis par le module sont exclus.',fields:[]})),
  {id:'vanilla_ancient_debris',title:'Miner des débris antiques',group:'Minage',description:'Débris antiques reconnus par le module serveur.',fields:[]},
  {id:'cobblestar_custom_raid',title:'Terminer un raid CobbleStar',group:'CobbleStar',description:'Une réussite remontée par le module de raids.',fields:[],unique:true},
  {id:'daily_login',title:'Rejoindre le serveur',group:'Rencontres',description:'Reconnaît aussi la session en cours lors de l’acceptation auprès d’un PNJ. Ce n’est pas une quête répétable.',fields:[],unique:true},
];
export type StoryCatalog = { protocol: number; items: {id:string;label:string}[]; blocks: {id:string;label:string}[]; entities: {id:string;label:string}[]; species: {id:string;label:string}[]; biomes: {id:string;label:string}[]; dimensions: {id:string;label:string}[] };
