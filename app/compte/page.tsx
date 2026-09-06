"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ACCOUNT_FAQ } from "../lib/faq";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import FaqSection from "../components/FaqSection";
import FaqStructuredData from "../components/FaqStructuredData";
import styles from "./account.module.css";

type Account = {
  id: string;
  name: string;
  identity: { kind: "minecraft" | "provisional"; id: string };
  admin: boolean;
  email: string | null;
  discord: { id: string; username: string | null; globalName: string | null; avatarUrl: string | null } | null;
  minecraft: { username: string | null; uuid: string | null; linked: boolean };
};

const messages: Record<string, string> = {
  RELINK_DISABLED: "La récupération doit être activée par un administrateur sur l’API, après vérification de l’authentification Minecraft.",
  RELINK_CONFIRMATION_REQUIRED: "Confirme le remplacement de la liaison avant de générer ta commande.",
  LINK_BUSY_RETRY: "Une autre opération est en cours. Réessaie dans quelques instants.",
  AUTH_REQUIRED: "Ta session a changé ou expiré. Reconnecte-toi avec Discord.",
};
const DISCORD_INVITE_URL = "https://discord.gg/Sd387Ky4M";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers,
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "INTERNAL_ERROR");
  return body;
}

export default function ComptePage() {
  return <AccountPortal />;
}

