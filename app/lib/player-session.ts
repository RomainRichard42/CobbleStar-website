import type { AvatarAccount } from './account-avatar';

export function starsLabel(balance: number | null) {
  return balance !== null && Number.isSafeInteger(balance) && balance >= 0 ? balance.toLocaleString('fr-FR') : '—';
}

export function observePlayer(update: (account: AvatarAccount | null, balance: number | null) => void) {
  let account: AvatarAccount | null = null, balance: number | null = null;
  let disposed = false, generation = 0, walletRequest = 0;
  const emit = () => { if (!disposed) update(account, balance); };
  async function loadWallet() {
    if (!account || disposed) return;
    const request = ++walletRequest, session = generation;
    try {
      const response = await fetch('/api/wallet', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Wallet unavailable');
      const data = await response.json();
      if (disposed || request !== walletRequest || session !== generation) return;
      balance = Number.isSafeInteger(data.balance) && data.balance >= 0 ? data.balance : null;
    } catch {
      if (disposed || request !== walletRequest || session !== generation) return;
      balance = null;
    }
    emit();
  }
  async function loadAccount() {
    const request = ++generation;
    try {
      const response = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
      const data = response.ok ? await response.json() : null;
      if (disposed || request !== generation) return;
      account = data?.user ?? null;
      balance = null;
      emit();
      await loadWallet();
    } catch {
      if (disposed || request !== generation) return;
      account = null; balance = null; emit();
    }
  }
  const visible = () => { if (!document.hidden) void loadAccount(); };
  const pageshow = (event: PageTransitionEvent) => { if (event.persisted) void loadAccount(); };
  void loadAccount();
  const interval = window.setInterval(() => { if (!document.hidden) void loadWallet(); }, 30000);
  window.addEventListener('cobblestar:account-changed', loadAccount);
  window.addEventListener('cobblestar:wallet-changed', loadWallet);
  window.addEventListener('focus', loadAccount);
  window.addEventListener('pageshow', pageshow);
  document.addEventListener('visibilitychange', visible);
  return () => {
    disposed = true;
    window.clearInterval(interval);
    window.removeEventListener('cobblestar:account-changed', loadAccount);
    window.removeEventListener('cobblestar:wallet-changed', loadWallet);
    window.removeEventListener('focus', loadAccount);
    window.removeEventListener('pageshow', pageshow);
    document.removeEventListener('visibilitychange', visible);
  };
}
