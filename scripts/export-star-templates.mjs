// Export only native editing assets from an explicitly supplied official Cobblemon JAR.
// Run after npm run build:api. No server configuration or player data is included.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { inflateRawSync, deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { zipAssets, validateStar } from '../api/dist/star-assets.js';
import sharp from 'sharp';

const jar = readFileSync(process.argv[2] ?? '');
const output = new URL('../api/star-templates/', import.meta.url);
mkdirSync(output, { recursive: true });
const entries = new Map();
let end = jar.length - 22;
while (end >= Math.max(0, jar.length - 65557) && jar.readUInt32LE(end) !== 0x06054b50) end--;
if (end < 0) throw new Error('Invalid JAR directory');
let offset = jar.readUInt32LE(end + 16);
for (let i = 0; i < jar.readUInt16LE(end + 10); i++) {
  if (jar.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid JAR entry');
  const length = jar.readUInt16LE(offset + 28), name = jar.toString('utf8', offset + 46, offset + 46 + length);
  entries.set(name, { method: jar.readUInt16LE(offset + 10), size: jar.readUInt32LE(offset + 20), at: jar.readUInt32LE(offset + 42) });
  offset += 46 + length + jar.readUInt16LE(offset + 30) + jar.readUInt16LE(offset + 32);
}
function bytes(path) {
  const entry = entries.get(path);
  if (!entry) throw new Error(`Missing native asset: ${path}`);
  const start = entry.at + 30 + jar.readUInt16LE(entry.at + 26) + jar.readUInt16LE(entry.at + 28);
  const data = jar.subarray(start, start + entry.size);
  return entry.method === 8 ? inflateRawSync(data, { maxOutputLength: 8 * 1024 * 1024 }) : data;
}
const json = path => JSON.parse(bytes(path).toString());
const mod = json('fabric.mod.json');
if (!mod.version.startsWith('1.8.0')) throw new Error('This exporter targets Cobblemon 1.8.0');
const models = new Map([...entries.keys()].filter(p => p.startsWith('assets/cobblemon/bedrock/pokemon/models/') && p.endsWith('.geo.json')).map(p => [basename(p, '.json'), p]));
const french = json('assets/cobblemon/lang/fr_fr.json');
const license = readFileSync(new URL('../api/licenses/Cobblemon.txt', import.meta.url));
const rows = new Map();
const invalid=[];
function crc(data) { let c=0xffffffff; for (const b of data) { c^=b; for(let j=0;j<8;j++) c=(c>>>1)^((c&1)?0xedb88320:0); } return (c^0xffffffff)>>>0; }
function chunk(type, data) { const name=Buffer.from(type), out=Buffer.alloc(data.length+12); out.writeUInt32BE(data.length); name.copy(out,4); data.copy(out,8); out.writeUInt32BE(crc(Buffer.concat([name,data])),data.length+8); return out; }
function blankPng(w,h) { const head=Buffer.alloc(13); head.writeUInt32BE(w); head.writeUInt32BE(h,4); head[8]=8; head[9]=6; return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',head),chunk('IDAT',deflateSync(Buffer.alloc((w*4+1)*h))),chunk('IEND',Buffer.alloc(0))]); }
for (const path of [...entries.keys()].sort()) {
  if (!path.startsWith('assets/cobblemon/bedrock/pokemon/resolvers/') || !path.endsWith('.json')) continue;
  const resolver = json(path);
  if (resolver.order !== 0 || !/^cobblemon:[a-z0-9_]+$/.test(resolver.species)) continue;
  const v = resolver.variations.find(v => v.aspects?.length === 0 && v.model && v.poser);
  const modelPath = v && models.get(v.model.replace('cobblemon:', ''));
  if (!modelPath || typeof v.texture !== 'string' || !v.texture.startsWith('cobblemon:textures/')) continue;
  const species = resolver.species.slice(10), model = json(modelPath), geometry = model['minecraft:geometry'][0];
  const texturePath = v.texture.replace('cobblemon:', 'assets/cobblemon/');
  const name = french[`cobblemon.species.${species}.name`] ?? species;
  // Some official atlases use indexed PNG. Re-encode losslessly as RGBA for the
  // studio validator; preserve every pixel, UV coordinate and transparency value.
  const nativeTexture=bytes(texturePath);
  const texture=nativeTexture[24]===8&&[2,6].includes(nativeTexture[25])&&nativeTexture[28]===0?nativeTexture:await sharp(nativeTexture).ensureAlpha().png({palette:false,progressive:false}).toBuffer();
  const bones = geometry.bones.map(({name,parent}) => ({name,...(parent?{parent}:{})}));
  try{validateStar({species,model,texture:texture.toString('base64')},{species,poser:v.poser,bones});}catch(error){invalid.push({species,reason:error.message});}
  const files = new Map([
    [`${species}.geo.json`, bytes(modelPath)], [`${species}.png`, texture],
    [`${species}_glow.png`, blankPng(geometry.description.texture_width, geometry.description.texture_height)],
    ['reference/resolver.json', bytes(path)], ['licenses/Cobblemon.txt', license],
    ['README.txt', Buffer.from(`${name} — kit de création Star\nSource : Cobblemon ${mod.version}, forme de base.\n\n1. Ouvre ${species}.geo.json dans Blockbench (Bedrock Model).\n2. Importe ${species}.png comme texture. Recolore-la pour créer ta variante Star.\n3. Garde les noms ET parents des os pour conserver les animations natives.\n4. Facultatif : peins uniquement les détails lumineux dans ${species}_glow.png, transparent au départ.\n5. Exporte le modèle .geo.json et les PNG, mêmes dimensions UV.\n6. Dans Admin > Pokémon Star, sélectionne ${species}, importe, enregistre puis publie.\n\nLes fichiers reference sont informatifs : ne pas les importer comme modèle. Les animations natives restent dans Cobblemon. Ce kit contient la version normale, pas une variante Star publiée.\nAssets originaux : équipe Cobblemon, licence jointe. https://gitlab.com/cable-mc/cobblemon\n`)]
  ]);
  const folder = path.split('/').at(-2);
  for (const nativePath of entries.keys()) {
    if ((nativePath.startsWith(`assets/cobblemon/bedrock/pokemon/animations/${folder}/`) || nativePath.startsWith(`assets/cobblemon/bedrock/pokemon/posers/${folder}/`)) && nativePath.endsWith('.json')) files.set('reference/' + nativePath.split('/pokemon/')[1], bytes(nativePath));
  }
  writeFileSync(new URL(`${species}.zip`,output), zipAssets(files));
  rows.set(species,{species,name,poser:v.poser,bones});
}
const index = { version: mod.version, jarSha256:createHash('sha256').update(jar).digest('hex'), species:[...rows.values()].sort((a,b)=>a.species.localeCompare(b.species)) };
if(invalid.length)throw new Error(JSON.stringify(invalid));
writeFileSync(new URL('index.json',output),JSON.stringify(index));
console.log(`Exported ${rows.size} native kits from ${resolve(process.argv[2])}`);
