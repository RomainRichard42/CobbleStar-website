import type {DexEntry} from '../../../api/src/public-dex';
export const dexPath=(species:string)=>'/wiki/pokedex/'+encodeURIComponent(species)+'/';
export const defaultAppearance=(entries:DexEntry[])=>entries.find(e=>e.collection==='Classiques')??entries[0];
export const typeNames:Record<string,string>={normal:'Normal',fire:'Feu',water:'Eau',grass:'Plante',electric:'Électrik',ice:'Glace',fighting:'Combat',poison:'Poison',ground:'Sol',flying:'Vol',psychic:'Psy',bug:'Insecte',rock:'Roche',ghost:'Spectre',dragon:'Dragon',dark:'Ténèbres',steel:'Acier',fairy:'Fée',stellar:'Stellaire'};
export const statNames:Record<string,string>={hp:'PV',attack:'Attaque',defence:'Défense',special_attack:'Attaque spéciale',special_defence:'Défense spéciale',speed:'Vitesse'};
export const moveMethod=(method:string)=>/^\d+$/.test(method)?'Niveau '+method:({egg:'Reproduction',tm:'CT',tutor:'Maître des capacités',legacy:'Anciennes générations',special:'Méthode spéciale',evolution:'Évolution'} as Record<string,string>)[method]||method;
