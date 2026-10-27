// Read-only web assets; independent of the stricter editable Star kit validator.
// node scripts/export-dex-runtime.mjs <Cobblemon.jar> <CCC.jar> <1.8.0 blockbench source directory>
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {join,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {Molang} from 'molang';
import {readJar} from './export-star-addon-templates.mjs';

const [nativeJar,addonJar,sourceDir,megaJar]=process.argv.slice(2);
const dest=new URL('../api/dex-runtime/',import.meta.url);mkdirSync(dest,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const sourceFiles=walk(sourceDir).filter(p=>p.endsWith('Model.kt'));
const kotlin=new Map(sourceFiles.map(p=>[basename(p,'Model.kt').toLowerCase(),readFileSync(p,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')]));
const warnings=[];
function provider(path){const files=readJar(readFileSync(path)),meta=JSON.parse(files.get('fabric.mod.json')().toString().replace(/"(?:[^"\\]|\\.)*"/gs,s=>s.replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t')));return {files,meta};}
const providers=[provider(nativeJar),provider(addonJar),...(megaJar?[provider(megaJar)]:[])];
const french=JSON.parse(providers[0].files.get('assets/cobblemon/lang/fr_fr.json')());
const resources=(files,kind)=>new Map([...files.keys()].filter(p=>p.includes(`/bedrock/pokemon/${kind}/`)&&p.endsWith('.json')).map(p=>[p.split('/')[1]+':'+basename(p,'.json'),p]));
const animations=new Map();
for(const provider of providers){provider.models=resources(provider.files,'models');provider.posers=resources(provider.files,'posers');provider.clips=new Map();
 for(const [p,read] of provider.files)if(p.includes('/bedrock/pokemon/animations/')&&p.endsWith('.json')){for(const [id,clip] of Object.entries(JSON.parse(read()).animations??{}))provider.clips.set(id,clip);}
 for(const [id,clip] of provider.clips)if(!animations.has(id))animations.set(id,clip);
}
const evaluate=(expression,aspects=[])=>{
 if(expression===undefined)return true;
 const m=new Molang({query:{has_aspect:a=>aspects.includes(a),in_battle:0,is_battling:0,is_holding_item:0,in_air:0,is_sprinting:0,is_ridden:0,is_touching_water:0,is_under_water:0}},{useCache:true});
 try{return Boolean(m.execute(String(expression)));}catch{return false;}
};
function balanced(text,start){let level=0,quote='';for(let i=start;i<text.length;i++){const c=text[i];if(quote){if(c===quote&&text[i-1]!=='\\')quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='(')level++;if(c===')'&&--level===0)return text.slice(start+1,i);}throw new Error('Unbalanced source');}
function kotlinPoser(id){
 const text=kotlin.get(id.replace(/[-_]/g,''));if(!text)return null;
 const parts=new Map([...text.matchAll(/(?:val|var)\s+(\w+)\s*=\s*(?:getPart|root.registerChildWithAllChildren)\("([^"]+)"\)/g)].map(m=>[m[1],m[2]]));
 const poses={};let number=0;
 for(const match of text.matchAll(/registerPose\(/g)){
  const block=balanced(text,match.index+match[0].length-1);
  if(/isBattling/.test(block)&&!/!\s*(?:it\.)?isBattling/.test(block))continue;
  const types=block.match(/poseTypes?\s*=([\s\S]*?)(?:,\s*\n|,\s*(?:animations|transform|condition|quirks))/)?.[1]??'';
  const refs=[...block.matchAll(/\bbedrock\("([^"]+)",\s*"([^"]+)"/g)].map(m=>`q.bedrock('${m[1]}', '${m[2]}')`);
  const transformedParts=[];
  for(const m of block.matchAll(/(\w+)\.createTransformation\(\)((?:\s*\.[\w]+\([^)]*\))*)/g)){
   const part=parts.get(m[1]);if(!part){warnings.push(`${id}: unknown transformed part ${m[1]}`);continue;}
   const t={part};const tail=m[2];
   const visible=tail.match(/withVisibility\((?:visibility\s*=\s*)?([^)]*)\)/)?.[1];
   if(visible)t.isVisible=visible.trim()==='false'?false:true;
   for(const channel of ['Position','Rotation','Scale']){
    const values=tail.match(new RegExp(`with${channel}\\(([^)]*)\\)`))?.[1];
    if(values){const nums=values.split(',').map(n=>Number(n.trim().replace(/[fF]$/,'')));if(nums.length===3&&nums.every(Number.isFinite))t[channel.toLowerCase()]=nums;else warnings.push(`${id}: unsupported ${channel} ${values}`);}
    for(const v of tail.matchAll(new RegExp(`add${channel}\\((?:ModelPartTransformation\\.)?([XYZ])_AXIS,\\s*([+-]?[\\d.]+)[fF]?\\)`,'g'))){const key=channel.toLowerCase();t[key]??=channel==='Scale'?[1,1,1]:[0,0,0];t[key]['XYZ'.indexOf(v[1])]+=Number(v[2]);}
   }
   // Kotlin transformations use the Java model's Y-down convention.
   if(t.position)t.position[1]*=-1;
   if(t.rotation)t.rotation=t.rotation.map(v=>v*180/Math.PI);
   transformedParts.push(t);
  }
  const poseTypes=[];if(/ALL_POSES|UI_POSES|PROFILE|PORTRAIT/.test(types))poseTypes.push('PROFILE');if(/STATIONARY_POSES|STAND|NONE/.test(types))poseTypes.push('STAND');if(/HOVER/.test(types))poseTypes.push('HOVER');if(/FLOAT/.test(types))poseTypes.push('FLOAT');
  poses[block.match(/poseName\s*=\s*"([^"]+)"/)?.[1]??`pose${number++}`]={poseTypes,animations:refs,transformedParts};
 }
 return {poses};
}
function motionFor(poserId,provider,aspects=[]){
 const path=provider.posers.get(poserId),poser=path?JSON.parse(provider.files.get(path)()):kotlinPoser(poserId.split(':')[1]);
 if(!poser)throw new Error('NO_POSER '+poserId);
 const rank=p=>{if(!evaluate(p.condition,aspects))return -100;const types=p.poseTypes??[];return (types.includes('PROFILE')?100:types.includes('PORTRAIT')?95:types.includes('STAND')?80:types.includes('NONE')?75:types.includes('HOVER')?60:types.includes('FLOAT')?50:-100)-(p.isTouchingWater||p.isUnderWater?20:0)-(p.isBattle===true?50:0);};
 const candidates=Object.entries(poser.poses??{}).sort((a,b)=>rank(b[1])-rank(a[1]));
 for(const [name,p] of candidates){if(rank(p)<0)continue;const clips=[];
  for(const call of p.animations??[]){const expr=typeof call==='string'?call:evaluate(call.condition,aspects)?call.animation:'';const calls=[];const env=new Molang({query:{bedrock:(g,a)=>{calls.push([g,a]);return 1;},look:()=>0,curve:()=>1,has_aspect:a=>aspects.includes(a)},math:{random:(a,b)=>(a+b)/2}},{useCache:true});
   if(expr.includes('bedrock(')){try{env.execute(expr.replace(/(?<![.\w])bedrock\(\s*([a-z0-9_.-]+)\s*,\s*([a-z0-9_.-]+)\s*\)/gi,"q.bedrock('$1', '$2')"));}catch(e){throw new Error('POSE_CALL '+expr+' '+e.message);}}
   for(const [g,a] of calls){const id=`animation.${g}.${a}`,clip=provider.clips.get(id)??animations.get(id);if(!clip)throw new Error('NO_CLIP '+id);clips.push({name:id,loop:clip.loop===true,animation_length:clip.animation_length??0,bones:clip.bones??{}});}}

  return {pose:name,clips,transformedParts:p.transformedParts??[],aspects};
 }
 throw new Error('NO_IDLE_POSE '+poserId);
}
function texture(ref,provider){
 const frames=typeof ref==='string'?[ref]:ref?.frames;if(!frames?.length)throw new Error('NO_TEXTURE');
 return {frames:frames.map(r=>{const p='assets/'+r.replace(':','/');const read=provider.files.get(p)??providers[0].files.get(p);if(!read)throw new Error('NO_TEXTURE '+p);return read().toString('base64');}),fps:typeof ref==='string'?0:ref.fps??1};
}
const rows=[],failures=[];
for(const provider of providers){
 const seen=new Set();
 for(const [path,read] of provider.files){if(!path.includes('/bedrock/pokemon/resolvers/')||!path.endsWith('.json'))continue;
  const resolver=JSON.parse(read());if(resolver.order!==0||!/^cobblemon:[a-z0-9_]+$/.test(resolver.species))continue;
  const species=resolver.species.split(':')[1];if(seen.has(species))continue;
  const v=resolver.variations.find(v=>v.aspects?.length===0&&v.model&&v.poser);if(!v)continue;
  try{
   const modelPath=provider.models.get(v.model);if(!modelPath)continue;
   const raw=provider.files.get(modelPath)(),model=JSON.parse(raw),bones=model['minecraft:geometry'][0].bones.map(({name,parent})=>({name,...(parent?{parent}:{})}));
   const animated=texture(v.texture,provider),layers=(v.layers??[]).filter(l=>!l.name?.includes('alpha')).map(l=>({...texture(l.texture,provider),emissive:!!l.emissive,translucent:!!l.translucent}));
   const motion=motionFor(v.poser,provider);
   const asset={species,model,texture:animated.frames[0],...(animated.frames.length>1?{textureAnimation:animated}:{}),layers,motion};
   const source=provider.meta.id==='cobblemon'?undefined:{id:provider.meta.id,name:provider.meta.name,version:String(provider.meta.version),modelHash:sha(raw),poserHash:sha(provider.files.get(provider.posers.get(v.poser))())};
   const assetKey=provider.meta.id+'-'+species;
   rows.push({species,assetKey,name:french[`cobblemon.species.${species}.name`]??species,poser:v.poser,bones,...(source?{source}:{})});seen.add(species);
   writeFileSync(new URL(assetKey+'.json.gz',dest),gzipSync(JSON.stringify(asset),{level:9}));
  }catch(e){failures.push({species,provider:provider.meta.id,error:e.message});}
 }
}
// Custom CobbleStar appearances keep their own poser and animation group.
const forms=JSON.parse(readFileSync(new URL('../api/dex.catalog.json',import.meta.url))).entries;
const formMotions={};
for(const form of forms){
 const pack=form.texture.split('/')[0],root=new URL('../api/'+pack+'/',import.meta.url),dir=fileURLToPath(root),files=new Map();
 for(const p of walk(dir))files.set(p.slice(dir.length).replaceAll('\\','/'),()=>readFileSync(p));
 const provider={files,models:resources(files,'models'),posers:resources(files,'posers'),clips:new Map()};
 for(const [p,read] of files)if(p.includes('/animations/')&&p.endsWith('.json'))for(const [key,clip] of Object.entries(JSON.parse(read()).animations??{}))provider.clips.set(key,clip);
 let match;for(const [p,read] of files)if(p.includes('/resolvers/')&&p.endsWith('.json')){const r=JSON.parse(read());if(r.species.split(':')[1]!==form.species)continue;let prior={};for(const v of r.variations){prior={...prior,...v};if(typeof prior.texture==='string'&&form.texture===pack+'/assets/'+prior.texture.replace(':','/')){match=prior;break;}}if(match)break;}
 if(!match)throw new Error('NO_FORM_RESOLVER '+form.id);
 try{formMotions[form.id]=motionFor(match.poser,provider,match.aspects??[]);}catch(e){
  // Resolvers can intentionally use an official poser (e.g. Alliance Dragonite).
  if(providers[0].posers.has(match.poser)||kotlin.has(match.poser.split(':')[1])){try{formMotions[form.id]=motionFor(match.poser,providers[0],match.aspects??[]);}catch(e){failures.push({species:form.id,error:e.message});}}else failures.push({species:form.id,error:e.message});
 }
}
const ashProvider=providers[1];
try{formMotions['star-greninja-ash']=motionFor('cobblemon:ashgreninja',ashProvider);}catch(e){failures.push({species:'ashgreninja',error:e.message});}
writeFileSync(new URL('motions.json.gz',dest),gzipSync(JSON.stringify(formMotions),{level:9}));
writeFileSync(new URL('index.json',dest),JSON.stringify({version:1,cobblemon:providers[0].meta.version,sourceTag:'1.8.0',species:rows,failures},null,0));
for(const p of providers){const file=[...p.files.keys()].find(k=>/^licen[sc]e(?:\.txt)?$/i.test(k));if(file)writeFileSync(new URL(p.meta.id+'.LICENSE.txt',dest),p.files.get(file)());}
console.log(JSON.stringify({exported:rows.length,forms:Object.keys(formMotions).length,failures,warnings},null,2));
