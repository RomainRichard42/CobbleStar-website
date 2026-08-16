"use client";

import { useEffect, useMemo, useState } from "react";
import catalogFile from "../../api/shop.catalog.json";
import styles from "./boutique-jeu.module.css";

type Category = "all" | "keys" | "cosmetics" | "collection" | "companions" | "boosters" | "ranks";
type Product = {
  id: string;
  name: string;
  description: string;
  starsPrice: number;
  itemId: string;
  itemCount: number;
  category: string;
  featured: boolean;
  isNew: boolean;
  testOnly?: boolean;
  deliveryMode: string;
  visual: { accent: string; badge: string; previewTexture?: string };
};

type ShopState = { balance: number; products: Product[] };

const fallbackShop: ShopState = {
  balance: 1597,
  products: catalogFile.products as Product[],
};

const categories: Array<{ id: Category; label: string; glyph: string }> = [
  { id: "all", label: "Tout", glyph: "✦" },
  { id: "keys", label: "Clés", glyph: "⌑" },
  { id: "cosmetics", label: "Cosmétiques", glyph: "◇" },
  { id: "collection", label: "Collection", glyph: "▣" },
  { id: "companions", label: "Compagnons", glyph: "♢" },
  { id: "boosters", label: "Boosters", glyph: "⬡" },
  { id: "ranks", label: "Grades", glyph: "♛" },
];

function ProductArtwork({ product, large = false }: { product: Product; large?: boolean }) {
  const className = `${styles.artwork} ${large ? styles.artworkLarge : ""}`;
  if (product.id.includes("key") || product.id.includes("nova") || product.id.includes("pulsar") || product.id.includes("quasar")) {
    return <div className={className} style={{ "--accent": product.visual.accent } as React.CSSProperties} aria-hidden="true">
      <svg className={styles.keyArt} viewBox="0 0 220 220">
        <defs><linearGradient id={`metal-${product.id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".45" stopColor={product.visual.accent}/><stop offset="1" stopColor="#292047"/></linearGradient></defs>
        <g transform="rotate(-42 110 110)">
          <path d="M92 31h36l23 23v36l-23 23h-15v70h-17v18H72v-41h18v-47H77L54 90V54z" fill={`url(#metal-${product.id})`} stroke="#fff" strokeWidth="5"/>
          <path d="m109 49 27 23-27 24-27-24z" fill="#120d25" stroke="#fff" strokeWidth="3"/>
          <path d="m109 56 18 16-18 16-18-16z" fill={product.visual.accent}/>
          <path d="m109 59 4 10 10 3-10 4-4 9-4-9-10-4 10-3z" fill="#fff"/>
        </g>
      </svg>
    </div>;
  }
  if (product.id === "battlepass_premium") {
    return <div className={`${className} ${styles.passArt}`} aria-hidden="true"><span>✦</span><b>PASS</b><i>01</i></div>;
  }
  if (product.id === "club_custom_logo") {
    return <div className={`${className} ${styles.emblemArt}`} aria-hidden="true"><span>◆</span><b>CLUB</b><i>sur mesure</i></div>;
  }
  if (product.id.includes("chat_tag")) {
    return <div className={`${className} ${styles.tagArt}`} aria-hidden="true"><span>[✦]</span><b>Votre tag</b><i>dans le chat</i></div>;
  }
  return <div className={className} aria-hidden="true"><span className={styles.genericStar}>✦</span></div>;
}

function formatStars(value: number) {
  return value.toLocaleString("fr-FR");
}

function parseMinecraftShop(encoded: string): ShopState | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    const content = new TextDecoder().decode(bytes);
    let balance = 0;
    const products: Product[] = [];
    for (const line of content.split("\n")) {
      const values = line.split("|");
      if (values[0] === "balance") balance = Number.parseInt(values[1] || "0", 10) || 0;
      if (values[0] !== "product" || values.length < 10) continue;
      const id = values[1];
      products.push({
        id,
        name: values[2],
        description: values[3],
        starsPrice: Number.parseInt(values[4] || "0", 10) || 0,
        itemId: values[5] || "minecraft:nether_star",
        itemCount: Number.parseInt(values[6] || "1", 10) || 1,
        category: values[7] || "collection",
        featured: values[8] === "true",
        isNew: values[9] === "true",
        deliveryMode: id === "battlepass_premium" ? "entitlement" : "item",
        visual: {
          accent: values[10] || "#9B8CFF",
          badge: values[11] || "",
          previewTexture: values[12] || "",
        },
      });
    }
    return products.length > 0 ? { balance, products } : null;
  } catch {
    return null;
  }
}

function sendMinecraftAction(action: string) {
  console.info(`COBBLESTAR_GAME|${action}`);
}

