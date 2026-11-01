const intentKey = 'cobblestar:discord-login-app';
type IntentStorage = Pick<Storage, 'setItem' | 'getItem' | 'removeItem'>;

export function rememberDiscordAppIntent(storage: IntentStorage, now = Date.now()) {
  storage.setItem(intentKey, String(now));
}

// An OAuth query string alone must never launch the app. Require a recent button
// click in this tab and a profile confirmed by the authenticated /api/me request.
export function takeDiscordAppIntent(result: string | null, accountVerified: boolean, storage: IntentStorage, now = Date.now()) {
  const value = storage.getItem(intentKey);
  storage.removeItem(intentKey);
  if (result !== 'connected' || !accountVerified || !value) return false;
  const startedAt = Number(value);
  return Number.isFinite(startedAt) && startedAt > 0 && now >= startedAt && now - startedAt <= 600_000;
}
