import test from 'node:test';
import assert from 'node:assert/strict';
import { observePlayer, starsLabel } from '../app/lib/player-session.ts';

test('zero Stars is distinct from an unavailable wallet', () => {
  assert.equal(starsLabel(0), '0');
  for (const value of [null, NaN, -1, Infinity, 1.5]) assert.equal(starsLabel(value), '—');
  assert.equal(starsLabel(1234).replace(/\s/g, ''), '1234');
});

test('wallet refreshes after purchases and stale requests cannot restore a signed-out balance', async () => {
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
  const window = Object.assign(new EventTarget(), { setInterval: () => 1, clearInterval: () => {} });
  globalThis.window = window;
  globalThis.document = Object.assign(new EventTarget(), { hidden: false });
  let user = { discord: { username: 'Test' } }, balance = 0, pendingWallet;
  globalThis.fetch = async url => {
    if (url === '/api/me') return { ok: Boolean(user), json: async () => ({ user }) };
    if (pendingWallet) return pendingWallet;
    return { ok: true, json: async () => ({ balance }) };
  };
  const snapshots = [];
  const stop = observePlayer((account, stars) => snapshots.push({ account, stars }));
  const tick = () => new Promise(resolve => setImmediate(resolve));
  try {
    await tick();
    assert.equal(snapshots.at(-1).stars, 0);
    balance = 2400;
    window.dispatchEvent(new Event('cobblestar:wallet-changed'));
    await tick();
    assert.equal(snapshots.at(-1).stars, 2400);
    let resolveWallet;
    pendingWallet = new Promise(resolve => { resolveWallet = resolve; });
    window.dispatchEvent(new Event('cobblestar:wallet-changed'));
    user = null;
    window.dispatchEvent(new Event('cobblestar:account-changed'));
    await tick();
    resolveWallet({ ok: true, json: async () => ({ balance: 9999 }) });
    await tick();
    assert.deepEqual(snapshots.at(-1), { account: null, stars: null });
    const count = snapshots.length;
    stop();
    window.dispatchEvent(new Event('focus'));
    await tick();
    assert.equal(snapshots.length, count);
  } finally { stop(); Object.assign(globalThis, previous); }
});
