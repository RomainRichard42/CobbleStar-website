"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";

type Account = {
  id: string;
  email: string;
  minecraft: { username: string | null; uuid: string | null; linked: boolean };
};

const accountsEnabled = true;
const messages: Record<string, string> = {
  INVALID_CREDENTIALS: "Adresse e-mail ou mot de passe incorrect.",
  EMAIL_ALREADY_USED: "Cette adresse e-mail possède déjà un compte.",
  MINECRAFT_ACCOUNT_NOT_FOUND: "Ce compte Minecraft officiel est introuvable.",
  INVALID_INPUT: "Vérifie les informations saisies.",
  ALREADY_LINKED: "Ce compte Minecraft est déjà lié.",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "INTERNAL_ERROR");
  return body;
}

export default function ComptePage() {
  if (!accountsEnabled) return <ClosedAccountPage />;
  return <AccountPortal />;
}

function ClosedAccountPage() {
  return <main>
    <PageHero eyebrow="ESPACE JOUEUR" title="Bientôt disponible." accent="La bêta d’abord." description="Les comptes CobbleStar ouvriront progressivement après les premiers tests du serveur." badge="FERMÉ" />
    <section className="account-page"><div className="opening-note"><span>BÊTA PRIVÉE</span><p>L’inscription et la liaison Minecraft sont prêtes, mais restent désactivées pour le public.</p></div></section>
    <SiteFooter />
  </main>;
}

