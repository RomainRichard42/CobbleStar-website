"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";

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
  { icon: "✦", name: "Effets cosmétiques", description: "Des particules et entrées visuelles qui personnalisent ton arrivée.", price: "Dès 300 Stars", tone: "pink" },
  { icon: "◇", name: "Titres de dresseur", description: "Affiche un titre distinctif auprès de la communauté CobbleStar.", price: "Dès 450 Stars", tone: "cyan" },
  { icon: "◉", name: "Apparences exclusives", description: "Des variantes purement visuelles pensées autour de l’univers du serveur.", price: "Dès 800 Stars", tone: "yellow" },
];

export default function ShopPage() {
  const [account, setAccount] = useState<ShopAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<StarPack | null>(null);

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
    if (!selectedPack) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedPack(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPack]);

  const username = account?.minecraft.username || null;
  const linked = account?.minecraft.linked ?? false;

  return <main>
    <PageHero eyebrow="BOUTIQUE COBBLESTAR" title="Tes Stars." accent="Ton style en jeu." description="Recharge ton portefeuille puis choisis directement en jeu les cosmétiques qui te ressemblent. Les Stars n’offrent aucun avantage compétitif." badge="APERÇU BÊTA" />

    <section className="content-section shop-v2" aria-labelledby="shop-packs-title">
      <div className="shop-v2-launch" role="status">
        <span>OUVERTURE PROCHAINE</span>
        <div><b>Tu peux explorer la boutique, aucun paiement n’est encore débité.</b><p>Les tarifs sont affichés en aperçu pendant le raccordement du paiement sécurisé et de la livraison automatique en jeu.</p></div>
      </div>

      <section className="shop-v2-account" aria-label="État de ton compte boutique">
        <div className="shop-v2-player">
          <span className="shop-v2-avatar">{username ? <img src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/96`} alt={`Tête Minecraft de ${username}`} /> : "?"}</span>
          <div><small>TON ESPACE BOUTIQUE</small><h2>{loading ? "Vérification…" : username || "Connecte ton joueur"}</h2><p>{loading ? "Nous récupérons ton portefeuille." : linked ? "Ton compte est prêt à recevoir automatiquement ses Stars." : account ? "Confirme ton compte Minecraft une seule fois avec la commande /link." : "Un compte CobbleStar est nécessaire pour sécuriser chaque recharge."}</p></div>
        </div>
        <div className="shop-v2-wallet"><small>MON SOLDE</small><strong>{balance.toLocaleString("fr-FR")} <span>Stars</span></strong><em>{linked ? "Compte Minecraft vérifié" : "Liaison requise avant achat"}</em></div>
        {!loading && !account && <Link className="shop-v2-account-action" href="/compte/">Créer ou ouvrir mon compte <span>→</span></Link>}
        {!loading && account && !linked && <button className="shop-v2-account-action" type="button" onClick={() => setLinkOpen(true)}>Lier mon compte Minecraft <span>→</span></button>}
        {!loading && linked && <span className="shop-v2-ready">✓ Portefeuille prêt pour les futures recharges</span>}
      </section>

      <div className="shop-v2-heading">
        <div><span className="kicker">RECHARGE DE STARS</span><h2 id="shop-packs-title">Choisis simplement<br /><em>le bon pack.</em></h2></div>
        <p>Le nombre de Stars reçu et le prix en euros restent visibles ensemble. Les bonus indiqués sont inclus dans le total affiché, sans abonnement ni renouvellement automatique.</p>
      </div>

      <div className="shop-v2-packs">
        {starPacks.map((pack) => <article className={`shop-v2-pack tone-${pack.tone}${pack.popular ? " is-popular" : ""}`} key={pack.stars}>
          {pack.popular && <span className="shop-v2-popular">LE PLUS CHOISI</span>}
          <div className="shop-v2-star" aria-hidden="true">✦</div>
          <small>PACK DE STARS</small>
          <strong>{pack.stars.toLocaleString("fr-FR")}</strong>
          <span className="shop-v2-unit">Stars créditées</span>
          <div className="shop-v2-price"><b>{pack.price}</b><small>Paiement unique</small></div>
          <p>{pack.bonus || "Le format idéal pour découvrir la boutique."}</p>
          <button type="button" onClick={() => setSelectedPack(pack)}>Voir ce pack <span>→</span></button>
        </article>)}
      </div>

      <section className="shop-v2-catalog" aria-labelledby="catalog-title">
        <div className="shop-v2-catalog-heading"><span className="kicker">À DÉPENSER EN JEU</span><h2 id="catalog-title">Du style.<br /><em>Pas du pay-to-win.</em></h2><p>La boutique en jeu sera dédiée à la personnalisation. Les exemples ci-dessous présentent la direction prévue ; le catalogue définitif pourra évoluer avant l’ouverture.</p></div>
        <div className="shop-v2-items">{catalog.map((item) => <article className={`shop-v2-item tone-${item.tone}`} key={item.name}><span aria-hidden="true">{item.icon}</span><small>APERÇU DU CATALOGUE</small><h3>{item.name}</h3><p>{item.description}</p><b>{item.price}</b></article>)}</div>
      </section>

      <section className="shop-v2-flow" aria-labelledby="shop-flow-title">
        <div><span className="kicker">APRÈS TON ACHAT</span><h2 id="shop-flow-title">Trois étapes.<br /><em>Rien à réclamer.</em></h2></div>
        <ol><li><span>1</span><div><b>Choisis tes Stars</b><p>Le prix et le total sont confirmés avant tout paiement.</p></div></li><li><span>2</span><div><b>Reçois-les automatiquement</b><p>La recharge rejoint le compte Minecraft lié à ton profil.</p></div></li><li><span>3</span><div><b>Dépense-les en jeu</b><p>Ouvre la boutique du serveur et choisis tes cosmétiques.</p></div></li></ol>
      </section>

      <aside className="shop-v2-trust"><span>PAIEMENT UNIQUE</span><span>AUCUN ABONNEMENT</span><span>COSMÉTIQUES UNIQUEMENT</span><p>Les Stars sont une monnaie virtuelle sans valeur monétaire réelle et ne peuvent pas être reconverties en argent. Les conditions complètes et les droits légaux applicables seront présentés avant l’ouverture des paiements.</p></aside>
    </section>

    {selectedPack && <div className="shop-v2-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPack(null); }}>
      <section className="shop-v2-dialog" role="dialog" aria-modal="true" aria-labelledby="shop-dialog-title">
        <button className="shop-v2-dialog-close" type="button" onClick={() => setSelectedPack(null)} aria-label="Fermer">×</button>
        <span className="kicker">RÉCAPITULATIF DU PACK</span>
        <div className="shop-v2-dialog-star" aria-hidden="true">✦</div>
        <h2 id="shop-dialog-title">{selectedPack.stars.toLocaleString("fr-FR")} <em>Stars</em></h2>
        <div className="shop-v2-dialog-price"><span>Montant unique</span><b>{selectedPack.price}</b></div>
        {selectedPack.bonus && <p className="shop-v2-dialog-bonus">✓ {selectedPack.bonus} incluses dans le total</p>}
        <div className="shop-v2-dialog-account"><small>DESTINATION</small><b>{username || "Aucun compte connecté"}</b><span>{linked ? "✓ Compte Minecraft lié" : "Compte à préparer avant l’achat"}</span></div>
        {!account ? <Link className="shop-v2-dialog-action" href="/compte/">Se connecter pour continuer <span>→</span></Link> : !linked ? <button className="shop-v2-dialog-action" type="button" onClick={() => { setSelectedPack(null); setLinkOpen(true); }}>Lier mon compte Minecraft <span>→</span></button> : <button className="shop-v2-dialog-action is-disabled" type="button" disabled>Paiement bientôt disponible</button>}
        <p className="shop-v2-dialog-note">Aucun débit ne peut être effectué pendant cette phase bêta.</p>
      </section>
    </div>}

    <MinecraftLinkGate open={linkOpen} onClose={() => setLinkOpen(false)} context="achat" />
    <SiteFooter />
  </main>;
}
