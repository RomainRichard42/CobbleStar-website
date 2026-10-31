"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { VOTE_FAQ } from "../lib/faq";
import { accountAppearance, type AvatarAccount } from "../lib/account-avatar";
import MinecraftLinkGate from "../components/MinecraftLinkGate";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import FaqSection from "../components/FaqSection";
import FaqStructuredData from "../components/FaqStructuredData";

type Site = { id:string; name:string; intervalMinutes:number; enabled:boolean; verificationEnabled:boolean; url:string|null; availableAt:string|null; accent:string };
type Board = { sites:Site[]; leaderboard:{rank:number;username:string;votes:number;keysWon:number}[]; player:{username:string|null;linked:boolean;votes:number;keysWon:number;rank:number|null}|null; resetAt:string };
type Attempt = {id:string;url:string;expiresAt:string};
const messages:Record<string,string> = {
  AUTH_REQUIRED:"Reconnecte-toi pour continuer.", MINECRAFT_LINK_REQUIRED:"Lie ton compte Minecraft avant de voter.",
  VOTE_PROVIDER_COOLDOWN:"L’annuaire indique un vote récent. Attends son prochain créneau pour recommencer ici.",
  VOTE_COOLDOWN_ACTIVE:"Tu as déjà reçu la récompense de ce créneau.", VOTE_ALREADY_RECORDED:"Ce vote a déjà été comptabilisé.",
  VOTE_ATTEMPT_EXPIRED:"Ce lien a expiré. Prépare un nouveau vote.", VOTE_NETWORK_CHANGED:"Ta connexion a changé. Prépare un nouveau vote depuis le même réseau.",
  VOTE_USERNAME_MISMATCH:"Le pseudo saisi sur l’annuaire ne correspond pas à ton compte Minecraft.",
  VOTE_ACCOUNT_CHANGED:"Ton compte Minecraft a changé. Recharge la page.",
};
const delay = (minutes:number) => minutes === 1440 ? "24 heures" : minutes === 90 ? "1 h 30" : `${minutes/60} heures`;
const remaining = (date:string,now:number) => { const minutes=Math.max(1,Math.ceil((new Date(date).getTime()-now)/60000)); return minutes>=60?`${Math.floor(minutes/60)} h ${String(minutes%60).padStart(2,"0")}`:`${minutes} min`; };

