import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';

type Prepared={compressed:Buffer;crc:number};
const prepared=new WeakMap<Buffer,Prepared>();
let base:Map<string,Buffer>|undefined;

/** Trusted build artifact only: never reads a user-supplied path or uploaded ZIP. */
function baseAssets():Map<string,Buffer>{
 if(base)return base;
 const root=new URL('../server-resource-pack/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
 const zip=readFileSync(new URL('base.zip',root));
 if(manifest.schema!==1||manifest.packFormat!==34||manifest.file!=='base.zip'||zip.length!==manifest.bytes
  ||zip.length>48*1024*1024||createHash('sha256').update(zip).digest('hex')!==manifest.sha256)throw new Error('SERVER_PACK_BASE_CHECKSUM');
 const files=new Map<string,Buffer>();let at=0,total=0;
 while(at+30<=zip.length&&zip.readUInt32LE(at)===0x04034b50){
  const flags=zip.readUInt16LE(at+6),method=zip.readUInt16LE(at+8),length=zip.readUInt16LE(at+26);
  const start=at+30+length+zip.readUInt16LE(at+28),end=start+zip.readUInt32LE(at+18);
  if(flags&9||method!==8||end>zip.length)throw new Error('SERVER_PACK_BASE_FORMAT');
  const path=zip.toString('utf8',at+30,at+30+length);
  if(!/^(?:assets\/[a-z0-9_.-]+\/|licenses\/)/.test(path)||path.includes('\\')||path.includes('\0')
   ||path.split('/').some(p=>!p||p==='.'||p==='..')||files.has(path))throw new Error('SERVER_PACK_BASE_PATH');
  const compressed=zip.subarray(start,end),data=inflateRawSync(compressed,{maxOutputLength:8*1024*1024});
  total+=data.length;
  if(data.length!==zip.readUInt32LE(at+22)||total>48*1024*1024||files.size>=16000)throw new Error('SERVER_PACK_BASE_SIZE');
  files.set(path,data);prepared.set(data,{compressed,crc:zip.readUInt32LE(at+14)});at=end;
 }
 if(at+4>zip.length||zip.readUInt32LE(at)!==0x02014b50||files.size!==manifest.entries||total!==manifest.uncompressedBytes)throw new Error('SERVER_PACK_BASE_INCOMPLETE');
 base=files;return files;
}

/** Reuse the verified compression of immutable base assets for every Star publication. */
export function preparedServerAsset(data:Buffer):Prepared|undefined{return prepared.get(data);}

/** Preserve the old pack stack: base packs first; current CobbleStar publication above them. */
export function withServerResources(published:Map<string,Buffer>):Map<string,Buffer>{
 const files=new Map(baseAssets());
 for(const [path,data] of published){
  const lower=files.get(path);
  if(lower&&/^assets\/[^/]+\/font\/.*\.json$/.test(path)){
   const high=JSON.parse(data.toString()),low=JSON.parse(lower.toString());
   if(!Array.isArray(high.providers)||!Array.isArray(low.providers))throw new Error('SERVER_PACK_FONT_FORMAT');
   // Minecraft stacks font providers across packs; keep current grade glyphs first.
   files.set(path,Buffer.from(JSON.stringify({...low,...high,providers:[...high.providers,...low.providers]})));
  }else if(lower&&/^assets\/[^/]+\/lang\/.*\.json$/.test(path)){
   files.set(path,Buffer.from(JSON.stringify({...JSON.parse(lower.toString()),...JSON.parse(data.toString())})));
  }else files.set(path,data);
 }
 return files;
}