function AccountPortal() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState(0);
  const [command, setCommand] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshAccount() {
    const data = await api<{ user: Account }>("/api/me");
    setAccount(data.user);
    if (data.user.minecraft.linked) {
      setCommand("");
      setExpiresAt(null);
    }
    return data.user;
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api<{ user: Account }>("/api/me"),
      api<{ balance: number }>("/api/wallet"),
    ]).then(([profile, wallet]) => {
      if (!cancelled) {
        setAccount(profile.user);
        setBalance(wallet.balance);
      }
    }).catch(() => {
      if (!cancelled) setAccount(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!command || account?.minecraft.linked) return;
    const timer = window.setInterval(() => {
      if (expiresAt && Date.now() >= expiresAt) {
        setCommand("");
        setExpiresAt(null);
        setError("Ce code a expiré. Génère une nouvelle commande pour continuer.");
        return;
      }
      void refreshAccount().catch(() => undefined);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [command, expiresAt, account?.minecraft.linked]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const path = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const body = mode === "register" ? { email, password, minecraftUsername: username.trim() } : { email, password };
      const data = await api<{ user: Account }>(path, { method: "POST", body: JSON.stringify(body) });
      setAccount(data.user);
      setPassword("");
      setBalance(mode === "login" ? (await api<{ balance: number }>("/api/wallet")).balance : 0);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR";
      setError(messages[code] || "Une erreur empêche l’opération pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  async function createCode() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ command: string; expiresInSeconds: number }>("/api/link/code", { method: "POST" });
      setCommand(data.command);
      setExpiresAt(Date.now() + data.expiresInSeconds * 1000);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR";
      setError(messages[code] || "Impossible de générer le code de liaison.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCommand() {
    if (command) await navigator.clipboard.writeText(command);
  }

  async function logout() {
    await api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    setAccount(null);
    setCommand("");
    setMode("login");
  }

  const linked = account?.minecraft.linked ?? false;

  return <main>
    <PageHero eyebrow="ESPACE JOUEUR" title="Ton compte." accent="Toute ton aventure." description="Ton profil Minecraft, tes Stars et tes futures récompenses réunis au même endroit." badge="SÉCURISÉ" />
    <section className="account-page">
      <div className="account-layout">
        <div className="account-promise"><span className="kicker">COMPTE COBBLESTAR</span><h2>Un compte site.<br /><em>Ton vrai joueur.</em></h2><p>Tu t’inscris avec ton e-mail, puis la commande en jeu confirme ton UUID. Le mot de passe Microsoft n’est jamais demandé.</p><div className="account-benefits"><span><b>✦</b><i><strong>Code à usage unique</strong><small>Il expire automatiquement après 10 minutes</small></i></span><span><b>◈</b><i><strong>UUID officiel</strong><small>Récupéré directement depuis le serveur</small></i></span><span><b>✓</b><i><strong>Une seule liaison</strong><small>Valable ensuite pour la boutique et les votes</small></i></span></div></div>
        <div className="auth-card">
          {loading && !account ? <div className="account-created-preview account-loading"><span className="account-loader" /><small>ESPACE JOUEUR</small><h3>On récupère ton compte…</h3><p>Cette vérification ne prend normalement que quelques secondes.</p></div> : account ? <div className="account-created-preview">
            <div className="account-profile-head">
              <div className="account-player-mark" aria-hidden="true">{(account.minecraft.username || "C").slice(0, 1).toUpperCase()}</div>
              <div><small>COMPTE COBBLESTAR</small><h3>{account.minecraft.username || "Dresseur"}</h3><p>{linked ? "Ton profil est prêt pour l’aventure." : "Ton compte est créé. Il reste à confirmer ton joueur en jeu."}</p></div>
              <span className={`account-link-badge ${linked ? "is-linked" : "is-pending"}`}>{linked ? "✓ Minecraft lié" : "Dernière étape"}</span>
            </div>

            <ol className="account-progress" aria-label="Progression de la liaison du compte">
              <li className="is-done"><span>✓</span><div><b>Compte créé</b><small>E-mail enregistré</small></div></li>
              <li className={linked ? "is-done" : "is-current"}><span>{linked ? "✓" : "2"}</span><div><b>Lier Minecraft</b><small>{linked ? "Identité confirmée" : "Commande à effectuer en jeu"}</small></div></li>
            </ol>

            <div className="created-status"><span><i>✦</i><b>{balance.toLocaleString("fr-FR")} Stars</b><small>Ton solde</small></span><span><i>{linked ? "✓" : "↗"}</i><b>{linked ? "Compte lié" : "Liaison requise"}</b><small>{linked ? "Minecraft vérifié" : "Pour la boutique et les votes"}</small></span></div>

            {!linked && <section className="minecraft-link-action" aria-labelledby="minecraft-link-title">
              <div className="link-action-heading"><span>02</span><div><small>DERNIÈRE ÉTAPE</small><h4 id="minecraft-link-title">Confirme ton compte en jeu</h4><p>Génère une commande unique, puis colle-la dans le chat du serveur.</p></div></div>
              {!command ? <button className="link-primary-button" type="button" onClick={createCode} disabled={loading}>{loading ? "Génération…" : "Générer ma commande /link"}<span>→</span></button> : <div className="link-command-flow">
                <div className="link-command-label"><span>Commande personnelle</span><small>Expire dans 10 minutes</small></div>
                <div className="link-command-row"><code>{command}</code><button type="button" onClick={copyCommand}>Copier</button></div>
                <ol><li><span>1</span><p>Rejoins <b>play.cobblestar-mc.fr</b></p></li><li><span>2</span><p>Colle la commande dans le chat</p></li><li><span>3</span><p>Cette page se validera automatiquement</p></li></ol>
                <button className="link-regenerate" type="button" onClick={createCode} disabled={loading}>Générer un autre code</button>
              </div>}
            </section>}

            {linked && account.minecraft.uuid && <div className="account-linked-panel"><span>✓</span><div><b>Connexion terminée</b><small>UUID {account.minecraft.uuid}</small></div></div>}
            {error && <div className="account-alert" role="alert" aria-live="polite"><span>!</span><div><b>La commande n’a pas pu être générée</b><p>{error}</p></div><button type="button" onClick={createCode} disabled={loading}>Réessayer</button></div>}
            <button className="account-logout" type="button" onClick={logout}>Se déconnecter</button>
          </div> : <>
            <div className="auth-tabs"><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Créer un compte</button><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Se connecter</button></div>
            <form className="auth-form" onSubmit={submit}><small>{mode === "register" ? "NOUVEAU DRESSEUR" : "BON RETOUR"}</small><h3>{mode === "register" ? "Créer ton espace" : "Connexion"}</h3>
              <label htmlFor="account-email">Adresse e-mail</label><input id="account-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@exemple.fr" />
              <label htmlFor="account-password">Mot de passe</label><input id="account-password" type="password" required minLength={mode === "register" ? 8 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? "8 caractères minimum" : "••••••••"} />
              {mode === "register" && <><label htmlFor="account-minecraft">Pseudo Minecraft</label><input id="account-minecraft" required minLength={3} maxLength={16} pattern="[A-Za-z0-9_]{3,16}" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Ton pseudo officiel" /><p className="auth-legal">Ce pseudo sera confirmé avec ton UUID quand tu utiliseras /link en jeu.</p></>}
              {error && <p className="lookup-error" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading ? "Patiente…" : mode === "register" ? "Créer mon compte" : "Se connecter"}</button>
            </form>
          </>}
        </div>
      </div>
    </section>
    <SiteFooter />
  </main>;
}
