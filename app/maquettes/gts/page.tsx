"use client";

import { useMemo, useState, type CSSProperties } from "react";
import styles from "./gts.module.css";

type Format = "terminal" | "dex" | "market" | "showcase" | "watch";
type Screen = "browse" | "detail" | "purchase" | "sell" | "party" | "price" | "mine" | "history";
type ListingKind = "pokemon" | "item";

type Listing = {
  id: number; kind: ListingKind; name: string; price: number; seller: string;
  image: string; accent: string; count: number; remaining: string; sales: number;
  median: number; minimum: number; maximum: number; trend: number; level?: number;
  nature?: string; type?: string; form?: string; ability?: string; iv?: number; tags: string[];
};

const formats: { key: Format; number: string; title: string; text: string }[] = [
  { key: "terminal", number: "01", title: "Comptoir CobbleStar", text: "Grille + aperçu" },
  { key: "dex", number: "02", title: "Galerie Pokédex", text: "Cartes visuelles" },
  { key: "market", number: "03", title: "Bourse des dresseurs", text: "Registre dense" },
  { key: "showcase", number: "04", title: "Vitrine stellaire", text: "Sélection premium" },
  { key: "watch", number: "05", title: "Flux StarWatch", text: "Portable et rapide" },
];

const screens: { key: Screen; label: string }[] = [
  { key: "browse", label: "Marché" }, { key: "detail", label: "Fiche" },
  { key: "purchase", label: "Achat" }, { key: "sell", label: "Vendre" },
  { key: "party", label: "Équipe" }, { key: "price", label: "Prix & durée" },
  { key: "mine", label: "Mes ventes" }, { key: "history", label: "Historique" },
];

const pokemonSprite = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
const mcItem = (name: string) => `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.21/assets/minecraft/textures/item/${name}.png`;
const cobbleItem = (name: string) => `https://raw.githubusercontent.com/Cobblemon/cobblemon/main/common/src/main/resources/assets/cobblemon/textures/item/poke_balls/${name}.png`;

