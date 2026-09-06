"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SHOP_FAQ } from "../lib/faq";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import FaqSection from "../components/FaqSection";
import FaqStructuredData from "../components/FaqStructuredData";

type ShopAccount = {
  minecraft: { username: string | null; uuid: string | null; linked: boolean };
};

type StarPack = {
  stars: number;
  price: string;
  bonus?: string;
  popular?: boolean;
  tone: string;
};

const starPacks: StarPack[] = [
  { stars: 500, price: "4,99 €", tone: "cyan" },
  { stars: 1100, price: "9,99 €", bonus: "+ 10 % de Stars", tone: "pink" },
  { stars: 2400, price: "19,99 €", bonus: "+ 20 % de Stars", popular: true, tone: "yellow" },
  { stars: 6500, price: "49,99 €", bonus: "+ 30 % de Stars", tone: "violet" },
];

const catalog = [
  { code: "01", name: "Clés Nova, Pulsar et Quasar", description: "Ouvre les caisses du serveur avec des chances publiées, un historique personnel et des garanties visibles.", price: "350 à 950 Stars", tone: "pink" },
  { code: "02", name: "Effets et accessoires", description: "Retrouve tes particules, titres et apparences dans le Cosmédex, puis active-les ou désactive-les librement.", price: "Dès 300 Stars", tone: "cyan" },
  { code: "03", name: "Compagnons", description: "Choisis le compagnon qui te suit, donne-lui un nom et change-le depuis ta collection sans nouvel achat.", price: "Catalogue en jeu", tone: "yellow" },
  { code: "04", name: "Incarnations", description: "Adopte temporairement l’apparence d’un Pokémon compatible tout en conservant le contrôle de ton aventure.", price: "Catalogue en jeu", tone: "violet" },
  { code: "05", name: "Album et boosters", description: "Complète une collection de 24 cartes illustrées avec des raretés clairement annoncées.", price: "Selon le booster", tone: "cyan" },
  { code: "06", name: "Pass Dresseur", description: "Déverrouille la seconde voie des 100 paliers saisonniers, y compris ceux déjà atteints.", price: "Paiement unique", tone: "pink" },
];

