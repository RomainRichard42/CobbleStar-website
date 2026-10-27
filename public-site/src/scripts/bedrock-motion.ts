import {Molang} from 'molang';
import type * as T from 'three';
type Vector=[number,number,number];
type Channel=unknown;
export type Motion={pose:string;aspects?:string[];clips:{name:string;loop:boolean;animation_length:number;bones:Record<string,{position?:Channel;rotation?:Channel;scale?:Channel}>}[];transformedParts:{part:string;position?:Vector;rotation?:Vector;scale?:Vector;isVisible?:boolean;visible?:boolean}[]};
/** Interpreted Molang only: no eval, JavaScript or events from model assets. */
export function motionEvaluator(aspects:string[]=[]){
 let time=0;
 const env=new Molang({query:{anim_time:()=>time,life_time:()=>time,age:()=>time*20,age_in_ticks:()=>time*20,has_aspect:(a:string)=>aspects.includes(a),camera_rotation_x:0,camera_rotation_y:0,r:{pitch:()=>0}},variable:{limb_swing:0,limb_swing_amount:0,age_in_ticks:()=>time*20}},{useCache:true,convertUndefined:true});
 // Genesect's supplied idle has a Thai keyboard "1" typo before its cosine.
 const scalar=(v:unknown):number=>{if(typeof v==='number')return v;if(typeof v!=='string')return 0;const n=Number(env.execute(v.replace(/^ๅ\+/,'1+').replace(/^\+/,'').replace(/-\(/g,'-1*(').replace(/\*\+/g,'*').replace(/q\./gi,'query.').replace(/query.camera_rotation\(0\)/gi,'query.camera_rotation_x').replace(/query.camera_rotation\(1\)/gi,'query.camera_rotation_y')));if(!Number.isFinite(n))throw new Error('Non-finite animation expression');return n;};
 const vector=(v:any,side='post'):Vector=>{if(v&&typeof v==='object'&&!Array.isArray(v))v=v[side]??v.post??v.pre??[0,0,0];return Array.isArray(v)?[scalar(v[0]),scalar(v[1]),scalar(v[2])]:[scalar(v),scalar(v),scalar(v)];};
 const channel=(value:any,t:number):Vector=>{
  time=t;
  if(!value||Array.isArray(value)||typeof value!=='object'||'post'in value||'pre'in value)return vector(value);
  const keys=Object.keys(value).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!keys.length)return [0,0,0];
  const key=(n:number)=>value[Object.keys(value).find(k=>Number(k)===n)!];
  if(t<=keys[0])return vector(key(keys[0]),'pre');
  if(t>=keys.at(-1)!)return vector(key(keys.at(-1)!));
  const i=keys.findIndex(k=>k>t),a=keys[i-1],b=keys[i],f=(t-a)/(b-a),va=vector(key(a)),vb=vector(key(b),'pre');
  if(key(a)?.lerp_mode==='catmullrom'||key(b)?.lerp_mode==='catmullrom'){
   const before=vector(key(keys[Math.max(0,i-2)])),after=vector(key(keys[Math.min(keys.length-1,i+1)]),'pre');
   return va.map((p,j)=>.5*((2*p)+(-before[j]+vb[j])*f+(2*before[j]-5*p+4*vb[j]-after[j])*f*f+(-before[j]+3*p-3*vb[j]+after[j])*f*f*f)) as Vector;
  }
  return va.map((p,j)=>p+(vb[j]-p)*f) as Vector;
 };
 return {channel};
}
export function animateModel(root:T.Group,motion?:Motion){
 const nodes=new Map<string,{node:T.Object3D;position:T.Vector3;rotation:T.Euler;scale:T.Vector3;visible:boolean}>();
 root.traverse(node=>{if(node.userData.bedrockBone)nodes.set(node.name,{node,position:node.position.clone(),rotation:node.rotation.clone(),scale:node.scale.clone(),visible:node.visible});});
 const evaluator=motionEvaluator(motion?.aspects);
 function transform(part:string,p?:Vector,r?:Vector,s?:Vector,visible?:boolean){
  const item=nodes.get(part);if(!item)return;const n=item.node;
  if(p){n.position.x-=p[0];n.position.y+=p[1];n.position.z+=p[2];}
  if(r){n.rotation.x-=r[0]*Math.PI/180;n.rotation.y-=r[1]*Math.PI/180;n.rotation.z+=r[2]*Math.PI/180;}
  if(s){n.scale.x*=s[0];n.scale.y*=s[1];n.scale.z*=s[2];}
  if(visible!==undefined)n.visible=visible;
 }
 return (seconds:number)=>{
  for(const b of nodes.values()){b.node.position.copy(b.position);b.node.rotation.copy(b.rotation);b.node.scale.copy(b.scale);b.node.visible=b.visible;}
  for(const p of motion?.transformedParts??[])transform(p.part,p.position,p.rotation,p.scale,p.isVisible??p.visible);
  for(const clip of motion?.clips??[]){
   const t=clip.loop&&clip.animation_length>0?seconds%clip.animation_length:seconds;
   for(const [name,b] of Object.entries(clip.bones))transform(name,b.position!==undefined?evaluator.channel(b.position,t):undefined,b.rotation!==undefined?evaluator.channel(b.rotation,t):undefined,b.scale!==undefined?evaluator.channel(b.scale,t):undefined);
  }
  root.updateMatrixWorld(true);
 };
}