const listings: Listing[] = [
  { id: 448, kind: "pokemon", name: "Lucario", level: 72, price: 18500, seller: "NoxAstra", nature: "Jovial", type: "COMBAT · ACIER", form: "Standard", ability: "Attention", iv: 89, tags: ["5 IV", "EV entraînés", "Talent rare"], image: pokemonSprite(448), accent: "#6ee7ef", count: 1, remaining: "8 h 42", sales: 31, median: 19200, minimum: 15400, maximum: 23800, trend: -4.2 },
  { id: 700, kind: "pokemon", name: "Nymphali", level: 58, price: 24750, seller: "Lunarya", nature: "Calme", type: "FÉE", form: "Shiny", ability: "Peau Féérique", iv: 93, tags: ["Shiny", "5 IV", "Ruban"], image: pokemonSprite(700), accent: "#f3a4d3", count: 1, remaining: "21 h 05", sales: 18, median: 26800, minimum: 22100, maximum: 34900, trend: 7.8 },
  { id: 282, kind: "pokemon", name: "Gardevoir", level: 64, price: 12900, seller: "Orion", nature: "Modeste", type: "PSY · FÉE", form: "Standard", ability: "Synchro", iv: 82, tags: ["4 IV", "EV entraînés"], image: pokemonSprite(282), accent: "#91e8c8", count: 1, remaining: "3 h 17", sales: 42, median: 13750, minimum: 9900, maximum: 18600, trend: 1.4 },
  { id: 1001, kind: "item", name: "Master Ball", price: 32000, seller: "Ryu", tags: ["Objet rare", "Lot ×4"], image: cobbleItem("master_ball.png"), accent: "#9b83ff", count: 4, remaining: "11 h 29", sales: 12, median: 30500, minimum: 27000, maximum: 36000, trend: 4.6 },
  { id: 1002, kind: "item", name: "Diamant", price: 4800, seller: "Moka", tags: ["Minecraft", "Lot ×32"], image: mcItem("diamond.png"), accent: "#65e9dd", count: 32, remaining: "1 j 18 h", sales: 84, median: 5120, minimum: 4200, maximum: 6700, trend: -2.1 },
  { id: 1003, kind: "item", name: "Éclat d'améthyste", price: 2100, seller: "Mira", tags: ["Minecraft", "Lot ×16"], image: mcItem("amethyst_shard.png"), accent: "#d6a1ff", count: 16, remaining: "6 h 51", sales: 57, median: 2250, minimum: 1600, maximum: 3100, trend: 0.8 },
  { id: 6, kind: "pokemon", name: "Dracaufeu", level: 81, price: 28600, seller: "Pyron", nature: "Timide", type: "FEU · VOL", form: "Standard", ability: "Brasier", iv: 91, tags: ["Shiny", "5 IV", "Gigamax"], image: pokemonSprite(6), accent: "#ff9478", count: 1, remaining: "4 h 26", sales: 63, median: 27500, minimum: 21000, maximum: 39000, trend: 5.1 },
  { id: 445, kind: "pokemon", name: "Carchacrok", level: 76, price: 21800, seller: "Kael", nature: "Rigide", type: "DRAGON · SOL", form: "Standard", ability: "Peau Dure", iv: 95, tags: ["5 IV", "EV entraînés", "Compétitif"], image: pokemonSprite(445), accent: "#7f9cff", count: 1, remaining: "16 h 09", sales: 49, median: 22400, minimum: 17800, maximum: 30100, trend: 2.7 },
  { id: 133, kind: "pokemon", name: "Évoli", level: 24, price: 7200, seller: "Nemi", nature: "Docile", type: "NORMAL", form: "Shiny", ability: "Adaptabilité", iv: 78, tags: ["Shiny", "Poké Ball", "Petit gabarit"], image: pokemonSprite(133), accent: "#ffe181", count: 1, remaining: "2 j 03 h", sales: 105, median: 7600, minimum: 5200, maximum: 11000, trend: -1.2 },
  { id: 376, kind: "pokemon", name: "Métalosse", level: 100, price: 44500, seller: "Atlas", nature: "Rigide", type: "ACIER · PSY", form: "Standard", ability: "Corps Sain", iv: 98, tags: ["6 IV", "Niveau 100", "EV parfaits"], image: pokemonSprite(376), accent: "#81c7e8", count: 1, remaining: "7 h 55", sales: 17, median: 42900, minimum: 36000, maximum: 52000, trend: 8.4 },
  { id: 887, kind: "pokemon", name: "Lanssorien", level: 69, price: 19100, seller: "Spectra", nature: "Pressé", type: "DRAGON · SPECTRE", form: "Standard", ability: "Corps Maudit", iv: 87, tags: ["5 IV", "Rapide", "EV entraînés"], image: pokemonSprite(887), accent: "#8ad7c8", count: 1, remaining: "13 h 31", sales: 28, median: 19800, minimum: 15100, maximum: 25600, trend: -3.6 },
  { id: 658, kind: "pokemon", name: "Amphinobi", level: 73, price: 23600, seller: "Shinobi", nature: "Naïf", type: "EAU · TÉNÈBRES", form: "Standard", ability: "Protéen", iv: 92, tags: ["Talent caché", "5 IV", "Rapide"], image: pokemonSprite(658), accent: "#5dbdff", count: 1, remaining: "19 h 47", sales: 71, median: 24100, minimum: 18800, maximum: 31500, trend: 3.2 },
  { id: 778, kind: "pokemon", name: "Mimiqui", level: 47, price: 14800, seller: "LuneNoire", nature: "Prudent", type: "SPECTRE · FÉE", form: "Standard", ability: "Fantômasque", iv: 86, tags: ["4 IV", "Lune Ball", "Ruban"], image: pokemonSprite(778), accent: "#d8c58b", count: 1, remaining: "10 h 12", sales: 36, median: 15200, minimum: 11900, maximum: 20700, trend: 1.9 },
  { id: 359, kind: "pokemon", name: "Absol", level: 55, price: 16900, seller: "Eclipse", nature: "Jovial", type: "TÉNÈBRES", form: "Shiny", ability: "Chanceux", iv: 88, tags: ["Shiny", "5 IV", "Rare"], image: pokemonSprite(359), accent: "#f3b2e0", count: 1, remaining: "1 j 02 h", sales: 22, median: 17400, minimum: 13200, maximum: 22900, trend: 6.3 },
  { id: 1004, kind: "item", name: "Lingot de netherite", price: 12500, seller: "Forge", tags: ["Minecraft", "Lot ×8"], image: mcItem("netherite_ingot.png"), accent: "#b6a2aa", count: 8, remaining: "5 h 08", sales: 93, median: 13100, minimum: 10800, maximum: 15700, trend: 2.2 },
  { id: 1005, kind: "item", name: "Lingot d'or", price: 3600, seller: "Solaria", tags: ["Minecraft", "Lot ×64"], image: mcItem("gold_ingot.png"), accent: "#ffd765", count: 64, remaining: "23 h 16", sales: 132, median: 3450, minimum: 2800, maximum: 4300, trend: 1.1 },
  { id: 1006, kind: "item", name: "Émeraude", price: 6400, seller: "Verdant", tags: ["Minecraft", "Lot ×32"], image: mcItem("emerald.png"), accent: "#65e9a5", count: 32, remaining: "9 h 03", sales: 76, median: 6250, minimum: 5100, maximum: 7900, trend: -0.7 },
  { id: 1007, kind: "item", name: "Livre enchanté", price: 8900, seller: "Archiviste", tags: ["Raccommodage", "Objet enchanté"], image: mcItem("enchanted_book.png"), accent: "#cf83ff", count: 1, remaining: "1 j 09 h", sales: 41, median: 9200, minimum: 7000, maximum: 12800, trend: 4.1 },
];