export default function ShopPage() {
  const [account, setAccount] = useState<ShopAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<StarPack | null>(null);
  const [testPurchasesEnabled, setTestPurchasesEnabled] = useState(false);
  const [rechargeBusy, setRechargeBusy] = useState(false);
  const [rechargeComplete, setRechargeComplete] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/me", { credentials: "include" }),
      fetch("/api/wallet", { credentials: "include" }),
    ]).then(async ([profileResponse, walletResponse]) => {
      if (!profileResponse.ok) throw new Error("Signed out");
      const profile = await profileResponse.json() as { user: ShopAccount };
      const wallet = walletResponse.ok ? await walletResponse.json() as { balance: number } : { balance: 0 };
      if (active) {
        setAccount(profile.user);
        setBalance(wallet.balance);
      }
    }).catch(() => {
      if (active) {
        setAccount(null);
        setBalance(0);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    void fetch("/api/shop/status")
      .then(async (response) => {
        if (!response.ok) throw new Error("Shop unavailable");
        return response.json() as Promise<{ testPurchasesEnabled: boolean }>;
      })
      .then((data) => setTestPurchasesEnabled(data.testPurchasesEnabled))
      .catch(() => setTestPurchasesEnabled(false));
  }, []);

  useEffect(() => {
    if (!account) return;
    const refreshWallet = () => {
      void fetch("/api/wallet", { credentials: "include" })
        .then(async (response) => {
          if (!response.ok) throw new Error("Wallet unavailable");
          return response.json() as Promise<{ balance: number }>;
        })
        .then((wallet) => setBalance(wallet.balance))
        .catch(() => undefined);
    };
    const interval = window.setInterval(refreshWallet, 5000);
    window.addEventListener("focus", refreshWallet);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWallet);
    };
  }, [account]);

  useEffect(() => {
    if (!selectedPack) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedPack(null); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedPack]);

  const username = account?.minecraft.username || null;
  const linked = account?.minecraft.linked ?? false;

  async function simulateRecharge() {
    if (!selectedPack || rechargeBusy || rechargeComplete) return;
    setRechargeBusy(true);
    setRechargeMessage("");
    try {
      const response = await fetch("/api/shop/test-recharge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starsAmount: selectedPack.stars }),
      });
      const data = await response.json() as { balance?: number; starsAdded?: number; error?: string };
      if (!response.ok) {
        const messages: Record<string, string> = {
          TEST_PURCHASE_ALREADY_USED: "Cette recharge a déjà été traitée pour ton compte.",
          TEST_PURCHASES_DISABLED: "La recharge n’a pas pu être validée.",
          MINECRAFT_LINK_REQUIRED: "Lie d’abord ton compte Minecraft.",
        };
        throw new Error(messages[data.error || ""] || "La recharge a été refusée.");
      }
      setBalance(data.balance ?? balance + selectedPack.stars);
      setRechargeComplete(true);
      setRechargeMessage(`Recharge acceptée : ${data.starsAdded ?? selectedPack.stars} Stars ont été créditées.`);
      window.dispatchEvent(new Event("cobblestar:wallet-changed"));
    } catch (error) {
      setRechargeMessage(error instanceof Error ? error.message : "La recharge n’a pas pu aboutir.");
    } finally {
      setRechargeBusy(false);
    }
  }

  return <main className="shop-quick-page">
    <SiteHeader />
    <section className="shop-quick-shell" id="contenu" aria-labelledby="shop-title">
      <header className="shop-quick-header">
        <div><span className="kicker">BOUTIQUE COBBLESTAR</span><h1 id="shop-title">Recharge tes <em>Stars.</em></h1><p>Choisis un pack. Les Stars rejoindront automatiquement ton compte Minecraft lié.</p></div>
        <div className="shop-quick-state"><i /><span><b>Paiement unique</b><small>Livraison automatique</small></span></div>
      </header>

      <div className="shop-quick-account-row">
        <section className="shop-v2-account" aria-label="État de ton compte boutique">
        <div className="shop-v2-player">
          <span className="shop-v2-avatar">{username ? <img src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/96`} alt={`Tête Minecraft de ${username}`} /> : "?"}</span>
          <div><small>COMPTE DE LIVRAISON</small><h2>{loading ? "Vérification…" : username || "Aucun joueur connecté"}</h2><p>{loading ? "Nous récupérons ton portefeuille." : linked ? "Compte Minecraft vérifié." : account ? "Liaison Minecraft requise avec /link." : "Connecte-toi avant de finaliser un achat."}</p></div>
        </div>
        <div className="shop-v2-wallet"><small>MON SOLDE</small><strong>{balance.toLocaleString("fr-FR")} <span>Stars</span></strong><em>{linked ? "Compte Minecraft vérifié" : "Liaison requise avant achat"}</em></div>
        {!loading && !account && <Link className="shop-v2-account-action" href="/compte/">Se connecter <span>→</span></Link>}
        {!loading && account && !linked && <button className="shop-v2-account-action" type="button" onClick={() => setLinkOpen(true)}>Lier mon compte Minecraft <span>→</span></button>}
        {!loading && linked && <span className="shop-v2-ready">✓ Portefeuille prêt à recevoir tes Stars</span>}
        </section>
        <img src="/cobblestar-logo.png" alt="" aria-hidden="true" />
      </div>

      <section className="shop-quick-purchase" id="stars" aria-labelledby="shop-packs-title">
      <div className="shop-v2-heading">
        <div><span className="kicker">1 · CHOISIS UN MONTANT</span><h2 id="shop-packs-title">Quel pack te convient ?</h2></div>
        <p>Montant payé une seule fois. Les bonus sont déjà inclus dans le total affiché.</p>
      </div>

      <div className="shop-v2-packs">
        {starPacks.map((pack) => <article className={`shop-v2-pack tone-${pack.tone}${pack.popular ? " is-popular" : ""}`} key={pack.stars}>
          {pack.popular && <span className="shop-v2-popular">LE PLUS CHOISI</span>}
          <div className="shop-v2-star" aria-hidden="true">✦</div>
          <small>STARS CRÉDITÉES</small>
          <strong>{pack.stars.toLocaleString("fr-FR")}</strong>
          <span className="shop-v2-unit">Stars créditées</span>
          <div className="shop-v2-price"><b>{pack.price}</b><small>Paiement unique</small></div>
          <p>{pack.bonus || "Le format idéal pour découvrir la boutique."}</p>
          <button type="button" onClick={() => { setSelectedPack(pack); setRechargeMessage(""); }}>Choisir {pack.price} <span>→</span></button>
        </article>)}
      </div>
      </section>

      <section className="shop-quick-catalog" id="catalogue" aria-labelledby="catalog-title">
        <div className="shop-v2-catalog-heading"><span className="kicker">2 · UTILISE-LES EN JEU</span><h2 id="catalog-title">Ce que tes Stars débloquent.</h2><p>Uniquement des collections et services cosmétiques. Aucun avantage compétitif.</p></div>
        <div className="shop-v2-items">{catalog.map((item) => <article className={`shop-v2-item tone-${item.tone}`} key={item.name}><span aria-hidden="true">{item.code}</span><small>CATALOGUE COBBLESTAR</small><h3>{item.name}</h3><p>{item.description}</p><b>{item.price}</b></article>)}</div>
      </section>

      <aside className="shop-quick-trust"><span>PAIEMENT UNIQUE</span><span>LIVRAISON AUTOMATIQUE</span><span>AUCUN PAY-TO-WIN</span><p>Les Stars sont une monnaie virtuelle sans valeur monétaire réelle et ne peuvent pas être reconverties en argent.</p></aside>
    </section>

    {selectedPack && <div className="shop-v2-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPack(null); }}>
      <section className="shop-v2-dialog" role="dialog" aria-modal="true" aria-labelledby="shop-dialog-title">
        <button className="shop-v2-dialog-close" type="button" onClick={() => setSelectedPack(null)} aria-label="Fermer le récapitulatif" autoFocus>×</button>
        <span className="kicker">RÉCAPITULATIF DU PACK</span>
        <div className="shop-v2-dialog-star" aria-hidden="true">✦</div>
        <h2 id="shop-dialog-title">{selectedPack.stars.toLocaleString("fr-FR")} <em>Stars</em></h2>
        <div className="shop-v2-dialog-price"><span>Montant unique</span><b>{selectedPack.price}</b></div>
        {selectedPack.bonus && <p className="shop-v2-dialog-bonus">✓ {selectedPack.bonus} incluses dans le total</p>}
        <div className="shop-v2-dialog-account"><small>DESTINATION</small><b>{username || "Aucun compte connecté"}</b><span>{linked ? "✓ Compte Minecraft lié" : "Compte à préparer avant l’achat"}</span></div>
        {!account ? <Link className="shop-v2-dialog-action" href="/compte/">Se connecter pour continuer <span>→</span></Link> : !linked ? <button className="shop-v2-dialog-action" type="button" onClick={() => { setSelectedPack(null); setLinkOpen(true); }}>Lier mon compte Minecraft <span>→</span></button> : testPurchasesEnabled ? <button className={`shop-v2-dialog-action${rechargeComplete ? " is-complete" : ""}`} type="button" onClick={simulateRecharge} disabled={rechargeBusy || rechargeComplete}>{rechargeBusy ? "Validation de la recharge…" : rechargeComplete ? "Stars créditées ✓" : "Valider la recharge"}<span>{rechargeComplete ? "" : "→"}</span></button> : <button className="shop-v2-dialog-action is-disabled" type="button" disabled>Finaliser la recharge</button>}
        {rechargeMessage && <p className="shop-v2-dialog-message" role="status">{rechargeMessage}</p>}
        <p className="shop-v2-dialog-note">Vérifie le montant et le compte Minecraft de destination avant de continuer.</p>
      </section>
    </div>}

    <MinecraftLinkGate open={linkOpen} onClose={() => setLinkOpen(false)} context="achat" />
    <FaqSection title="Questions sur la boutique" id="faq-boutique" items={SHOP_FAQ} />
    <FaqStructuredData faqItems={SHOP_FAQ} pageUrl="/boutique/" />
    <SiteFooter />
  </main>;
}