function initialShopState(): { embedded: boolean; shop: ShopState; notice: string } {
  if (typeof window === "undefined") return { embedded: false, shop: fallbackShop, notice: "" };
  const query = new URLSearchParams(window.location.search);
  if (query.get("ingame") !== "1") return { embedded: false, shop: fallbackShop, notice: "" };
  const marker = "#shop=";
  const payload = window.location.hash.startsWith(marker) ? window.location.hash.slice(marker.length) : "";
  const parsed = payload ? parseMinecraftShop(payload) : null;
  return parsed
    ? { embedded: true, shop: parsed, notice: "" }
    : { embedded: true, shop: fallbackShop, notice: "Le catalogue du serveur n’a pas pu être chargé." };
}

export default function InGameShopPrototype() {
  const [initial] = useState(initialShopState);
  const { shop, embedded } = initial;
  const products = shop.products.filter((product) => !product.testOnly);
  const [tab, setTab] = useState<"featured" | "catalog" | "new">("featured");
  const [category, setCategory] = useState<Category>("all");
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [balance, setBalance] = useState(shop.balance);
  const [notice, setNotice] = useState(initial.notice);
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (embedded) return;
    void fetch("/api/wallet", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("wallet unavailable");
        return response.json() as Promise<{ balance: number }>;
      })
      .then((wallet) => setBalance(wallet.balance))
      .catch(() => undefined);
  }, [embedded]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    if (tab === "featured" && !product.featured) return false;
    if (tab === "new" && !product.isNew) return false;
    if (category !== "all" && product.category !== category) return false;
    const needle = search.trim().toLocaleLowerCase("fr");
    return !needle || `${product.name} ${product.description} ${product.visual.badge}`.toLocaleLowerCase("fr").includes(needle);
  }), [category, products, search, tab]);

  const selected = products.find((product) => product.id === selectedId) ?? products[0];
  const total = selected ? selected.starsPrice * quantity : 0;
  const canAfford = balance >= total;

  function selectProduct(product: Product) {
    setSelectedId(product.id);
    setQuantity(1);
    setNotice("");
  }

  function changeTab(next: "featured" | "catalog" | "new") {
    setTab(next);
    setNotice("");
  }

  function previewPurchase() {
    if (!selected) return;
    if (!canAfford) {
      if (embedded) sendMinecraftAction("RECHARGE");
      setNotice(`Il te manque ${formatStars(total - balance)} Stars pour cette offre.`);
      return;
    }
    if (embedded) {
      sendMinecraftAction(`BUY|${selected.id}|${quantity}`);
      setNotice(`Validation sécurisée de ${selected.name} ×${quantity} en cours…`);
      return;
    }
    setCartCount((count) => count + quantity);
    setNotice(`${selected.name} ×${quantity} ajouté à la commande de démonstration.`);
  }

  if (!selected) return null;

  return <main className={styles.viewport}>
    <div className={styles.ambientOne} />
    <div className={styles.ambientTwo} />
    <section className={styles.terminal} aria-label="Prototype de la boutique en jeu CobbleStar">
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>✦</span>
          <div><small>STARWATCH // SERVICE 04</small><strong>COBBLESTAR</strong><span>BOUTIQUE EN JEU</span></div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.wallet} type="button" onClick={() => embedded ? sendMinecraftAction("RECHARGE") : setNotice("Recharge les Stars depuis le site CobbleStar, puis dépense-les ici.")}><span>✦</span><div><small>MON SOLDE</small><b>{formatStars(balance)} STARS</b></div><i>+</i></button>
          <button className={styles.profile} type="button" aria-label="Profil de démonstration"><span>LH</span><i /></button>
          <button className={styles.close} type="button" aria-label="Fermer la boutique" onClick={() => embedded ? sendMinecraftAction("CLOSE") : window.history.back()}>×</button>
        </div>
      </header>

      <div className={styles.navRow}>
        <nav className={styles.tabs} aria-label="Sections de la boutique">
          <button className={tab === "featured" ? styles.activeTab : ""} onClick={() => changeTab("featured")} type="button"><span>✦</span> À LA UNE</button>
          <button className={tab === "catalog" ? styles.activeTab : ""} onClick={() => changeTab("catalog")} type="button">CATALOGUE</button>
          <button className={tab === "new" ? styles.activeTab : ""} onClick={() => changeTab("new")} type="button"><i /> NOUVEAUTÉS</button>
        </nav>
        <label className={styles.search}><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une offre" /></label>
        <button className={styles.cart} type="button"><span>▱</span> PANIER <b>{cartCount}</b></button>
      </div>

      <div className={styles.categoryRail}>
        {categories.map((item) => <button key={item.id} className={category === item.id ? styles.activeCategory : ""} onClick={() => setCategory(item.id)} type="button"><span>{item.glyph}</span>{item.label}</button>)}
      </div>

      <div className={styles.workspace}>
        <section className={styles.catalogue}>
          {tab === "featured" && category === "all" && !search && <article className={styles.heroCard}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>COLLECTION DE SAISON</span>
              <h1>FAIS BRILLER<br /><em>TON AVENTURE.</em></h1>
              <p>Le Pass Dresseur Premium déverrouille une seconde voie de récompenses et récupère automatiquement les paliers déjà atteints.</p>
              <div><button type="button" onClick={() => selectProduct(products.find((product) => product.id === "battlepass_premium") ?? products[0])}>DÉCOUVRIR LE PASS <span>→</span></button><small>SAISON 01 · 26 JOURS RESTANTS</small></div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.orbit}><span /><span /><span /><span /></div>
              <div className={styles.passBadge}><b>01</b><span>PREMIUM</span></div>
              <div className={styles.companion}><i>★</i><span>✦</span><b>CS</b></div>
            </div>
          </article>}

          <div className={styles.sectionTitle}><div><span>✦</span><h2>{tab === "featured" ? "SÉLECTION DU MOMENT" : tab === "new" ? "NOUVEAUTÉS" : "TOUT LE CATALOGUE"}</h2></div><small>{visibleProducts.length} OFFRE{visibleProducts.length > 1 ? "S" : ""}</small></div>

          {visibleProducts.length > 0 ? <div className={styles.productGrid}>
            {visibleProducts.map((product) => <button key={product.id} type="button" onClick={() => selectProduct(product)} className={`${styles.productCard} ${selected.id === product.id ? styles.selectedCard : ""}`} style={{ "--accent": product.visual.accent } as React.CSSProperties}>
              <div className={styles.cardVisual}>
                {product.isNew && <span className={styles.newBadge}>NOUVEAU</span>}
                <ProductArtwork product={product} />
                <span className={styles.viewHint}>APERÇU <b>↗</b></span>
              </div>
              <div className={styles.cardInfo}><small>{product.visual.badge || product.category}</small><strong>{product.name}</strong><span><b>✦ {formatStars(product.starsPrice)}</b><i>{product.itemCount > 1 ? `PACK ×${product.itemCount}` : "UNITÉ"}</i></span></div>
            </button>)}
          </div> : <div className={styles.empty}><span>◇</span><b>Aucune offre dans cette sélection</b><p>Essaie une autre catégorie ou efface ta recherche.</p></div>}
        </section>

        <aside className={styles.details} style={{ "--accent": selected.visual.accent } as React.CSSProperties}>
          <div className={styles.detailTop}><span>OFFRE SÉLECTIONNÉE</span><b>{selected.visual.badge || "COBBLESTAR"}</b></div>
          <div className={styles.detailArtwork}><ProductArtwork product={selected} large /><span className={styles.scanLine} /></div>
          <div className={styles.detailCopy}>
            <small>{selected.category.toUpperCase()}</small>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            <ul><li><span>✦</span> Livraison immédiate en jeu</li><li><span>◇</span> Compte Minecraft sécurisé</li>{selected.deliveryMode === "entitlement" && <li><span>✓</span> Déblocage permanent</li>}</ul>
          </div>
          <div className={styles.orderBox}>
            <div className={styles.quantity}><span>QUANTITÉ</span><div><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><b>{quantity}</b><button type="button" onClick={() => setQuantity((value) => Math.min(8, value + 1))}>+</button></div></div>
            <div className={styles.total}><span>TOTAL</span><b>✦ {formatStars(total)}</b></div>
          </div>
          <button className={`${styles.buyButton} ${!canAfford ? styles.missing : ""}`} type="button" onClick={previewPurchase}>
            <span>{canAfford ? "ACHETER MAINTENANT" : `IL MANQUE ${formatStars(total - balance)} STARS`}</span><b>{canAfford ? `✦ ${formatStars(total)}` : "+ RECHARGER"}</b>
          </button>
          <p className={`${styles.notice} ${notice ? styles.noticeVisible : ""}`}>{notice || "Sélectionne une offre pour consulter ses détails."}</p>
        </aside>
      </div>

      <footer className={styles.footer}>
        <span><kbd>ESC</kbd> FERMER</span><span><kbd>◀ ▶</kbd> NAVIGUER</span><span><kbd>ENTRÉE</kbd> SÉLECTIONNER</span>
        <b>TERMINAL COBBLESTAR <i /> CONNEXION SÉCURISÉE</b>
      </footer>
    </section>
  </main>;
}