const party: Listing[] = [listings[0], listings[1], listings[2],
  { ...listings[0], id: 445, name: "Carchacrok", image: pokemonSprite(445), level: 80, iv: 96, nature: "Rigide", type: "DRAGON · SOL" },
  { ...listings[0], id: 778, name: "Mimiqui", image: pokemonSprite(778), level: 49, iv: 84, nature: "Prudent", type: "SPECTRE · FÉE" },
  { ...listings[0], id: 133, name: "Évoli", image: pokemonSprite(133), level: 22, iv: 71, nature: "Docile", type: "NORMAL" },
];

const coins = (value: number) => new Intl.NumberFormat("fr-FR").format(value);
const cssVars = (accent: string) => ({ "--accent": accent } as CSSProperties);

function Artwork({ item, large = false }: { item: Listing; large?: boolean }) {
  return <img className={`${styles.artwork} ${item.kind === "item" ? styles.itemArt : ""} ${large ? styles.artLarge : ""}`} src={item.image} alt={item.name} />;
}

function PrototypeNav({ format, setFormat, screen, setScreen }: { format: Format; setFormat: (v: Format) => void; screen: Screen; setScreen: (v: Screen) => void }) {
  return <aside className={styles.prototypeNav}>
    <div className={styles.protoFormats}><small>5 DIRECTIONS</small>{formats.map((item) => <button key={item.key} className={format === item.key ? styles.protoActive : ""} onClick={() => setFormat(item.key)}><b>{item.number}</b><span>{item.title}</span><i>{item.text}</i></button>)}</div>
    <div className={styles.protoPages}><small>PARCOURS COMPLET</small>{screens.map((item) => <button key={item.key} className={screen === item.key ? styles.pageActive : ""} onClick={() => setScreen(item.key)}>{item.label}</button>)}</div>
    <em>MAQUETTE WEB · NON INTÉGRÉE AU MOD</em>
  </aside>;
}

function Header({ screen, setScreen }: { screen: Screen; setScreen: (v: Screen) => void }) {
  return <header className={styles.header}>
    <div className={styles.brand}><span>✦</span><div><b>COBBLESTAR</b><small>GTS · RÉSEAU D&apos;ÉCHANGES</small></div></div>
    <nav><button className={["browse", "detail", "purchase"].includes(screen) ? styles.activeNav : ""} onClick={() => setScreen("browse")}>MARCHÉ</button><button className={["sell", "party", "price"].includes(screen) ? styles.activeNav : ""} onClick={() => setScreen("sell")}>VENDRE</button><button className={screen === "mine" ? styles.activeNav : ""} onClick={() => setScreen("mine")}>MES VENTES <i>3</i></button><button className={screen === "history" ? styles.activeNav : ""} onClick={() => setScreen("history")}>HISTORIQUE</button></nav>
    <button className={styles.wallet}>◈ <b>80 427</b></button><button className={styles.close}>×</button>
  </header>;
}

function Footer() { return <footer className={styles.footer}><span><kbd>ESC</kbd> FERMER</span><b>CLIC sélectionner · MAJ aperçu rapide · CTRL+F rechercher</b><span>● RÉSEAU CONNECTÉ</span></footer>; }
type MarketKind = "all" | ListingKind;
type PokemonFilter = "none" | "shiny" | "iv90";
type MarketSort = "newest" | "priceAsc" | "priceDesc";
function Search({ query, setQuery, kind, setKind, pokemonFilter, setPokemonFilter, sort, setSort, reset }: { query: string; setQuery: (v: string) => void; kind: MarketKind; setKind: (v: MarketKind) => void; pokemonFilter: PokemonFilter; setPokemonFilter: (v: PokemonFilter) => void; sort: MarketSort; setSort: (v: MarketSort) => void; reset: () => void }) {
  const nextKind: Record<MarketKind, MarketKind> = { all: "pokemon", pokemon: "item", item: "all" };
  const nextFilter: Record<PokemonFilter, PokemonFilter> = { none: "shiny", shiny: "iv90", iv90: "none" };
  const nextSort: Record<MarketSort, MarketSort> = { newest: "priceAsc", priceAsc: "priceDesc", priceDesc: "newest" };
  return <div className={styles.search}><label>⌕ <input aria-label="Recherche GTS" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pokémon, objet, vendeur, talent…" /></label><button onClick={() => setKind(nextKind[kind])}>CATÉGORIE <b>{kind === "all" ? "TOUT" : kind === "pokemon" ? "POKÉMON" : "OBJETS"}</b></button><button onClick={() => setPokemonFilter(nextFilter[pokemonFilter])}>FILTRE POKÉMON <b>{pokemonFilter === "none" ? "AUCUN" : pokemonFilter === "shiny" ? "SHINY" : "IV 90 % +"}</b></button><button onClick={() => setSort(nextSort[sort])}>TRIER <b>{sort === "newest" ? "PLUS RÉCENT" : sort === "priceAsc" ? "PRIX CROISSANT" : "PRIX DÉCROISSANT"}</b></button><button onClick={reset}>↻</button></div>;
}

