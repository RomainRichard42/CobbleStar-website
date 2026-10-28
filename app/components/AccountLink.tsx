"use client";
import { useState } from 'react';
import { accountAppearance, type AvatarAccount } from '../lib/account-avatar';
import { starsLabel } from '../lib/player-session';

function Avatar({ account }: { account: AvatarAccount }) {
  const [index, setIndex] = useState(0);
  const { images, initial } = accountAppearance(account);
  const image = images[index];
  return <span className="account-avatar" aria-hidden="true">{image ? <img src={image.url} data-kind={image.kind} alt="" width="32" height="32" referrerPolicy="no-referrer" onError={() => setIndex(i => i + 1)}/> : initial}</span>;
}

export default function AccountLink({ account, balance, mobile = false }: { account: AvatarAccount | null; balance: number | null; mobile?: boolean }) {
  const appearance = accountAppearance(account);
  return <div className={`player-profile${mobile ? ' player-profile-mobile' : ''}`}>
    <a className={mobile ? 'account-menu-link' : 'astral-account'} href="/compte/" aria-label={account ? `Mon compte — ${appearance.name}` : 'Mon compte'} title={account ? appearance.name : undefined}>
    {account && <Avatar key={appearance.images.map(image => image.url).join('|') + appearance.initial} account={account}/>}
    <span className="player-identity"><strong>{account ? appearance.name : 'Mon compte'}</strong><small>{account ? 'Mon compte' : 'Connexion Discord'}</small></span>
    </a>
    {account && <a className="player-balance" href="/boutique/" aria-label={balance === null ? 'Solde de Stars indisponible — Boutique' : `Solde : ${starsLabel(balance)} Stars — Boutique`}><img src="/astral/assets/stars-96-v3.webp" alt="" width="32" height="26"/><span><b>{starsLabel(balance)}</b> Stars</span></a>}
  </div>;
}
