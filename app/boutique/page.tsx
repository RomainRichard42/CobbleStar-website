"use client";

import { useState } from "react";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";

type StarPack = { stars: number; price: string; bonus?: number; label: string; tone: string; featured?: boolean };
const starPacks: StarPack[] = [
  { stars: 500, price: "4,99 €", label: "Découverte", tone: "cyan" },
  { stars: 1050, bonus: 50, price: "9,99 €", label: "Aventurier", tone: "pink", featured: true },
  { stars: 2200, bonus: 200, price: "19,99 €", label: "Explorateur", tone: "violet" },
  { stars: 6000, bonus: 1000, price: "49,99 €", label: "Constellation", tone: "yellow" },
];
const shopExamples = [
  { icon: "✦", name: "Titre personnalisé", price: "250 Stars", tone: "pink" },
  { icon: "◈", name: "Aura astrale", price: "450 Stars", tone: "cyan" },
  { icon: "⌁", name: "Animation de téléportation", price: "700 Stars", tone: "violet" },
  { icon: "◇", name: "Mobilier CobbleStar", price: "900 Stars", tone: "yellow" },
];

export default function BoutiquePage() {
  const [linkOpen, setLinkOpen] = useState(false);
  return <main>
    <PageHero eyebrow="BOUTIQUE COBBLESTAR" title="Recharge tes Stars" accent="et choisis en jeu." description="Connecte-toi à ton compte CobbleStar, recharge ton portefeuille puis dépense tes Stars directement sur le serveur." badge="APERÇU" />
    <section className="content-section stars-content">
      <div className="opening-note stars-notice"><span>PAIEMENT BIENTÔT DISPONIBLE</span><p>Les comptes et paiements réels restent fermés. Tu peux déjà parcourir le futur parcours complet.</p></div>
      <div className="shop-account-gate"><div><span className="gate-icon">♙</span><span><small>AVANT DE RECHARGER</small><b>Connecte-toi à ton compte CobbleStar</b><p>Les Stars appartiennent à ton compte du site, lui-même lié à ton UUID Minecraft.</p></span></div><a href="/compte">Créer mon compte <span>→</span></a></div>
      <div className="star-packs-section">
        <div className="shop-toolbar"><div><span className="kicker">RECHARGER LE PORTEFEUILLE</span><h2>Choisis ton pack.</h2></div><p>Lors de ta première recharge, le site demandera une vérification rapide avec la commande <code>/link</code> sur le serveur.</p></div>
        <div className="star-pack-grid">{starPacks.map((pack) => <article className={`star-pack tone-${pack.tone} ${pack.featured ? "featured" : ""}`} key={pack.stars}>{pack.featured && <span className="pack-popular">LE PLUS CHOISI</span>}<div className="star-symbol"><i>✦</i><span>✦</span></div><small>{pack.label}</small><strong>{pack.stars.toLocaleString("fr-FR")} <span>Stars</span></strong>{pack.bonus ? <em>dont {pack.bonus.toLocaleString("fr-FR")} Stars bonus</em> : <em>Pack essentiel</em>}<div className="pack-price"><b>{pack.price}</b><button type="button" onClick={() => setLinkOpen(true)}>Choisir</button></div></article>)}</div>
      </div>
      <div className="ingame-preview"><div className="ingame-preview-copy"><span className="kicker">ENSUITE, DIRECTEMENT EN JEU</span><h2>Tes Stars.<br /><em>Ton style.</em></h2><p>Le futur mod affichera ton solde et le catalogue depuis Minecraft. Chaque achat sera confirmé avant le débit.</p><div className="safe-list"><span>✓ Aucun pay-to-win</span><span>✓ Achats cosmétiques</span><span>✓ Historique complet</span></div></div><div className="ingame-shop-window"><div className="ingame-window-top"><span>BOUTIQUE COBBLESTAR</span><b>1 050 ✦</b></div><div className="ingame-product-list">{shopExamples.map((item) => <div className={`ingame-product tone-${item.tone}`} key={item.name}><i>{item.icon}</i><span><b>{item.name}</b><small>Cosmétique permanent</small></span><strong>{item.price}</strong></div>)}</div><div className="ingame-window-foot"><span>Solde synchronisé avec ton UUID</span><i>APERÇU DU FUTUR MOD</i></div></div></div>
      <div className="flow-card stars-flow"><span className="kicker">COMMENT ÇA FONCTIONNERA</span><h2>Du compte jusqu’au serveur.</h2><div className="flow-steps"><div><b>1</b><span>Compte CobbleStar créé</span></div><i>→</i><div><b>2</b><span>Commande /link en jeu</span></div><i>→</i><div><b>3</b><span>Stars créditées</span></div><i>→</i><div><b>4</b><span>Dépense dans le mod</span></div></div></div>
    </section>
    <MinecraftLinkGate open={linkOpen} onClose={() => setLinkOpen(false)} context="achat" />
    <SiteFooter />
  </main>;
}