function ListingCard({ item, selected, setSelected, open }: { item: Listing; selected: boolean; setSelected: () => void; open: () => void }) {
  return <button onClick={setSelected} onDoubleClick={open} className={`${styles.listingCard} ${selected ? styles.listingSelected : ""}`} style={cssVars(item.accent)}>
    <div className={styles.cardVisual}><Artwork item={item}/><span>{item.kind === "pokemon" ? `N.${item.level}` : `×${item.count}`}</span></div>
    <div className={styles.cardCopy}><small>{item.kind === "pokemon" ? item.type : "OBJET"}</small><strong>{item.name}</strong><span>par {item.seller} · {item.remaining}</span></div>
    <div className={styles.cardMeta}>{item.tags.slice(0, 2).map((tag) => <i key={tag}>{tag}</i>)}</div><b className={styles.cardPrice}>◈ {coins(item.price)}</b><span className={styles.cardArrow}>›</span>
  </button>;
}

function Inspector({ item, setScreen }: { item: Listing; setScreen: (v: Screen) => void }) {
  return <aside className={styles.inspector} style={cssVars(item.accent)}><div className={styles.inspectorTitle}><small>OFFRE SÉLECTIONNÉE</small><b>{item.kind === "pokemon" ? "POKÉMON" : "OBJET"}</b></div><div className={styles.inspectVisual}><Artwork item={item} large/><i/><i/></div><h2>{item.name}</h2><p>{item.kind === "pokemon" ? `N.${item.level} · ${item.type} · ${item.nature}` : `Lot de ${item.count} · livraison en inventaire`}</p><div className={styles.statStrip}><span><small>MÉDIANE</small><b>◈ {coins(item.median)}</b></span><span><small>VENTES</small><b>{item.sales}</b></span><span><small>24 H</small><b className={item.trend >= 0 ? styles.up : styles.down}>{item.trend > 0 ? "+" : ""}{item.trend}%</b></span></div><div className={styles.inspectBottom}><strong>◈ {coins(item.price)}</strong><button onClick={() => setScreen("detail")}>INSPECTER →</button></div></aside>;
}

