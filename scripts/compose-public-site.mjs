import {cp,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await access(resolve(root,'public-astro/server/entry.mjs'));
await access(resolve(root,'out/admin/discord/index.html'));
await cp(resolve(root,'public-astro/client'),resolve(root,'out'),{recursive:true});
console.log('Astro public assets merged; Next account, shop and admin routes preserved.');
