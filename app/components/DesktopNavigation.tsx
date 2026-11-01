"use client";
import { useEffect, useRef } from 'react';
import { bindDesktopMenu, desktopLinks, desktopLinkActive, serverLinks } from '../lib/desktop-navigation';

export default function DesktopNavigation({ pathname }: { pathname: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (ref.current) return bindDesktopMenu(ref.current); }, []);
  return <nav className="astral-desktop" aria-label="Navigation principale">
    <details className="desktop-discover" ref={ref}>
      <summary>Le serveur <span aria-hidden="true">⌄</span></summary>
      <div className="desktop-mega">
        <div className="desktop-mega-intro"><h2>Deux mondes<br/>à explorer.</h2><p>Astéria, Nébélia et une place pour ton équipe.</p><a href="/roadmap/">Découvrir le serveur →</a></div>
        <div className="desktop-mega-links">{serverLinks.map(link => <a key={link.href} href={link.href} target={link.href.startsWith('https://')?'_blank':undefined} rel={link.href.startsWith('https://')?'noopener noreferrer':undefined}><strong>{link.title}</strong><small>{link.detail}</small></a>)}</div>
      </div>
    </details>
    {desktopLinks.map(([href, label]) => <a key={href} href={href} target={href.startsWith('https://')?'_blank':undefined} rel={href.startsWith('https://')?'noopener noreferrer':undefined} aria-label={href.startsWith('https://')?'Ouvrir Discord pour rejoindre CobbleStar':undefined} aria-current={desktopLinkActive(pathname, href) ? 'page' : undefined}>{label}</a>)}
  </nav>;
}