function Browse({ selected, setSelected, setScreen, format }: { selected: Listing; setSelected: (v: Listing) => void; setScreen: (v: Screen) => void; format: Format }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MarketKind>("all");
  const [pokemonFilter, setPokemonFilter] = useState<PokemonFilter>("none");
  const [sort, setSort] = useState<MarketSort>("newest");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return listings.filter((item) => (kind === "all" || item.kind === kind) && (pokemonFilter === "none" || item.kind === "pokemon" && (pokemonFilter === "shiny" ? item.form === "Shiny" : (item.iv || 0) >= 90)) && (!needle || [item.name, item.seller, item.type || "", item.ability || "", ...item.tags].some((value) => value.toLocaleLowerCase("fr").includes(needle)))).sort((a, b) => sort === "priceAsc" ? a.price - b.price : sort === "priceDesc" ? b.price - a.price : b.id - a.id);
  }, [kind, pokemonFilter, query, sort]);
  const pageSize = format === "market" ? 7 : format === "dex" || format === "showcase" || format === "watch" ? 6 : 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const chooseKind = (value: MarketKind) => { setKind(value); setPage(1); };
  const choosePokemonFilter = (value: PokemonFilter) => { setPokemonFilter(value); setPage(1); };
  const reset = () => { setQuery(""); setKind("all"); setPokemonFilter("none"); setSort("newest"); setPage(1); };
  const turnPage = (direction: number) => setPage(Math.max(1, Math.min(pageCount, currentPage + direction)));
  return <><Search query={query} setQuery={(value) => { setQuery(value); setPage(1); }} kind={kind} setKind={chooseKind} pokemonFilter={pokemonFilter} setPokemonFilter={choosePokemonFilter} sort={sort} setSort={(value) => { setSort(value); setPage(1); }} reset={reset}/><main className={styles.marketStage}><aside className={styles.filters}><small>CATÉGORIES</small><button className={kind === "all" ? styles.filterActive : ""} onClick={() => chooseKind("all")}>✦ Tout <b>{listings.length}</b></button><button className={kind === "pokemon" ? styles.filterActive : ""} onClick={() => chooseKind("pokemon")}>◉ Pokémon <b>{listings.filter((item) => item.kind === "pokemon").length}</b></button><button className={kind === "item" ? styles.filterActive : ""} onClick={() => chooseKind("item")}>◇ Objets <b>{listings.filter((item) => item.kind === "item").length}</b></button><hr/><small>POKÉMON</small><button className={pokemonFilter === "shiny" ? styles.filterActive : ""} onClick={() => choosePokemonFilter(pokemonFilter === "shiny" ? "none" : "shiny")}>Shiny</button><button>Légendaires</button><button className={pokemonFilter === "iv90" ? styles.filterActive : ""} onClick={() => choosePokemonFilter(pokemonFilter === "iv90" ? "none" : "iv90")}>IV 90 % +</button><div><b>3 / 3</b><span>emplacements de vente</span><button onClick={() => setScreen("sell")}>＋ VENDRE</button></div></aside><section className={styles.results} onWheel={(event) => { if (Math.abs(event.deltaY) > 18) turnPage(event.deltaY > 0 ? 1 : -1); }}><div className={styles.resultTitle}><div><b>MARCHÉ EN DIRECT</b><small>{filtered.length} annonces visibles · Pokémon et objets</small></div><span>PAGE {currentPage} / {pageCount}</span></div><div className={styles.listingGrid}>{visible.length ? visible.map((item) => <ListingCard key={item.id} item={item} selected={selected.id === item.id} setSelected={() => setSelected(item)} open={() => { setSelected(item); setScreen("detail"); }}/>) : <div className={styles.emptyMarket}><b>AUCUNE ANNONCE</b><span>Modifie la recherche ou réinitialise les filtres.</span><button onClick={reset}>RÉINITIALISER</button></div>}</div><div className={styles.marketPager}><button disabled={currentPage === 1} onClick={() => turnPage(-1)}>← PRÉCÉDENT</button><div className={styles.pageDots}>{Array.from({ length: pageCount }, (_, index) => <button aria-label={`Page ${index + 1}`} key={index} className={index + 1 === currentPage ? styles.pageDotActive : ""} onClick={() => setPage(index + 1)}>{index + 1}</button>)}</div><span>{filtered.length ? `${(currentPage - 1) * pageSize + 1}—${Math.min(currentPage * pageSize, filtered.length)} SUR ${filtered.length}` : "0 RÉSULTAT"}</span><button disabled={currentPage === pageCount} onClick={() => turnPage(1)}>SUIVANT →</button></div></section><Inspector item={selected} setScreen={setScreen}/></main></>;
}

function PriceGraph({ item }: { item: Listing }) { return <div className={styles.graph}><div><small>HISTORIQUE DU PRIX</small><b>{item.trend > 0 ? "+" : ""}{item.trend}% sur 24 h</b></div><svg viewBox="0 0 500 100" preserveAspectRatio="none"><polyline points="0,78 55,67 105,73 160,46 220,55 275,33 335,43 390,18 445,27 500,10"/></svg><span>Min. ◈ {coins(item.minimum)}</span><span>Médiane ◈ {coins(item.median)}</span><span>Max. ◈ {coins(item.maximum)}</span></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className={styles.info}><small>{label}</small><b>{value}</b></div>; }

