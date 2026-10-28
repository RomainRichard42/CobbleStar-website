import test from 'node:test';
import assert from 'node:assert/strict';
import { accountAppearance } from '../app/lib/account-avatar.ts';

const uuid = '069a79f4-44e9-4726-a5be-fca90e38aaf5';
const discord = { id: '1562050620045660212', username: 'test', avatarUrl: 'https://cdn.discordapp.com/avatars/1562050620045660212/abc123.png?size=128' };
test('linked Minecraft skin takes priority with Discord fallbacks', () => {
  const appearance = accountAppearance({ minecraft: { uuid, linked: true, username: 'Test' }, discord });
  assert.equal(appearance.name, 'Test');
  assert.deepEqual(appearance.images.map(image => image.kind), ['minecraft', 'discord', 'discord']);
  assert.equal(appearance.images[0].url, 'https://mc-heads.net/avatar/069a79f444e94726a5befca90e38aaf5/64');
});
test('unlinked Minecraft identity never overrides Discord', () => {
  const appearance = accountAppearance({ minecraft: { uuid, linked: false, username: 'Unverified' }, discord });
  assert.equal(appearance.name, 'test');
  assert.equal(appearance.images[0].url, discord.avatarUrl);
});
test('missing or invalid images have a safe fallback', () => {
  assert.deepEqual(accountAppearance(null).images, []);
  const appearance = accountAppearance({ minecraft: { uuid: '../../bad', linked: true }, discord: { ...discord, avatarUrl: 'https://untrusted.example/avatar.png' } });
  assert.equal(appearance.images.length, 1);
  assert.match(appearance.images[0].url, /^https:\/\/cdn\.discordapp\.com\/embed\/avatars\/[0-5]\.png$/);
});
