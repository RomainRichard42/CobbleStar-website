"use client";

import { useEffect, useState } from "react";

type GateState = "loading" | "signed-out" | "linked" | "code" | "error";

export default function MinecraftLinkGate({ open, onClose, context }: { open: boolean; onClose: () => void; context: "achat" | "vote" }) {
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<GateState>("loading");
  const [command, setCommand] = useState("");

  useEffect(() => {
    if (!open) return;
    void Promise.resolve().then(() => {
      setState("loading");
      setCommand("");
      return prepare();
    });
  }, [open]);

  async function prepare() {
    try {
      const me = await fetch("/api/me", { credentials: "include" });
      if (me.status === 401) return setState("signed-out");
      if (!me.ok) return setState("error");
      const profile = await me.json() as { user: { minecraft: { linked: boolean } } };
      if (profile.user.minecraft.linked) return setState("linked");
      const response = await fetch("/api/link/code", { method: "POST", credentials: "include" });
      if (!response.ok) return setState(response.status === 401 ? "signed-out" : "error");
      const data = await response.json() as { command: string };
      setCommand(data.command); setState("code");
    } catch { setState("error"); }
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(command); } catch { /* bouton de secours non bloquant */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  if (!open) return null;
  return <div className="checkout-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="link-gate-modal" role="dialog" aria-modal="true" aria-labelledby="link-gate-title">
      <button className="checkout-close" type="button" onClick={onClose} aria-label="Fermer">×</button>
      <div className="link-gate-status"><span>PREMIÈRE {context === "achat" ? "RECHARGE" : "PARTICIPATION"}</span><i>{state === "linked" ? "COMPTE LIÉ" : "VÉRIFICATION"}</i></div>
      <h2 id="link-gate-title">Confirme ton compte<br /><em>depuis le serveur.</em></h2>
      {state === "loading" && <div className="link-waiting"><span className="status-dot" /><div><b>Préparation de la vérification…</b><small>Quelques secondes suffisent.</small></div></div>}
      {state === "signed-out" && <><p>Connecte-toi d’abord à ton compte CobbleStar pour obtenir ta commande personnelle.</p><a className="link-account-cta" href="/compte/">Se connecter ou créer un compte <span>→</span></a></>}
      {state === "linked" && <><p>Ton UUID Minecraft est déjà associé. Tu es prêt pour {context === "achat" ? "les futures recharges de Stars" : "les futures récompenses de vote"}.</p><div className="link-waiting"><span className="status-dot" /><div><b>Compte vérifié</b><small>Aucune nouvelle commande /link nécessaire.</small></div></div></>}
      {state === "code" && <><p>Cette vérification relie définitivement ton compte CobbleStar à ton UUID Minecraft. Elle ne sera demandée qu’une seule fois.</p><div className="link-command-card"><small>1 — REJOINS COBBLESTAR ET ÉCRIS</small><code>{command}</code><button type="button" onClick={copyCode}>{copied ? "Commande copiée ✓" : "Copier la commande"}</button></div><div className="link-waiting"><span className="status-dot" /><div><b>En attente de la commande en jeu</b><small>Le mod serveur confirmera automatiquement la liaison.</small></div></div></>}
      {state === "error" && <><p>La vérification est momentanément indisponible.</p><button className="link-account-cta" type="button" onClick={prepare}>Réessayer <span>→</span></button></>}
      <div className="link-gate-details"><span><b>Un seul lien</b><small>Valable pour la boutique et les votes</small></span><span><b>10 minutes</b><small>Le code expire automatiquement</small></span><span><b>UUID sécurisé</b><small>Ton pseudo pourra changer</small></span></div>
    </section>
  </div>;
}