function DetailPage({ item, setScreen }: { item: Listing; setScreen: (v: Screen) => void }) {
  return <main className={styles.pageBody}><button className={styles.back} onClick={() => setScreen("browse")}>← RETOUR AU MARCHÉ</button><section className={styles.detailPage} style={cssVars(item.accent)}><div className={styles.heroVisual}><Artwork item={item} large/><span>{item.kind === "pokemon" ? `NIVEAU ${item.level}` : `LOT ×${item.count}`}</span></div><article className={styles.fullDetails}><small>ANNONCE #{item.id} · {item.remaining} RESTANTES</small><h1>{item.name}</h1><p>Vendu par <b>{item.seller}</b></p>{item.kind === "pokemon" ? <><div className={styles.infoGrid}><Info label="FORME" value={item.form || "Standard"}/><Info label="NATURE" value={item.nature || "—"}/><Info label="TALENT" value={item.ability || "—"}/><Info label="IV TOTAL" value={`${item.iv}% · 166/186`}/><Info label="EV" value="508 / 510"/><Info label="OBJET TENU" value="Aucun"/></div><div className={styles.ivs}>{["PV 31", "ATQ 31", "DEF 28", "ATQ.S 31", "DEF.S 30", "VIT 31"].map((v) => <span key={v}>{v}</span>)}</div></> : <div className={styles.itemInfo}><Info label="IDENTIFIANT" value="minecraft:diamond"/><Info label="QUANTITÉ" value={`×${item.count}`}/><p>L&apos;objet complet sera livré directement dans ton inventaire après validation.</p></div>}<PriceGraph item={item}/></article><aside className={styles.checkout}><small>PRIX DE L&apos;ANNONCE</small><strong>◈ {coins(item.price)}</strong><p>Solde actuel<br/><b>◈ 80 427</b></p><button onClick={() => setScreen("purchase")}>CONTINUER VERS L&apos;ACHAT</button><span>Transaction atomique et sécurisée</span></aside></section></main>;
}

function PurchasePage({ item, setScreen }: { item: Listing; setScreen: (v: Screen) => void }) {
  const after = 80427 - item.price;
  return <main className={styles.centerPage}><section className={styles.confirmBox} style={cssVars(item.accent)}><small>CONFIRMATION D&apos;ACHAT</small><h1>Vérifie la transaction</h1><div className={styles.confirmProduct}><Artwork item={item}/><div><b>{item.name}</b><span>{item.kind === "pokemon" ? `N.${item.level} · ${item.nature}` : `Objet ×${item.count}`}</span><small>Vendeur · {item.seller}</small></div></div><div className={styles.balanceRows}><span>Solde actuel <b>◈ 80 427</b></span><span>Prix de l&apos;annonce <b>− ◈ {coins(item.price)}</b></span><span>Après achat <b>◈ {coins(after)}</b></span></div><p>Le débit, la livraison et le paiement du vendeur sont effectués ensemble. En cas d&apos;échec, tout est annulé.</p><div className={styles.confirmActions}><button onClick={() => setScreen("detail")}>ANNULER</button><button onClick={() => setScreen("browse")}>CONFIRMER L&apos;ACHAT</button></div></section></main>;
}

function SellPage({ setScreen }: { setScreen: (v: Screen) => void }) { return <main className={styles.centerPage}><section className={styles.sellChoice}><div><small>NOUVELLE ANNONCE</small><h1>Que veux-tu vendre ?</h1><p>Tu disposes de <b>3 emplacements sur 3</b>.</p></div><button onClick={() => setScreen("party")}><span>◉</span><div><b>UN POKÉMON</b><small>Choisir parmi les 6 Pokémon de ton équipe</small></div><i>→</i></button><button onClick={() => setScreen("price")}><span>◇</span><div><b>L&apos;OBJET EN MAIN</b><small>Diamant ×32 détecté dans ta main principale</small></div><i>→</i></button><p>Une main vide ne peut pas créer d&apos;annonce d&apos;objet.</p></section></main>; }

function PartyPage({ selected, setSelected, setScreen }: { selected: Listing; setSelected: (v: Listing) => void; setScreen: (v: Screen) => void }) {
  return <main className={styles.pageBody}><button className={styles.back} onClick={() => setScreen("sell")}>← CHOIX DU TYPE</button><section className={styles.partyPage}><div className={styles.partyTitle}><small>ÉQUIPE ACTUELLE</small><h1>Choisis le Pokémon à vendre</h1><p>Le sprite, les IV, la nature et le talent viennent directement de ton équipe.</p></div><div className={styles.partyGrid}>{party.map((item, index) => <button key={item.id} className={selected.id === item.id ? styles.partySelected : ""} onClick={() => setSelected(item)} style={cssVars(item.accent)}><span>0{index + 1}</span><Artwork item={item}/><div><b>{item.name}</b><small>N.{item.level} · IV {item.iv}%</small><i>{item.nature} · {item.ability}</i></div></button>)}</div><aside className={styles.partySummary}><Artwork item={selected} large/><h2>{selected.name}</h2><p>N.{selected.level} · {selected.type}<br/>IV {selected.iv}% · {selected.nature}</p><button onClick={() => setScreen("price")}>CHOISIR CE POKÉMON →</button></aside></section></main>;
}

