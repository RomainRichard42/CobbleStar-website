"use client";
import { useState } from 'react';
import { accountAppearance, type AvatarAccount } from '../lib/account-avatar';

function Avatar({ account }: { account: AvatarAccount }) {
  const [index, setIndex] = useState(0);
  const { images, initial } = accountAppearance(account);
  const image = images[index];
  return <span className="account-avatar" aria-hidden="true">{image ? <img src={image.url} data-kind={image.kind} alt="" width="32" height="32" referrerPolicy="no-referrer" onError={() => setIndex(i => i + 1)}/> : initial}</span>;
}

export default function AccountLink({ account, mobile = false }: { account: AvatarAccount | null; mobile?: boolean }) {
  const appearance = accountAppearance(account);
  return <a className={mobile ? 'account-menu-link' : 'astral-account'} href="/compte/" aria-label={account ? `Mon compte — ${appearance.name}` : 'Mon compte'} title={account ? appearance.name : undefined}>
    {account && <Avatar key={appearance.images.map(image => image.url).join('|') + appearance.initial} account={account}/>}
    <span>Mon compte</span>
  </a>;
}
