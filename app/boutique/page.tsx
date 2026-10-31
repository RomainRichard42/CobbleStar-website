"use client";
import StarsArt from "../components/StarsArt";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SHOP_FAQ } from "../lib/faq";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import FaqStructuredData from "../components/FaqStructuredData";
import shopCatalog from "../../api/shop.catalog.json";
import starsCatalog from "../../api/stars.catalog.json";

type ShopAccount = {
  minecraft: { username: string | null; uuid: string | null; linked: boolean };
};

type StarPack = {
  id: string;
  stars: number;
  price: string;
  bonus?: string;
};

const starPacks: StarPack[] = starsCatalog.map(pack => ({ ...pack,
  price: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(pack.amountCents / 100) }));
type PaymentResult = { status: string; stars: number; test: boolean };

const ranks = shopCatalog.products.filter(item => item.category === "ranks" && !item.testOnly);
const catalog = shopCatalog.products.filter(item => item.category !== "ranks" && !item.testOnly);
const categories = [{id:"all",label:"Tout"},{id:"cosmetics",label:"Cosmétiques"},{id:"companions",label:"Compagnons"},{id:"collection",label:"Collection"}];
const shopTabs = [{ id: "grades", label: "Grades" }, { id: "jetons", label: "Jetons" }, { id: "stars", label: "Stars" }, { id: "catalogue", label: "Autres offres" }] as const;
type ShopTab = typeof shopTabs[number]["id"];
const rankPresentation = [
  { tags: ["etoile"], highlights: ["25 homes · 5 boîtes PC supplémentaires", "Cosmétiques Étoilés et accès au warp EVs", "+10 % d’XP Battle Pass et métiers"] },
  { tags: ["cosmiquea", "cosmiqueb"], highlights: ["Étoilé inclus · /fly et 50 homes", "GTS sans taxe · 5 raids par jour", "+20 % d’XP au total · 10 boîtes PC supplémentaires"] },
  { tags: ["galactiquea", "galactiqueb"], highlights: ["Cosmique inclus · homes illimités", "/enderchest, /pc et /pokeheal", "Les trois collections de cosmétiques"] },
];

