"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "./access.module.css";

type WikiAdmin = { email: string; createdAt: string | null; bootstrap: boolean };

export default function WikiAdminAccessPage() {
  const [admins, setAdmins] = useState<WikiAdmin[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("CHARGEMENT DES ACCÈS…");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/wiki/admins", { credentials: "include", cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 401 ? "Connecte-toi d’abord à ton compte CobbleStar." : "Ton compte n’est pas administrateur du wiki.");
    const data = await response.json() as { admins: WikiAdmin[]; currentEmail: string };
    setAdmins(data.admins); setCurrentEmail(data.currentEmail); setStatus(`${data.admins.length} ADMINISTRATEUR(S)`);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/wiki/admins", { credentials: "include", cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 401 ? "Connecte-toi d’abord à ton compte CobbleStar." : "Ton compte n’est pas administrateur du wiki.");
      return response.json() as Promise<{ admins: WikiAdmin[]; currentEmail: string }>;
    }).then((data) => { if (active) { setAdmins(data.admins); setCurrentEmail(data.currentEmail); setStatus(`${data.admins.length} ADMINISTRATEUR(S)`); } }).catch((error: Error) => { if (active) setStatus(error.message.toUpperCase()); });
    return () => { active = false; };
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault(); if (!email.trim()) return; setBusy(true); setStatus("AJOUT EN COURS…");
    try {
      const response = await fetch("/api/wiki/admins", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
      if (!response.ok) throw new Error("Cette adresse n’a pas pu être ajoutée.");
      setEmail(""); await load(); setStatus("ACCÈS AJOUTÉ");
    } catch (error) { setStatus((error as Error).message.toUpperCase()); } finally { setBusy(false); }
  }

  async function remove(admin: WikiAdmin) {
    if (admin.bootstrap || !window.confirm(`Retirer l’accès wiki de ${admin.email} ?`)) return;
    setBusy(true); setStatus("RETRAIT EN COURS…");
    try {
      const response = await fetch(`/api/wiki/admins/${encodeURIComponent(admin.email)}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error("Cet accès n’a pas pu être retiré.");
      await load(); setStatus("ACCÈS RETIRÉ");
    } catch (error) { setStatus((error as Error).message.toUpperCase()); } finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <header><div className={styles.mark}>✦</div><p><small>COBBLESTAR · STUDIO DU WIKI</small><b>GESTION DES ACCÈS</b></p><span>{status}</span><Link href="/wiki/admin/">← RETOUR AU STUDIO</Link></header>
    <section className={styles.content}>
      <article className={styles.intro}><small>ADMINISTRATION</small><h1>Qui peut modifier<br/><em>le wiki ?</em></h1><p>Ajoute une adresse e-mail utilisée par un compte CobbleStar. La personne pourra gérer les brouillons, publier les articles et ajouter d’autres administrateurs.</p><aside><b>PROTECTION DU COMPTE PRINCIPAL</b><p>L’accès initial de Romain est permanent et ne peut pas être supprimé depuis cette page.</p></aside></article>
      <article className={styles.panel}>
        <form onSubmit={add}><label>AJOUTER UN ADMINISTRATEUR<div><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="adresse@email.fr"/><button disabled={busy}>AJOUTER L’ACCÈS</button></div><small>L’adresse peut être ajoutée avant la création du compte ; elle sera reconnue dès la connexion.</small></label></form>
        <header><b>ADMINISTRATEURS ACTUELS</b><span>{admins.length} COMPTE(S)</span></header>
        <div className={styles.rows}>{admins.map((admin) => <div key={admin.email}><span className={styles.avatar}>{admin.email.slice(0, 1).toUpperCase()}</span><p><b>{admin.email}</b><small>{admin.bootstrap ? "ADMINISTRATEUR PRINCIPAL" : admin.email === currentEmail ? "TON COMPTE" : "AJOUTÉ DEPUIS LE STUDIO"}</small></p><i className={admin.bootstrap ? styles.locked : styles.active}>{admin.bootstrap ? "PROTÉGÉ" : "ACTIF"}</i><button disabled={busy || admin.bootstrap} onClick={() => void remove(admin)}>{admin.bootstrap ? "◆" : "RETIRER"}</button></div>)}</div>
        {!admins.length && <p className={styles.empty}>Aucun accès ne peut être affiché. Vérifie ta connexion.</p>}
      </article>
    </section>
  </main>;
}
