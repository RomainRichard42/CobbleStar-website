import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const FONT='cobblestar_planets:ranks';
const DEFAULT='assets/minecraft/font/default.json';
type Provider={type:string;id?:string;chars?:string[];[key:string]:unknown};
type Font={providers:Provider[];[key:string]:unknown};
type Manifest={schema:number;font:string;files:string[];tags:{id:string;codepoint:string;glyph:string;file:string;sha256:string}[]};

/** Additive only: never replace the existing alphabet or other pack assets. */
export function appendRankTags(files:Map<string,Buffer>) {
 const root=new URL('../rank-tags/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8')) as Manifest;
 if(manifest.schema!==1||manifest.font!==FONT||manifest.tags.length!==17)throw new Error('INVALID_RANK_TAG_MANIFEST');
 const added=new Map<string,Buffer>();
 for(const path of manifest.files){
  if(!/^(?:assets\/cobblestar_planets\/(?:font\/ranks\.json|textures\/ranks\/[a-z]+\.png)|licenses\/RankTags-NOTICE\.txt)$/.test(path)||added.has(path))throw new Error('INVALID_RANK_TAG_PATH');
  if(files.has(path))throw new Error('RANK_TAG_ASSET_COLLISION');
  added.set(path,readFileSync(new URL(path,root)));
 }
 const glyphs=new Set<string>();
 for(const tag of manifest.tags){
  const bytes=added.get(tag.file);
  if(!/^[a-z]+$/.test(tag.id)||!/^E0[0-9A-F]{2}$/.test(tag.codepoint)||tag.glyph!==String.fromCodePoint(parseInt(tag.codepoint,16))||glyphs.has(tag.glyph)
    ||!bytes||createHash('sha256').update(bytes).digest('hex')!==tag.sha256)throw new Error('INVALID_RANK_TAG_ASSET');
  glyphs.add(tag.glyph);
 }
 const previous:Font=files.has(DEFAULT)?JSON.parse(files.get(DEFAULT)!.toString('utf8')):{providers:[]};
 if(!Array.isArray(previous.providers))throw new Error('INVALID_EXISTING_DEFAULT_FONT');
 for(const provider of previous.providers){
  if(provider.type==='reference'&&provider.id===FONT)throw new Error('DUPLICATE_RANK_FONT_REFERENCE');
  if(provider.chars?.some(row=>[...row].some(char=>glyphs.has(char))))throw new Error('RANK_TAG_GLYPH_COLLISION');
 }
 // Minecraft stacks providers for this font with those from lower resource packs.
 // A dedicated reference adds only private-use glyphs, without redefining letters.
 added.set(DEFAULT,Buffer.from(JSON.stringify({...previous,providers:[...previous.providers,{type:'reference',id:FONT}]})));
 for(const [path,data] of added)files.set(path,data);
}
