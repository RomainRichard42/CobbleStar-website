"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Public destinations use Astro document navigation. */
import { useEffect, useRef } from 'react';
import AccountLink from './AccountLink';
import type { AvatarAccount } from '../lib/account-avatar';
import { bindMobileMenu, mobileLinks } from '../lib/mobile-navigation';

export default function MobileMenu({ account, balance, pathname }: { account: AvatarAccount | null; balance: number | null; pathname: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (ref.current) return bindMobileMenu(ref.current); }, []);
  return <details className="astral-menu player-menu" ref={ref}>
    <summary>Menu <span className="menu-glyph" aria-hidden="true"><i/><i/></span></summary>
    <button className="menu-backdrop" data-menu-close tabIndex={-1} aria-label="Fermer le menu"/>
    <nav className="player-menu-panel" aria-label="Navigation mobile">
      <div className="menu-heading"><a href="/">COBBLE<span>STAR</span><small>Retour à l’accueil ↗</small></a><button type="button" data-menu-close aria-label="Fermer le menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>
      <AccountLink account={account} balance={balance} mobile/>
      <a className="menu-shop-card" href="/boutique/"><img src="/astral/assets/stars-button-v3.webp" alt="" width="96" height="72"/><span><strong>Boutique</strong><small>Stars · Grades · Cosmédex</small></span><b aria-hidden="true">↗</b></a>
      <div className="menu-destinations">{mobileLinks.map(link=><a key={link.href} href={link.href} aria-current={pathname===link.href?'page':undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={link.icon}/></svg><strong>{link.title}</strong><small>{link.detail}</small></a>)}</div>
      <a className="menu-discord" href="https://discord.gg/Sd387Ky4M"><span>Rejoindre le Discord</span><b aria-hidden="true">↗</b></a>
      <p className="menu-opening"><span aria-hidden="true"/>Ouverture à venir</p>
    </nav>
  </details>;
}
