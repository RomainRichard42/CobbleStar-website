export type AvatarAccount = {
  discord?: { id?: string; username?: string | null; globalName?: string | null; avatarUrl?: string | null } | null;
  minecraft?: { username?: string | null; uuid?: string | null; linked?: boolean };
};

export function accountAppearance(account: AvatarAccount | null) {
  const minecraft = account?.minecraft;
  const name = (minecraft?.linked && minecraft.username) || account?.discord?.globalName || account?.discord?.username || 'Dresseur';
  const images: { url: string; kind: 'minecraft' | 'discord' }[] = [];
  const uuid = minecraft?.uuid?.replaceAll('-', '').toLowerCase();
  if (minecraft?.linked && uuid && /^[a-f0-9]{32}$/i.test(uuid)) {
    images.push({ url: `/api/me/avatar?uuid=${uuid}`, kind: 'minecraft' });
  }
  const discord = account?.discord;
  if (discord?.avatarUrl && /^https:\/\/cdn\.discordapp\.com\/avatars\/[0-9]+\/[a-zA-Z0-9_]+\.png\?size=\d+$/.test(discord.avatarUrl)) {
    images.push({ url: discord.avatarUrl, kind: 'discord' });
  }
  if (discord) {
    const index = discord.id && /^\d+$/.test(discord.id) ? Number((BigInt(discord.id) >> BigInt(22)) % BigInt(6)) : 0;
    images.push({ url: `https://cdn.discordapp.com/embed/avatars/${index}.png`, kind: 'discord' });
  }
  return { name, initial: Array.from(name)[0].toUpperCase(), images };
}