function PricePage({ item, setScreen }: { item: Listing; setScreen: (v: Screen) => void }) {
  const [duration, setDuration] = useState(24); const [price, setPrice] = useState(item.kind === "pokemon" ? item.median : 4800);
  return <main className={styles.pageBody}><button className={styles.back} onClick={() => setScreen("sell")}>← ANNULER LA VENTE</button><section className={styles.pricePage} style={cssVars(item.accent)}><div className={styles.saleProduct}><small>TON {item.kind === "pokemon" ? "POKÉMON" : "OBJET"}</small><Artwork item={item} large/><h2>{item.name}</h2><p>{item.kind === "pokemon" ? `N.${item.level} · IV ${item.iv}% · ${item.nature}` : `Quantité ×${item.count}`}</p></div><article className={styles.priceEditor}><small>PRIX EXACT</small><label><input value={price} onChange={(e) => setPrice(Number(e.target.value))}/><span>◈</span></label><div className={styles.quickAmounts}>{[-10000, -1000, -100, 100, 1000, 10000].map((v) => <button key={v} onClick={() => setPrice(Math.max(1, price + v))}>{v > 0 ? "+" : "−"}{coins(Math.abs(v))}</button>)}</div><small>DURÉE DE L&apos;ANNONCE</small><div className={styles.durations}>{[12, 24, 48, 72].map((v) => <button key={v} className={duration === v ? styles.durationActive : ""} onClick={() => setDuration(v)}>{v} H</button>)}</div><div className={styles.net}><span>Commission GTS <b>5 %</b></span><span>Tu recevras <b>◈ {coins(Math.floor(price * .95))}</b></span></div></article><aside className={styles.recommend}><small>ANALYSE DU MARCHÉ</small><strong>◈ {coins(item.median)}</strong><p>Prix conseillé d&apos;après {item.sales} ventes. Fourchette observée : ◈ {coins(item.minimum)} — {coins(item.maximum)}.</p><button onClick={() => setPrice(item.median)}>APPLIQUER LE PRIX</button><button className={styles.publish} onClick={() => setScreen("mine")}>PUBLIER · {duration} H</button></aside></section></main>;
}

type SaleStatus = "ACTIVE" | "EXPIRÉE" | "VENDUE";
type OwnSale = { item: Listing; status: SaleStatus; note: string; published: string; views: number; watchers: number; net: number };

const mine: OwnSale[] = [
  { item: listings[0], status: "ACTIVE", note: "8 h 42 restantes", published: "Aujourd’hui · 09:18", views: 31, watchers: 4, net: 23132 },
  { item: listings[3], status: "ACTIVE", note: "20 h 08 restantes", published: "Aujourd’hui · 08:44", views: 12, watchers: 1, net: 4275 },
  { item: listings[4], status: "EXPIRÉE", note: "Objet à récupérer", published: "15 août · 18:03", views: 48, watchers: 3, net: 0 },
  { item: listings[2], status: "EXPIRÉE", note: "Place équipe/PC requise", published: "14 août · 21:46", views: 96, watchers: 11, net: 0 },
  { item: listings[1], status: "VENDUE", note: "Crédits versés hors ligne", published: "Aujourd’hui · 07:12", views: 74, watchers: 9, net: 23512 },
  { item: listings[5], status: "VENDUE", note: "Transaction terminée", published: "Hier · 22:18", views: 19, watchers: 2, net: 1710 },
];
function MinePage({ setScreen }: { setScreen: (v: Screen) => void }) {
  const [filter, setFilter] = useState<"TOUTES" | SaleStatus>("TOUTES");
  const visible = filter === "TOUTES" ? mine : mine.filter((sale) => sale.status === filter);
  const count = (status: SaleStatus) => mine.filter((sale) => sale.status === status).length;
  return <main className={styles.minePage}>
    <header><div><small>TABLEAU DU VENDEUR</small><h1>Mes annonces</h1><p>Pokémon et objets réunis au même endroit.</p></div><span><b>3 / 3</b> emplacements occupés<small>2 actives · 1 expirée non récupérée</small></span><button onClick={() => setScreen("sell")}>＋ NOUVELLE VENTE</button></header>
    <div className={styles.saleSummary}><div><small>EN VENTE</small><b>◈ 28 000</b></div><div><small>REVENUS CETTE SEMAINE</small><b>◈ 25 222</b></div><div><small>VUES CUMULÉES</small><b>280</b></div><div><small>TAUX DE VENTE</small><b>67 %</b></div></div>
    <div className={styles.saleTabs}>{(["TOUTES", "ACTIVE", "EXPIRÉE", "VENDUE"] as const).map((status) => <button key={status} className={filter === status ? styles.saleTabActive : ""} onClick={() => setFilter(status)}>{status === "TOUTES" ? "TOUTES" : status === "ACTIVE" ? "ACTIVES" : status === "EXPIRÉE" ? "À RÉCUPÉRER" : "VENDUES"} · {status === "TOUTES" ? mine.length : count(status)}</button>)}</div>
    <section>{visible.map(({ item, status, note, published, views, watchers, net }) => <article key={`${item.id}-${status}`} className={styles.saleCard} style={cssVars(item.accent)}>
      <div className={styles.saleVisual}><Artwork item={item}/><span>{item.kind === "pokemon" ? `N.${item.level}` : `×${item.count}`}</span></div>
      <div className={styles.saleIdentity}><small>{item.kind === "pokemon" ? `POKÉMON · IV ${item.iv}%` : "OBJET · LOT COMPLET"}</small><h2>{item.name}</h2><p>{published}</p></div>
      <div className={styles.salePrice}><small>PRIX AFFICHÉ</small><b>◈ {coins(item.price)}</b>{status === "VENDUE" && <em>NET ◈ {coins(net)}</em>}</div>
      <div className={styles.saleStats}><span><b>{views}</b> vues</span><span><b>{watchers}</b> suivis</span><span>{note}</span></div>
      <span className={status === "EXPIRÉE" ? styles.expired : status === "VENDUE" ? styles.sold : styles.live}>{status}</span>
      <button className={styles.saleAction}>{status === "EXPIRÉE" ? "RÉCUPÉRER" : status === "ACTIVE" ? "GÉRER L’ANNONCE" : "VOIR LE REÇU"}</button>
    </article>)}</section>
    <p className={styles.mineHint}>Les annonces expirées utilisent encore un emplacement. La récupération d&apos;un Pokémon demande une place libre dans l&apos;équipe ou le PC.</p>
  </main>;
}