export default function VotePage() {
  const [account,setAccount]=useState<AvatarAccount|null>(null), [board,setBoard]=useState<Board|null>(null);
  const [loading,setLoading]=useState(true), [loadError,setLoadError]=useState(false), [linkOpen,setLinkOpen]=useState(false);
  const [attempts,setAttempts]=useState<Record<string,Attempt>>({}), [busy,setBusy]=useState<string|null>(null), [notes,setNotes]=useState<Record<string,string>>({});
  const [now,setNow]=useState(0), [imageIndex,setImageIndex]=useState(0);
  const appearance=accountAppearance(account), avatar=appearance.images[imageIndex];
  async function refresh() {
    const [me,votes]=await Promise.all([fetch('/api/me',{credentials:'include',cache:'no-store'}),fetch('/api/votes',{credentials:'include',cache:'no-store'})]);
    if (!votes.ok || (!me.ok && me.status!==401)) throw new Error();
    setAccount(me.ok?(await me.json()).user:null); setBoard(await votes.json()); setNow(Date.now()); setLoadError(false);
  }
  useEffect(()=> { void refresh().catch(()=>setLoadError(true)).finally(()=>setLoading(false)); const timer=setInterval(()=>setNow(Date.now()),30000); return()=>clearInterval(timer); },[]);
  async function vote(site:Site,check:boolean) {
    setBusy(site.id); setNotes(p=>({...p,[site.id]:""}));
    try {
      const res=await fetch(`/api/votes/${check?'check':'start'}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(check?{attemptId:attempts[site.id].id}:{siteId:site.id})});
      const data=await res.json();
      if(!res.ok) { if(data.error==='VOTE_ATTEMPT_EXPIRED'||data.error==='VOTE_NETWORK_CHANGED')setAttempts(p=>{const n={...p};delete n[site.id];return n;}); throw new Error(messages[data.error]||"La vérification est indisponible pour le moment. Réessaie dans quelques instants."); }
      if(check) {
        setNotes(p=>({...p,[site.id]:data.verified?"Vote validé : 1 clé Vote réservée pour ton joueur. Livraison à ta prochaine connexion en jeu.":"Le vote n’est pas encore confirmé. Termine-le sur l’annuaire, puis vérifie à nouveau."}));
        if(data.verified){setAttempts(p=>{const n={...p};delete n[site.id];return n;});await refresh().catch(()=>setLoadError(true));}
      } else setAttempts(p=>({...p,[site.id]:data.attempt}));
    } catch(e) { setNotes(p=>({...p,[site.id]:e instanceof Error&&e.message?e.message:"Impossible de vérifier le vote pour le moment."})); }
    finally {setBusy(null);}
  }
  return <main className="vote-board-page vote-live-page">
    <SiteHeader />
    <section className="vote-board-hero" id="contenu"><div className="vote-board-intro"><span className="kicker">SOUTENIR COBBLESTAR</span><h1>Un vote.<br/><em>Une clé pour ton aventure.</em></h1><p>Fais découvrir CobbleStar à d’autres dresseurs. Chaque vote confirmé depuis cette page rapporte une clé pour la machine Vote.</p><p className="vote-opening">Le serveur est en préouverture. Les clés validées restent en attente jusqu’à ta connexion en jeu.</p></div><div className="vote-board-art" aria-hidden="true"><img src="/astral/assets/riding.webp" alt=""/><span>COBBLESTAR · COBBLEMON FR</span></div></section>
    <section className="vote-board-layout" aria-labelledby="vote-dashboard-title">
      <aside className="vote-board-sidebar">
        <div className="vote-profile-card"><div className="vote-profile-main"><span className="vote-profile-avatar">{avatar?<img src={avatar.url} alt="" onError={()=>setImageIndex(i=>i+1)}/>:appearance.initial}</span><div><h2 id="vote-dashboard-title">{loading?"Chargement…":board?.player?.username||"Ton profil de vote"}</h2><p>{board?.player?.linked?"Ton compte Minecraft est lié.":"Connecte ton compte pour recevoir tes clés."}</p></div></div>
          {board?.player?.linked?<dl className="vote-totals"><div><dt>Votes ce mois</dt><dd>{board.player.votes}</dd></div><div><dt>Clés gagnées</dt><dd>{board.player.keysWon}</dd></div><div><dt>Classement</dt><dd>{board.player.rank?`#${board.player.rank}`:'—'}</dd></div></dl>:!loading&&<>{!account?<Link className="vote-profile-action" href="/compte/">Se connecter avec Discord →</Link>:<button className="vote-profile-action" onClick={()=>setLinkOpen(true)}>Lier Minecraft →</button>}</>}
        </div>
        <section className="vote-how" aria-labelledby="vote-how-title"><h2 id="vote-how-title">Comment voter ?</h2><ol><li><span>1</span><div><b>Prépare ton vote</b><p>Ton compte Minecraft doit être lié. Chaque annuaire a son propre délai.</p></div></li><li><span>2</span><div><b>Vote sur l’annuaire</b><p>Ouvre le lien proposé et utilise ton pseudo Minecraft exact.</p></div></li><li><span>3</span><div><b>Confirme ici</b><p>Reviens sur cette page et clique sur « Vérifier mon vote ». Ta clé sera livrée en jeu.</p></div></li></ol><Link href="/wiki/caisses/">Découvrir la machine Vote →</Link></section>
      </aside>
      <div className="vote-board-main"><div className="vote-section-heading"><div><h2>Ta tournée de vote.</h2></div><p>Une clé Vote par annuaire et par créneau validé. Aucun achat nécessaire.</p></div>
        {loadError&&<p role="alert">Les votes ne se chargent pas. <button onClick={()=>void refresh().catch(()=>setLoadError(true))}>Réessayer</button></p>}
        {loading&&<p role="status">Chargement des annuaires…</p>}
        <div className="vote-sites vote-sites-readable">{board?.sites.map(site=>{const a=attempts[site.id],waiting=!!site.availableAt&&new Date(site.availableAt).getTime()>now;return <article className={`vote-site tone-${site.accent}`} key={site.id}>
          <header><span>{site.name}</span><small>{delay(site.intervalMinutes)}</small></header><div className="vote-site-copy"><h3>{site.name}</h3><div className="vote-key-reward"><img src="/shop/tokens/vote.png" width="64" height="64" alt=""/><strong>1 clé Vote</strong></div><p>Un vote toutes les {delay(site.intervalMinutes)}.</p></div>
          <div className="vote-action">
            {!site.verificationEnabled?<><span>Récompenses en préparation sur cet annuaire.</span>{site.url&&<a href={site.url} target="_blank" rel="noopener noreferrer">Voir la fiche ↗</a>}</>:!board.player?.linked?<span>Connecte et lie ton compte pour voter.</span>:waiting?<span>Prochain vote dans {remaining(site.availableAt!,now)}</span>:a?<><a className="vote-primary" href={a.url} target="_blank" rel="noopener noreferrer">Ouvrir l’annuaire ↗</a><button disabled={busy!==null} onClick={()=>void vote(site,true)}>{busy===site.id?"Vérification…":"Vérifier mon vote"}</button><small>Lien valable jusqu’à {new Date(a.expiresAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}.</small></>:<button className="vote-primary" disabled={busy!==null} onClick={()=>void vote(site,false)}>{busy===site.id?"Préparation…":"Préparer mon vote →"}</button>}
            {notes[site.id]&&<p className="vote-feedback" role="status">{notes[site.id]}</p>}
          </div></article>;})}</div>
        <section className="vote-ranking" aria-labelledby="ranking-title"><h2 id="ranking-title">Les dresseurs du mois</h2>{!board?<p>Chargement du classement…</p>:board.leaderboard.length?<ol>{board.leaderboard.map(p=><li key={p.rank}><span>#{p.rank}</span><b>{p.username}</b><span>{p.votes} vote{p.votes>1?'s':''}</span></li>)}</ol>:<p>Le premier vote confirmé lancera le classement du mois.</p>}<p>Les votes sont comptés du premier au dernier jour du mois, en UTC.</p></section>
      </div>
    </section>
    <FaqSection title="Questions sur le vote CobbleStar" id="faq-vote" items={VOTE_FAQ}/><FaqStructuredData faqItems={VOTE_FAQ} pageUrl="/vote/"/>
    <MinecraftLinkGate open={linkOpen} onClose={()=>setLinkOpen(false)} context="vote"/><SiteFooter/>
  </main>;
}
