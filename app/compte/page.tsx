"use client";

import { FormEvent, useEffect, useState } from "react";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";

type MinecraftProfile = { id: string; name: string };
type Account = { id: string; email: string; minecraft: { username: string | null; uuid: string | null; linked: boolean } };

const errorLabels: Record<string, string> = {
  INVALID_CREDENTIALS: "Adresse e-mail ou mot de passe incorrect.",
  EMAIL_ALREADY_USED: "Cette adresse e-mail possède déjà un compte.",
  MINECRAFT_ACCOUNT_NOT_FOUND: "Ce compte Minecraft officiel est introuvable.",
  INVALID_INPUT: "Vérifie les informations saisies.",
  ALREADY_LINKED: "Ce compte Minecraft est déjà lié.",
};

export default function ComptePage() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<MinecraftProfile | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState(0);
  const [command, setCommand] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const meResponse = await fetch("/api/me", { credentials: "include" });
        if (!meResponse.ok) throw new Error("AUTH_REQUIRED");
        const data = await meResponse.json() as { user: Account };
        const walletResponse = await fetch("/api/wallet", { credentials: "include" });
        if (!walletResponse.ok) throw new Error("WALLET_UNAVAILABLE");
        const wallet = await walletResponse.json() as { balance: number };
        if (!cancelled) {
          setAccount(data.user);
          setBalance(wallet.balance);
        }
      } catch {
        if (!cancelled) setAccount(null);
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }
    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, { credentials: "include", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    const data = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(data.error || "INTERNAL_ERROR");
    return data;
  }

  async function findMinecraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!email.includes("@") || password.length < 8) return setError("Utilise une adresse e-mail valide et un mot de passe d’au moins 8 caractères.");
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username.trim())) return setError("Entre un pseudo Minecraft valide de 3 à 16 caractères.");
    setLoading(true);
    try {
      const response = await fetch(`/api/minecraft-profile?name=${encodeURIComponent(username.trim())}`);
      const data = await response.json() as MinecraftProfile & { error?: string };
      if (!response.ok) throw new Error(data.error || "Compte Minecraft introuvable.");
      setProfile({ id: data.id, name: data.name });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La vérification est indisponible.");
    } finally { setLoading(false); }
  }

  async function register() {
    if (!profile) return;
    setLoading(true); setError("");
    try {
      const data = await api<{ user: Account }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, minecraftUsername: profile.name }) });
      setAccount(data.user); setBalance(0); setPassword("");
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR";
      setError(errorLabels[code] || "Impossible de créer le compte pour le moment.");
    } finally { setLoading(false); }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const data = await api<{ user: Account }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setAccount(data.user); setPassword("");
      const wallet = await api<{ balance: number }>("/api/wallet");
      setBalance(wallet.balance);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR";
      setError(errorLabels[code] || "Connexion temporairement indisponible.");
    } finally { setLoading(false); }
  }

  async function createLinkCode() {
    setLoading(true); setError("");
    try {
      const data = await api<{ command: string }>("/api/link/code", { method: "POST" });
      setCommand(data.command);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INTERNAL_ERROR";
      setError(errorLabels[code] || "Impossible de générer le code.");
    } finally { setLoading(false); }
  }

  async function logout() {
    await api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    setAccount(null); setCommand(""); setProfile(null); setMode("login");
  }

  return <main>
    <PageHero eyebrow="ESPACE JOUEUR" title="Ton compte." accent="Toute ton aventure." description="Un seul espace pour ton profil Minecraft, tes Stars, tes achats et tes récompenses de vote." badge="SÉCURISÉ" />
    <section className="account-page">
      <div className="account-layout">
        <div className="account-promise"><span className="kicker">COMPTE COBBLESTAR</span><h2>Commence par<br /><em>créer ton espace.</em></h2><p>Ton compte du site est indépendant de Microsoft, puis associé définitivement à ton UUID avec une commande en jeu.</p><div className="account-benefits"><span><b>✦</b><i><strong>Portefeuille de Stars</strong><small>Solde et historique au même endroit</small></i></span><span><b>◈</b><i><strong>Profil Minecraft lié</strong><small>Ton UUID reste reconnu si ton pseudo change</small></i></span><span><b>✓</b><i><strong>Votes automatiquement attribués</strong><small>Plus besoin de ressaisir ton pseudo</small></i></span></div></div>
        <div className="auth-card">
          {checkingSession ? <div className="account-created-preview"><small>CHARGEMENT</small><h3>Vérification de ta session…</h3></div> : account ? <div className="account-created-preview"><div className="created-check">✓</div><small>COMPTE COBBLESTAR</small><h3>Bienvenue, {account.minecraft.username || "Dresseur"}.</h3><p>{account.minecraft.linked ? "Ton compte est lié au serveur." : "Il reste à confirmer ton identité directement en jeu."}</p><div className="created-status"><span><i>✦</i><b>{balance.toLocaleString("fr-FR")} Stars</b><small>Solde disponible</small></span><span><i>{account.minecraft.linked ? "✓" : "2"}</i><b>Minecraft</b><small>{account.minecraft.linked ? "UUID lié" : "Liaison requise"}</small></span></div>{!account.minecraft.linked && <div className="created-actions"><button type="button" onClick={createLinkCode} disabled={loading}>{loading ? "Génération…" : "Générer ma commande /link"}</button>{command && <code>{command}</code>}</div>}{error && <p className="lookup-error" role="alert">{error}</p>}<div className="created-actions"><a href="/boutique/">Voir la boutique</a><button type="button" onClick={logout}>Se déconnecter</button></div></div> : <>
            <div className="auth-tabs"><button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setProfile(null); setError(""); }} type="button">Créer un compte</button><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setProfile(null); setError(""); }} type="button">Se connecter</button></div>
            {mode === "login" ? <form className="auth-form" onSubmit={login}><small>HEUREUX DE TE REVOIR</small><h3>Connexion</h3><label htmlFor="login-email">Adresse e-mail</label><input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@exemple.fr" autoComplete="email" /><label htmlFor="login-password">Mot de passe</label><input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" />{error && <p className="lookup-error" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button></form> : <form className="auth-form" onSubmit={findMinecraft}>
              <small>CRÉE TON PROFIL JOUEUR</small><h3>Bienvenue sur CobbleStar</h3>
              <label htmlFor="register-email">Adresse e-mail</label><input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@exemple.fr" autoComplete="email" />
              <label htmlFor="register-password">Mot de passe</label><input id="register-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
              <label htmlFor="register-minecraft">Pseudo Minecraft</label><div className="auth-minecraft-field"><input id="register-minecraft" value={username} onChange={(event) => { setUsername(event.target.value); setProfile(null); }} placeholder="Ton pseudo officiel" autoComplete="off" maxLength={16} /><button type="submit" disabled={loading}>{loading ? "Recherche…" : "Vérifier"}</button></div>
              {error && <p className="lookup-error" role="alert">{error}</p>}
              {profile && <div className="auth-profile-found"><img src={`https://mc-heads.net/avatar/${profile.id}/72`} alt={`Avatar de ${profile.name}`} /><span><small>COMPTE MINECRAFT TROUVÉ</small><b>{profile.name}</b><em>La propriété sera confirmée en jeu.</em></span><button type="button" onClick={register} disabled={loading}>{loading ? "Création…" : "Créer mon compte"}</button></div>}
              <p className="auth-legal">En créant un compte, tu acceptes les conditions d’utilisation et la politique de confidentialité de CobbleStar.</p>
            </form>}
          </>}
        </div>
      </div>
      <div className="link-explanation"><div><span className="kicker">PREMIÈRE ACTION PROTÉGÉE</span><h2>Une commande.<br /><em>Une seule fois.</em></h2><p>Le site génère un code temporaire. Rejoins le serveur et exécute la commande affichée pour associer ton UUID.</p></div><div className="link-demo"><small>COMMANDE À EFFECTUER EN JEU</small><code>/link CS-XXX-XXX</code><span><i className="status-dot" />Validation automatique par le serveur</span></div><div className="link-explanation-note"><b>Après la validation</b><p>Ton compte, ton UUID, ton portefeuille et tes récompenses sont liés définitivement.</p></div></div>
    </section>
    <SiteFooter />
  </main>;
}