function HistoryPage({ selected, setSelected }: { selected: Listing; setSelected: (v: Listing) => void }) {
  return <main className={styles.historyPage}><aside><small>ANALYSE DES PRIX</small><h1>Historique du marché</h1><label>⌕ <input placeholder="Rechercher une espèce ou un objet"/></label>{listings.slice(0, 5).map((item) => <button key={item.id} className={selected.id === item.id ? styles.historySelected : ""} onClick={() => setSelected(item)} style={cssVars(item.accent)}><Artwork item={item}/><span><b>{item.name}</b><small>{item.sales} ventes observées</small></span><i>{item.trend > 0 ? "+" : ""}{item.trend}%</i></button>)}</aside><section><div className={styles.historyHead}><div><small>TENDANCE DU MARCHÉ</small><h2>{selected.name}</h2><p>Indice de confiance élevé · données des ventes finalisées</p></div><Artwork item={selected}/></div><PriceGraph item={selected}/><div className={styles.marketStats}><Info label="PRIX MOYEN" value={`◈ ${coins(Math.round((selected.median + selected.maximum) / 2))}`}/><Info label="MÉDIANE" value={`◈ ${coins(selected.median)}`}/><Info label="MINIMUM" value={`◈ ${coins(selected.minimum)}`}/><Info label="MAXIMUM" value={`◈ ${coins(selected.maximum)}`}/></div><div className={styles.recentSales}><small>DERNIÈRES VENTES</small>{["Aujourd'hui · 14:32", "Hier · 22:18", "Hier · 17:04"].map((time, i) => <span key={time}>{time}<b>◈ {coins(selected.median + (i - 1) * 450)}</b></span>)}</div></section></main>;
}

export default function GtsMockups() {
  const [format, setFormat] = useState<Format>("terminal"); const [screen, setScreen] = useState<Screen>("browse"); const [selected, setSelected] = useState<Listing>(listings[0]);
  const current = useMemo(() => formats.find((item) => item.key === format)!, [format]); const formatClass = `format${current.key[0].toUpperCase()}${current.key.slice(1)}`;
  return <main className={styles.viewport}><div className={styles.world}/><PrototypeNav format={format} setFormat={setFormat} screen={screen} setScreen={setScreen}/><section className={`${styles.shell} ${styles[formatClass]}`} style={cssVars(selected.accent)}><Header screen={screen} setScreen={setScreen}/>{screen === "browse" && <Browse selected={selected} setSelected={setSelected} setScreen={setScreen} format={format}/>} {screen === "detail" && <DetailPage item={selected} setScreen={setScreen}/>} {screen === "purchase" && <PurchasePage item={selected} setScreen={setScreen}/>} {screen === "sell" && <SellPage setScreen={setScreen}/>} {screen === "party" && <PartyPage selected={selected.kind === "pokemon" ? selected : party[0]} setSelected={setSelected} setScreen={setScreen}/>} {screen === "price" && <PricePage item={selected} setScreen={setScreen}/>} {screen === "mine" && <MinePage setScreen={setScreen}/>} {screen === "history" && <HistoryPage selected={selected} setSelected={setSelected}/>}<Footer/></section></main>;
}