function AccountPortal() {
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState(0);
  const [command, setCommand] = useState("");
  const [commandCopied, setCommandCopied] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [relinkEnabled, setRelinkEnabled] = useState(false);
  const [showRelink, setShowRelink] = useState(false);
  const [linkConsent, setLinkConsent] = useState(false);
  const [success, setSuccess] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const refreshAccess = async () => {
      const current = ++generation;
      // Do not leave a stale admin link visible while rechecking an expired session.
      setAccount(previous => previous ? { ...previous, admin: false } : previous);
      try {
        const result = await api<{ user: Account }>("/api/me");
        if (!cancelled && current === generation) setAccount(result.user);
      } catch {
        if (!cancelled && current === generation) setAccount(null);
      }
    };
    window.addEventListener("focus", refreshAccess);
    window.addEventListener("cobblestar:account-changed", refreshAccess);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshAccess);
      window.removeEventListener("cobblestar:account-changed", refreshAccess);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api<{ user: Account }>("/api/me"),
      api<{ balance: number }>("/api/wallet"),
      api<{ relinkEnabled: boolean }>("/api/link/status"),
    ]).then(([profile, wallet, link]) => {
      if (!cancelled) {
        setAccount(profile.user);
        setBalance(wallet.balance);
        setRelinkEnabled(link.relinkEnabled);
      }
    }).catch(() => {
      if (!cancelled) setAccount(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("discord");
    const feedback = result === "denied"
      ? "La connexion Discord a été annulée. Tu peux réessayer quand tu veux."
      : result === "failed"
        ? "Discord n’a pas pu confirmer ta connexion. Réessaie dans quelques instants."
        : result === "guild-failed"
          ? "Ton identité a été confirmée, mais Discord n’a pas pu t’ajouter au serveur CobbleStar. Utilise le lien manuel puis réessaie."
        : result === "unavailable"
          ? "La connexion Discord n’est pas encore configurée sur le serveur."
          : "";
    const feedbackTimer = feedback ? window.setTimeout(() => setError(feedback), 0) : null;
    if (result) window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
    return () => { if (feedbackTimer !== null) window.clearTimeout(feedbackTimer); };
  }, []);

  useEffect(() => {
    if (!command || !requestId) return;
    let cancelled = false;
    let inFlight = false;
    const timer = window.setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const status = await api<{ request: { state: string } }>(`/api/link/status?requestId=${encodeURIComponent(requestId)}`);
        if (cancelled) return;
        if (status.request.state === "completed") {
          const [profile, wallet] = await Promise.all([api<{ user: Account }>("/api/me"), api<{ balance: number }>("/api/wallet")]);
          if (cancelled) return;
          setAccount(profile.user);
          setBalance(wallet.balance);
          setCommand("");
          setExpiresAt(null);
          setShowRelink(false);
          setLinkConsent(false);
          setSuccess("Liaison confirmée. Ton Discord accède maintenant au profil de cet UUID Minecraft.");
          window.dispatchEvent(new Event("cobblestar:account-changed"));
        } else if (status.request.state !== "pending" || (expiresAt && Date.now() >= expiresAt)) {
          setCommand("");
          setExpiresAt(null);
          setError("Ce code a expiré ou a été remplacé. Génère une nouvelle commande.");
        }
      } catch (caught) {
        if (cancelled) return;
        if (caught instanceof Error && caught.message === "AUTH_REQUIRED") {
          setAccount(null);
          setCommand("");
          setError(messages.AUTH_REQUIRED);
        } else if (expiresAt && Date.now() >= expiresAt) {
          setCommand("");
          setError("La confirmation n’a pas pu être vérifiée. Recharge ton compte avant de réessayer.");
        }
      } finally { inFlight = false; }
    }, 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [command, expiresAt, requestId]);

  async function createCode() {
    if (!linkConsent) { setError("Confirme d’abord la liaison avec ton Discord ci-dessous."); return; }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await api<{ requestId: string; command: string; expiresInSeconds: number }>("/api/link/code", { method: "POST", body: JSON.stringify({ allowRelink: relinkEnabled }) });
      setRequestId(data.requestId);
      setCommand(data.command);
      setCommandCopied(false);
      setExpiresAt(Date.now() + data.expiresInSeconds * 1000);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR";
      setError(messages[code] || "Impossible de générer le code de liaison.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCommand() {
    if (!command) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(command);
    } catch {
      const input = document.createElement("textarea");
      input.value = command;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCommandCopied(true);
    window.setTimeout(() => setCommandCopied(false), 1600);
  }

  async function logout() {
    await api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    setAccount(null);
    setCommand("");
    window.dispatchEvent(new Event("cobblestar:account-changed"));
  }

  const linked = account?.minecraft.linked ?? false;
  const discordName = account?.discord?.globalName || account?.discord?.username || "Dresseur";
  const discordHandle = account?.discord?.username ? `@${account.discord.username}` : "Compte Discord";
  const accountInitial = (account?.discord?.globalName || account?.discord?.username || account?.minecraft.username || "C").slice(0, 1).toUpperCase();

  return <main className={styles.page}>
    <SiteHeader />
    <section className={styles.stage} id="contenu">
      <span className={styles.ambientOne} aria-hidden="true" />
      <span className={styles.ambientTwo} aria-hidden="true" />

      <header className={styles.intro}>
        <div className={styles.eyebrow}><span>05</span><i /> ESPACE JOUEUR</div>
        <h1>Ton passeport.<br /><em>Toute ton aventure.</em></h1>
        <p>Une seule identité pour ton profil Minecraft, tes Stars, la boutique et les récompenses communautaires.</p>
      </header>

      <div className={styles.portal}>
        <aside className={`${styles.passport} ${linked ? styles.passportLinked : ""}`}>
          <div className={styles.passportBackdrop} aria-hidden="true"><img src="/cobblemon-lakeside.webp" alt="" /><span /></div>
          <header className={styles.passportHeader}><span>COBBLESTAR</span><b>{account ? (linked ? "ACTIF" : "À RELIER") : "ACCÈS JOUEUR"}</b></header>

          <div className={styles.identityVisual}>
            {account?.discord
              ? <div className={`${styles.playerAvatar} ${styles.discordAvatar}`}><span aria-hidden="true">{accountInitial}</span>{account.discord.avatarUrl && <img src={account.discord.avatarUrl} alt={`Avatar Discord de ${discordName}`} onError={(event) => { event.currentTarget.style.display = "none"; }} />}</div>
              : <img className={styles.brandAvatar} src="/cobblestar-logo.png" alt="Mascotte de CobbleStar" />}
            <span className={styles.identityOrbit} aria-hidden="true" />
          </div>

          <div className={styles.passportCopy}>
            <small>{account ? "PASSEPORT DE DRESSEUR" : "UNE IDENTITÉ, PARTOUT"}</small>
            <h2>{account ? account.minecraft.username || discordName : "Prêt à nous rejoindre ?"}</h2>
            <p>{account
              ? linked ? "Ton UUID Minecraft est ton identité permanente. Discord est ta clé de connexion, même si ton pseudo ou ton e-mail change." : "Ton Discord est reconnu. La commande /link crée ou retrouve ton profil Minecraft par UUID, sans dépendre de ton e-mail."
              : "Connecte Discord, confirme ton joueur directement sur le serveur et retrouve ensuite tout au même endroit."}</p>
          </div>

          <ol className={styles.passportSteps} aria-label="Parcours du compte CobbleStar">
            <li className={account ? styles.stepDone : styles.stepCurrent}><span>01</span><div><b>Discord</b><small>{account ? "Connecté" : "Connexion sécurisée"}</small></div></li>
            <li className={linked ? styles.stepDone : account ? styles.stepCurrent : ""}><span>02</span><div><b>Minecraft</b><small>{linked ? "Confirmé" : "Commande /link"}</small></div></li>
            <li className={linked ? styles.stepCurrent : ""}><span>03</span><div><b>Aventure</b><small>Boutique & votes</small></div></li>
          </ol>

          <div className={styles.safety}><span>✓</span><p><b>Aucun mot de passe à créer</b><small>Discord confirme ton identité, puis Minecraft confirme ton joueur.</small></p></div>
        </aside>

        <section className={styles.console} aria-live="polite">
          {loading && !account ? <div className={styles.loadingState}>
            <span className={styles.loader} />
            <small>ESPACE JOUEUR</small>
            <h2>On prépare ton passeport…</h2>
            <p>Vérification de ta session et de ton identité Minecraft.</p>
          </div> : account ? <div className={styles.profile}>
            <header className={styles.profileHeader}>
              <div className={styles.profileAvatar}>
                <span aria-hidden="true">{accountInitial}</span>
                {account.discord?.avatarUrl && <img src={account.discord.avatarUrl} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
              </div>
              <div><small>MON ESPACE</small><h2>{account.minecraft.username || discordName}</h2><p>Connexion Discord · {discordHandle}</p></div>
              <span className={`${styles.linkBadge} ${linked ? styles.linked : styles.pending}`}>{linked ? "✓ Identité liée" : "Liaison requise"}</span>
            </header>

            <div className={styles.stats}>
              <article><small>SOLDE DISPONIBLE</small><strong><i>✦</i>{balance.toLocaleString("fr-FR")}</strong><span>Stars</span></article>
              <article><small>COMPTE MINECRAFT</small><strong>{linked ? account.minecraft.username || "Vérifié" : "En attente"}</strong><span>{linked ? "Boutique et votes débloqués" : "Termine l’étape 02"}</span></article>
            </div>

            <div className={styles.progressRail} aria-label="Progression de la liaison du compte">
              <span className={styles.progressDone}><i>✓</i><b>Discord connecté</b><small>{discordHandle}</small></span>
              <em aria-hidden="true" />
              <span className={linked ? styles.progressDone : styles.progressCurrent}><i>{linked ? "✓" : "2"}</i><b>Minecraft lié</b><small>{linked ? "Identité confirmée" : "À faire en jeu"}</small></span>
            </div>

            {(!linked || showRelink) && <section className={styles.linkPanel} aria-labelledby="minecraft-link-title">
              <div className={styles.linkHeading}><span>02</span><div><small>{linked ? "MODIFIER LA LIAISON" : "CRÉER OU RETROUVER TON PROFIL"}</small><h3 id="minecraft-link-title">{linked ? "Confirme à nouveau en jeu" : "Confirme ton joueur en jeu"}</h3><p>Exécute uniquement la commande de ton propre espace. Ne partage jamais ce code.</p></div></div>
              <div className={styles.linkExplanation}>
                <p>Discord à associer : <b>{discordHandle}</b> · <code>{account.discord?.id}</code></p>
                <p>{relinkEnabled ? "Un profil existe déjà pour cet UUID ? Tu le récupères, même avec un e-mail différent. Son ancien accès Discord sera remplacé." : "La récupération d’un profil déjà lié doit d’abord être activée par un administrateur. La première liaison reste disponible."}</p>
                <p>{linked ? "Si tu choisis un autre joueur Minecraft, les Stars, achats et votes du joueur actuel restent sur son UUID. Ils ne sont pas transférés entre joueurs." : "Les Stars, achats et votes de ce compte provisoire rejoignent le profil Minecraft récupéré, sans rejouer les récompenses déjà livrées."}</p>
                {!command && <label className={styles.linkConsent}><input type="checkbox" checked={linkConsent} onChange={event => setLinkConsent(event.target.checked)} /><span>Je confirme que ce Discord est le mien et j’autorise son association au joueur qui exécutera /link{relinkEnabled ? ", en remplacement de l’ancienne connexion si nécessaire" : ""}.</span></label>}
              </div>
              {!command ? <button className={styles.primaryAction} type="button" onClick={createCode} disabled={loading || !linkConsent || (linked && !relinkEnabled)}><span>{loading ? "Génération…" : "Générer ma commande /link"}</span><b>→</b></button> : <div className={styles.commandFlow}>
                <div className={styles.commandMeta}><span>COMMANDE PERSONNELLE</span><small>Expire dans 10 minutes</small></div>
                <div className={styles.commandRow}><code>{command}</code><button type="button" onClick={copyCommand}>{commandCopied ? "Copiée ✓" : "Copier"}</button></div>
                <ol><li><span>1</span><p>Rejoins <b>play.cobblestar-mc.fr</b></p></li><li><span>2</span><p>Colle la commande dans le chat</p></li><li><span>3</span><p>Attends la confirmation automatique ici</p></li></ol>
                <button className={styles.regenerate} type="button" onClick={createCode} disabled={loading}>Générer un autre code</button>
              </div>}
            </section>}

            {linked && <section className={styles.readyPanel}>
              <div><span>✓</span><p><small>PASSEPORT ACTIF</small><b>Tu es prêt pour CobbleStar.</b></p></div>
              <p>Ton compte est reconnu par la boutique et le système de votes. Tes Stars restent synchronisées avec ce profil.</p>
              {account.minecraft.uuid && <div className={styles.identityKey}><small>IDENTIFIANT PRINCIPAL DU COMPTE</small><code>{account.minecraft.uuid}</code><p>Le pseudo est un nom d’affichage. Cet UUID conserve ton profil.</p></div>}
              <button className={styles.regenerate} type="button" onClick={() => setShowRelink(true)} disabled={showRelink}>Récupérer / changer la liaison Minecraft</button>
            </section>}

            {success && <p className={styles.linkSuccess} role="status">✓ {success}</p>}

            {account.admin === true && <Link className={styles.adminLink} href="/admin/"><span><small>ACCÈS ADMINISTRATEUR</small><b>Ouvrir le centre de contrôle</b></span><strong>→</strong></Link>}

            {error && <div className={styles.alert} role="alert"><span>!</span><div><b>Impossible de continuer</b><p>{error}</p></div><button type="button" onClick={createCode} disabled={loading}>Réessayer</button></div>}
            <button className={styles.logout} type="button" onClick={logout}>Se déconnecter <span>↗</span></button>
          </div> : <div className={styles.authArea}>
            <header className={styles.authHeader}><small>CONNEXION UNIQUE</small><h2>Entre avec Discord.</h2><p>Discord confirme ton profil et t’ajoute au serveur officiel CobbleStar. Ensuite, la commande <b>/link</b> rattache ton joueur Minecraft.</p></header>

            <div className={styles.discordCard}>
              <span className={styles.discordMark} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19.5 5.34A16.3 16.3 0 0 0 15.44 4l-.5 1.02a15 15 0 0 0-5.88 0L8.56 4A16.5 16.5 0 0 0 4.5 5.35C1.93 9.2 1.24 12.96 1.6 16.66a16.4 16.4 0 0 0 4.98 2.52l1.2-1.65a10.7 10.7 0 0 1-1.88-.9l.46-.35c3.63 1.68 7.57 1.68 11.16 0l.47.35c-.6.36-1.23.66-1.88.9l1.2 1.65a16.4 16.4 0 0 0 4.98-2.52c.43-4.28-.74-8-2.79-11.32ZM8.52 14.42c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23s2 1.01 1.98 2.23c0 1.23-.87 2.22-1.98 2.22Zm6.96 0c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23s2 1.01 1.98 2.23c0 1.23-.87 2.22-1.98 2.22Z" /></svg></span>
              <div><small>CONNEXION DISCORD · IDENTITÉ MINECRAFT</small><strong>Un profil par UUID Minecraft</strong><p>Discord te connecte et te fait rejoindre la communauté. Ensuite, /link crée ou retrouve ton profil par UUID. Ton e-mail n’est pas utilisé pour identifier ton joueur.</p></div>
            </div>

            {error && <p className={styles.formError} role="alert">{error}</p>}
            <a className={styles.discordButton} href="/api/auth/discord"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 5.34A16.3 16.3 0 0 0 15.44 4l-.5 1.02a15 15 0 0 0-5.88 0L8.56 4A16.5 16.5 0 0 0 4.5 5.35C1.93 9.2 1.24 12.96 1.6 16.66a16.4 16.4 0 0 0 4.98 2.52l1.2-1.65a10.7 10.7 0 0 1-1.88-.9l.46-.35c3.63 1.68 7.57 1.68 11.16 0l.47.35c-.6.36-1.23.66-1.88.9l1.2 1.65a16.4 16.4 0 0 0 4.98-2.52c.43-4.28-.74-8-2.79-11.32ZM8.52 14.42c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23s2 1.01 1.98 2.23c0 1.23-.87 2.22-1.98 2.22Zm6.96 0c-1.09 0-1.98-1-1.98-2.22 0-1.23.87-2.23 1.98-2.23s2 1.01 1.98 2.23c0 1.23-.87 2.22-1.98 2.22Z" /></svg>Continuer avec Discord</span><b>→</b></a>
            <a className={styles.discordCommunityLink} href={DISCORD_INVITE_URL} target="_blank" rel="noreferrer">Ouvrir le Discord CobbleStar manuellement <span>↗</span></a>

            <ol className={styles.discordFlow} aria-label="Étapes de connexion"><li><span>01</span><p><b>Discord rejoint</b><small>Connexion en un clic</small></p></li><li><span>02</span><p><b>/link en jeu</b><small>Ton UUID est confirmé</small></p></li><li><span>03</span><p><b>Compte prêt</b><small>Stars, boutique et votes</small></p></li></ol>

            <footer className={styles.authFooter}><span>✓ Discord CobbleStar rejoint</span><span>✓ Aucun mot de passe stocké</span></footer>
          </div>}
        </section>
      </div>
    </section>
    <FaqSection title="Questions sur les comptes" id="faq-compte" items={ACCOUNT_FAQ} />
    <FaqStructuredData faqItems={ACCOUNT_FAQ} pageUrl="/compte/" />
    <SiteFooter />
  </main>;
}