export default function ShopPage() {
  const packTrigger = useRef<HTMLButtonElement | null>(null);
  const [account, setAccount] = useState<ShopAccount | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState<StarPack | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<"test" | "live" | null>(null);
  const [rechargeBusy, setRechargeBusy] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState("");
  const checkoutRequest = useRef<{ packId: string; id: string } | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentRefresh, setPaymentRefresh] = useState(0);
  const [category, setCategory] = useState("all");
  const [tokenPack, setTokenPack] = useState(false);
  const [activeTab, setActiveTab] = useState<ShopTab>("grades");
  const visibleProducts = catalog.filter(item => item.category !== 'keys' && (category === "all" || item.category === category));

  useEffect(() => {
    let scrollFrame = 0;
    const syncHash = () => {
      const tab = shopTabs.find(item => `#${item.id}` === window.location.hash);
      if (tab) {
        setActiveTab(tab.id);
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(() => { scrollFrame = requestAnimationFrame(() => document.getElementById("store-navigation")?.scrollIntoView({ block: "start", behavior: "instant" })); });
      }
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => { window.removeEventListener("hashchange", syncHash); cancelAnimationFrame(scrollFrame); };
  }, []);

  function selectTab(tab: ShopTab, focus = false) {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
    if (focus) document.getElementById(`tab-${tab}`)?.focus();
  }

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
    void fetch("/api/shop/status", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Shop unavailable");
        return response.json() as Promise<{ checkoutEnabled: boolean; checkoutMode: "test" | "live" | null }>;
      })
      .then((data) => { setCheckoutEnabled(data.checkoutEnabled); setCheckoutMode(data.checkoutMode); })
      .catch(() => { setCheckoutEnabled(false); setCheckoutMode(null); });
  }, [account]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const orderId = query.get("commande");
    if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return;
    if (loading) return;
    let active = true;
    let timer: number | undefined;
    let attempts = 0;
    const controller = new AbortController();
    async function checkPayment() {
      attempts++;
      try {
        const response = await fetch(`/api/shop/orders/${encodeURIComponent(orderId!)}`, {
          credentials: "include", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error(response.status === 401 ? "Connecte-toi pour consulter le résultat de ta recharge." : response.status === 404 ? "Cette recharge est introuvable pour ton compte." : "Impossible de vérifier ta recharge pour le moment.");
        const result = await response.json() as PaymentResult;
        if (!active) return;
        setPaymentResult(result);
        if (result.status === "paid") {
          setPaymentMessage(`Paiement confirmé : ${result.stars.toLocaleString("fr-FR")} Stars ont été créditées sur ton compte.`);
          window.dispatchEvent(new Event("cobblestar:wallet-changed"));
          // A wallet refresh failure must not replace an already confirmed payment with an error.
          try {
            const wallet = await fetch("/api/wallet", { credentials: "include", cache: "no-store", signal: controller.signal });
            if (wallet.ok) { const data = await wallet.json() as { balance: number }; if (active) setBalance(data.balance); }
          } catch { /* The account header and wallet poll will refresh the balance later. */ }
          return;
        }
        if (result.status === "test_paid") { setPaymentMessage("Paiement de test confirmé. Aucun débit réel et aucune Star ajoutée à ton solde."); return; }
        if (result.status === "expired") { setPaymentMessage("Ce paiement a expiré. Tu peux choisir un nouveau pack de Stars."); return; }
        if (result.status === "failed") { setPaymentMessage("Le paiement n’a pas abouti. Aucune Star n’a été ajoutée."); return; }
        setPaymentMessage(query.get("paiement") === "annule"
          ? "Tu as quitté le paiement. Aucune recharge n’est confirmée pour cette commande."
          : "La confirmation du paiement est en cours. Les Stars seront ajoutées dès sa validation.");
        if (attempts < 8) timer = window.setTimeout(() => { void checkPayment(); }, 2500);
      } catch (error) {
        if (active) setPaymentMessage(error instanceof Error ? error.message : "Impossible de vérifier ta recharge.");
      }
    }
    void checkPayment();
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [account, loading, paymentRefresh]);

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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPack(null);
      if (event.key !== "Tab") return;
      const controls = [...document.querySelectorAll<HTMLElement>('.shop-v2-dialog button:not(:disabled), .shop-v2-dialog a[href]')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      packTrigger.current?.focus({ preventScroll: true });
    };
  }, [selectedPack]);

  const username = account?.minecraft.username || null;
  const linked = account?.minecraft.linked ?? false;

  async function startCheckout() {
    if (!selectedPack || rechargeBusy || !checkoutEnabled) return;
    setRechargeBusy(true);
    setRechargeMessage("");
    try {
      if (checkoutRequest.current?.packId !== selectedPack.id) checkoutRequest.current = { packId: selectedPack.id, id: crypto.randomUUID() };
      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: selectedPack.id, requestId: checkoutRequest.current.id }),
      });
      const data = await response.json() as { url?: string; orderId?: string; status?: string; error?: string };
      if (!response.ok) {
        const messages: Record<string, string> = {
          AUTH_REQUIRED: "Ta session a expiré. Reconnecte-toi avant de continuer.",
          CHECKOUT_UNAVAILABLE: "Les achats de Stars ne sont pas encore ouverts.",
          CHECKOUT_EXPIRED: "Le récapitulatif a expiré. Ferme-le puis choisis à nouveau ton pack.",
          CHECKOUT_REQUEST_CONFLICT: "Choisis à nouveau ton pack pour recommencer le paiement.",
          PAYMENT_TEMPORARILY_UNAVAILABLE: "Le paiement est temporairement indisponible. Réessaie dans quelques instants.",
          CHECKOUT_SESSION_INVALID: "Le paiement est temporairement indisponible. Réessaie dans quelques instants.",
          MINECRAFT_LINK_REQUIRED: "Lie d’abord ton compte Minecraft.",
        };
        throw new Error(messages[data.error || ""] || "Le paiement n’a pas pu être ouvert. Réessaie dans quelques instants.");
      }
      if (data.status === "paid" || data.status === "test_paid") {
        window.location.assign(new URL(`/boutique/?commande=${encodeURIComponent(data.orderId!)}#stars`, window.location.origin).href);
        return;
      }
      if (!data.url) throw new Error("Le paiement est temporairement indisponible.");
      let destination: URL;
      try { destination = new URL(data.url); }
      catch { throw new Error("Le paiement est temporairement indisponible."); }
      if (destination.protocol !== "https:" || destination.hostname !== "checkout.stripe.com" || destination.username || destination.password)
        throw new Error("Le paiement est temporairement indisponible.");
      window.location.assign(destination.href);
    } catch (error) {
      setRechargeMessage(error instanceof Error ? error.message : "La recharge n’a pas pu aboutir.");
    } finally {
      setRechargeBusy(false);
    }
  }

  return <main className="shop-quick-page shop-compact">
    <SiteHeader />
    <section className="shop-quick-shell" id="contenu" aria-labelledby="shop-title">
      <header className="store-intro">
        <div><span className="kicker">BOUTIQUE COBBLESTAR</span><h1 id="shop-title">Choisis <em>ton grade.</em></h1><p>Les tags du serveur, des avantages en jeu et une façon de soutenir CobbleStar.</p></div>
        <img src="/astral/assets/stars-640-v3.webp" alt="" width="400" height="226" />
      </header>
      <p className="store-opening"><strong>Ouverture à venir.</strong> Les offres en jeu seront accessibles à l’ouverture du serveur.</p>
      <div className="store-toolbar" id="store-navigation">
        <div className="store-tabs" role="tablist" aria-label="Dans la boutique">{shopTabs.map((tab,index)=><button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab===tab.id} aria-controls={tab.id} tabIndex={activeTab===tab.id?0:-1} onClick={()=>selectTab(tab.id)} onKeyDown={event=>{
          const next = event.key === "ArrowRight" ? (index+1)%shopTabs.length : event.key === "ArrowLeft" ? (index+shopTabs.length-1)%shopTabs.length : event.key === "Home" ? 0 : event.key === "End" ? shopTabs.length-1 : -1;
          if(next>=0){event.preventDefault();selectTab(shopTabs[next].id,true);}
        }}>{tab.label}</button>)}</div>
        <div className="store-account" aria-label="Ton compte boutique">
          {loading ? <span>Chargement du compte…</span> : !account ? <Link href="/compte/">Se connecter →</Link> : <><span>{username || "Minecraft à lier"}</span><strong><StarsArt />{balance.toLocaleString("fr-FR")} Stars</strong>{!linked && <button type="button" onClick={()=>setLinkOpen(true)}>Lier Minecraft</button>}</>}
        </div>
      </div>
      <section id="grades" role="tabpanel" aria-labelledby="tab-grades" tabIndex={0} hidden={activeTab!=="grades"} className="store-panel">
        <div className="store-panel-heading"><h2>Les grades du serveur</h2><p>Un mois · renouvellement manuel · sans abonnement</p></div>
        <div className="store-ranks">{ranks.map((rank,index)=>{
          const presentation = rankPresentation[index];
          return <article className={`store-rank store-rank-${index}`} key={rank.id}>
            <div className="store-tag-stage"><img src={`/shop/ranks/${presentation.tags[0]}.png`} alt={`Tag ${rank.name.split(" · ")[0]} en jeu`} />{presentation.tags[1] && <img className="store-tag-variant" src={`/shop/ranks/${presentation.tags[1]}.png`} alt="Seconde variante incluse" />}</div>
            <div className="store-rank-body"><h3>{rank.name.split(" · ")[0]}</h3><strong className="shop-star-price"><StarsArt/>{rank.starsPrice.toLocaleString("fr-FR")} <span>Stars / mois</span></strong>
            <ul className="store-highlights">{presentation.highlights.map(text=><li key={text}>{text}</li>)}</ul>
            <details><summary>Tous les avantages</summary><ul>{rank.benefits?.map(benefit=><li key={benefit}>{benefit}</li>)}</ul></details>
            <button className="store-action" type="button" onClick={()=>selectTab("stars",true)}>Voir les packs de Stars <span aria-hidden="true">→</span></button>
            </div>
          </article>;
        })}</div>
        <p className="store-caption">Achat et renouvellement dans <code>/boutique</code> en jeu. Cadeaux réservés au premier achat de chaque grade ; conditions détaillées dans les avantages.</p>
      </section>
      <section id="jetons" role="tabpanel" aria-labelledby="tab-jetons" tabIndex={0} hidden={activeTab!=="jetons"} className="store-panel">
        <div className="store-panel-heading"><h2>Un jeton. Une ouverture.</h2><p>Nova, Pulsar ou Quasar : choisis ta machine.</p></div>
        <div className="shop-filters" role="group" aria-label="Quantité de jetons"><button type="button" aria-pressed={!tokenPack} onClick={()=>setTokenPack(false)}>À l’unité</button><button type="button" aria-pressed={tokenPack} onClick={()=>setTokenPack(true)}>Lots de 4</button></div>
        <div className="store-token-grid">{['nova','pulsar','quasar'].map(id=>{
          const item=catalog.find(p=>p.id===(tokenPack?`pack_${id}_4`:`key_${id}`))!;
          const single=catalog.find(p=>p.id===`key_${id}`)!;
          return <article className={`store-token store-token-${id}`} key={id}>
            <img src={`/shop/tokens/${id}.png`} alt={`Jeton ${id} du serveur CobbleStar`} width="400" height="400"/>
            <div><h3>{id[0].toUpperCase()+id.slice(1)} {tokenPack&&<span>×4</span>}</h3><p>{tokenPack?'4 jetons pour 4 ouvertures':'1 jeton pour 1 ouverture'}</p>
            <strong className="shop-star-price"><StarsArt/>{item.starsPrice.toLocaleString('fr-FR')} <span>Stars</span></strong>
            <p className="store-token-saving">{tokenPack?`${(single.starsPrice*4-item.starsPrice).toLocaleString('fr-FR')} Stars économisées`:'Utilisable dans la machine du même nom'}</p>
            <a href="/wiki/caisses/#demo-machines">Voir la machine et son ouverture →</a></div>
          </article>;
        })}</div>
        <div className="store-token-note"><p>Les jetons correspondent aux anciennes clés. Une ouverture donne un lot aléatoire : consulte le contenu et les probabilités dans <code>/crates</code> en jeu.</p><p><strong>Jeton Vote :</strong> obtenu grâce aux votes et récompenses du serveur. <Link href="/vote/">Voir les votes →</Link></p><button type="button" className="store-action" onClick={()=>selectTab('stars',true)}>Voir les packs de Stars →</button></div>
      </section>
      <section id="stars" role="tabpanel" aria-labelledby="tab-stars" tabIndex={0} hidden={activeTab!=="stars"} className="store-panel">
        <div className="store-panel-heading"><h2>Choisis tes Stars.</h2><p>Paiement unique. Bonus déjà inclus dans les totaux.</p></div>
        {paymentMessage && <div className="store-payment-status" role="status" aria-live="polite"><p>{paymentMessage}</p>
          {(!paymentResult || paymentResult.status === "pending") && <button type="button" className="store-action" onClick={() => setPaymentRefresh(value => value + 1)}>Vérifier ma recharge</button>}
        </div>}
        {!checkoutEnabled && <p className="store-caption">Les achats de Stars ne sont pas encore ouverts. Les packs et leurs prix sont consultables ci-dessous.</p>}
        {checkoutMode === "test" && <p className="store-caption">Mode test réservé au staff : aucun paiement réel, aucune Star créditée.</p>}
        <div className="store-packs">{starPacks.map(pack=><article className="store-pack" key={pack.stars}>
          <StarsArt large /><h3>{pack.stars.toLocaleString("fr-FR")} <span>Stars</span></h3><p>{pack.bonus || "Pack découverte"}</p><button className="store-action" type="button" onClick={event=>{packTrigger.current=event.currentTarget;checkoutRequest.current=null;setSelectedPack(pack);setRechargeMessage("");}} aria-label={`Choisir ${pack.stars.toLocaleString("fr-FR")} Stars pour ${pack.price}`}>{pack.price} <span aria-hidden="true">→</span></button>
        </article>)}</div>
        <p className="store-caption">Les Stars sont une monnaie virtuelle, non convertible en argent. Un compte Minecraft lié est nécessaire pour recevoir ta recharge.</p>
      </section>
      <section id="catalogue" role="tabpanel" aria-labelledby="tab-catalogue" tabIndex={0} hidden={activeTab!=="catalogue"} className="store-panel">
        <div className="store-panel-heading"><h2>Complète ta collection.</h2><p>À retrouver dans <code>/boutique</code> en jeu.</p></div>
        <div className="shop-filters" role="group" aria-label="Filtrer le catalogue">{categories.map(filter=><button type="button" key={filter.id} aria-pressed={category===filter.id} onClick={()=>setCategory(filter.id)}>{filter.label}</button>)}</div>
        <p className="store-caption" aria-live="polite">{visibleProducts.length} offres</p>
        <div className="store-products">{catalog.filter(item=>item.category!=='keys').map(item=><article className="store-product" hidden={category!=="all" && item.category!==category} key={item.id}><h3>{item.name}</h3><p>{item.description}</p><strong className="shop-star-price"><StarsArt/>{item.starsPrice.toLocaleString("fr-FR")} <span>Stars</span></strong></article>)}</div>
        <p className="store-caption"><Link href="/wiki/pokedex/">Découvrir les Pokémon Star et les formes CobbleStar →</Link></p>
      </section>
      <details className="store-help"><summary>Comment acheter ? Comptes, Stars et renouvellement</summary><div>{SHOP_FAQ.map(entry=><section key={entry.question}><h2>{entry.question}</h2><p>{entry.answer}</p></section>)}</div></details>
    </section>

    {selectedPack && <div className="shop-v2-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPack(null); }}>
      <section className="shop-v2-dialog" role="dialog" aria-modal="true" aria-labelledby="shop-dialog-title">
        <button className="shop-v2-dialog-close" type="button" onClick={() => setSelectedPack(null)} aria-label="Fermer le récapitulatif" autoFocus>×</button>
        <span className="kicker">RÉCAPITULATIF DU PACK</span>
        <div className="shop-v2-dialog-star"><StarsArt large /></div>
        <h2 id="shop-dialog-title">{selectedPack.stars.toLocaleString("fr-FR")} <em>Stars</em></h2>
        <div className="shop-v2-dialog-price"><span>Montant unique</span><b>{selectedPack.price}</b></div>
        {selectedPack.bonus && <p className="shop-v2-dialog-bonus">✓ {selectedPack.bonus} incluses dans le total</p>}
        <div className="shop-v2-dialog-account"><small>DESTINATION</small><b>{username || (account ? "Minecraft à lier" : "Aucun compte connecté")}</b><span>{linked ? "✓ Compte Minecraft lié" : "Compte à préparer avant l’achat"}</span></div>
        {!account ? <Link className="shop-v2-dialog-action" href="/compte/">Se connecter pour continuer <span>→</span></Link> : !linked ? <button className="shop-v2-dialog-action" type="button" onClick={() => { setSelectedPack(null); setLinkOpen(true); }}>Lier mon compte Minecraft <span>→</span></button> : checkoutEnabled ? <button className="shop-v2-dialog-action" type="button" onClick={startCheckout} disabled={rechargeBusy}>{rechargeBusy ? "Ouverture du paiement…" : checkoutMode === "test" ? "Tester le paiement Stripe" : `Payer ${selectedPack.price} avec Stripe`}<span aria-hidden="true">→</span></button> : <button className="shop-v2-dialog-action is-disabled" type="button" disabled>Achats bientôt disponibles</button>}
        {rechargeMessage && <p className="shop-v2-dialog-message" role="status">{rechargeMessage}</p>}
        <p className="shop-v2-dialog-note">{checkoutMode === "test" ? "Test staff : aucun débit réel et aucune Star ajoutée au solde." : checkoutEnabled ? "Tu seras redirigé vers Stripe pour payer. Les Stars seront créditées après confirmation du paiement." : "Vérifie le montant et le compte Minecraft de destination. Les achats ne sont pas encore ouverts."}</p>
      </section>
    </div>}

    <MinecraftLinkGate open={linkOpen} onClose={() => setLinkOpen(false)} context="achat" />
    <FaqStructuredData faqItems={SHOP_FAQ} pageUrl="/boutique/" />
    <SiteFooter />
  </main>;
}
