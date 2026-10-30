import * as THREE from 'three';
import {createBallFactory} from './crate-ball';
import catalog from '../../static/crates/catalog.json';
type Model={palette:number[];tokenSlot?:number[];tokenYaw?:number;faces:{part:string;material:number;alpha:number;p:number[][]}[]};
type Frame={t:number;claw:number[];carriage:number[];grip:number;lid:number;roll:number;squash:number;balls:number[][]};
type Motion={selected:number;scale:number;end:number;rate:number;angles:number[];frames:Frame[]};
export async function createCrateScene(host:HTMLElement,id:string){
 const [model,motion]=await Promise.all([fetch('/crates/'+id+'.json').then(r=>{if(!r.ok)throw Error('model');return r.json() as Promise<Record<string,Model>>;}),fetch('/crates/motion-'+id+'.json?v='+encodeURIComponent(catalog.checkedAt)).then(r=>{if(!r.ok)throw Error('motion');return r.json() as Promise<Motion>;} )]);
 const crate=catalog.crates.find((c:any)=>c.id===id),rewards=crate.tiers.flatMap((tier:any)=>tier.rewards.map((r:any)=>({...r,tier:tier.name,ball:tier.ball}))),winner=rewards[motion.selected];
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,500);
 const textures:THREE.Texture[]=[];
 const resources:{geometries:THREE.BufferGeometry[];materials:THREE.Material[]}={geometries:[],materials:[]};
 function mesh(data:Model){
  const root=new THREE.Group(),parts=new Map<string,THREE.Group>(),buckets=new Map<string,{part:string;alpha:number;positions:number[];colors:number[]}>();
  for(const f of data.faces){const key=f.part+'|'+f.alpha;let b=buckets.get(key);if(!b){b={part:f.part,alpha:f.alpha,positions:[],colors:[]};buckets.set(key,b);}const color=new THREE.Color(data.palette[f.material]);const p=f.p;const normal=new THREE.Vector3().subVectors(new THREE.Vector3(...p[1] as [number,number,number]),new THREE.Vector3(...p[0] as [number,number,number])).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...p[2] as [number,number,number]),new THREE.Vector3(...p[0] as [number,number,number]))).normalize();color.multiplyScalar(normal.y>.35?1:normal.x<-.35?.8:.92);for(let t=1;t<p.length-1;t++)for(const i of [0,t,t+1]){b.positions.push(...p[i]);b.colors.push(color.r,color.g,color.b);}}
  for(const b of buckets.values()){let part=parts.get(b.part);if(!part){part=new THREE.Group();parts.set(b.part,part);root.add(part);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(b.colors,3));const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:b.alpha<255,opacity:b.alpha/255,depthWrite:b.alpha===255});const mesh=new THREE.Mesh(geometry,material);if(b.alpha<255)mesh.renderOrder=3;part.add(mesh);resources.geometries.push(geometry);resources.materials.push(material);}
  return {root,parts};
 }
 const machine=mesh(model.crate);scene.add(machine.root);
 const ballFactory=await createBallFactory(resources,textures);
 const balls=motion.frames[0].balls.map((_:number[],i:number)=>{const ball=ballFactory(rewards[i].ball);ball.root.scale.setScalar(motion.scale);scene.add(ball.root);return ball;});
 const previews=rewards.filter((r:any)=>r.tier===winner.tier);
 const prizeMaps=await Promise.all(previews.map((r:any)=>new THREE.TextureLoader().loadAsync(r.icon)));
 const prizeSprites=prizeMaps.map((map,i)=>{map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.NearestFilter;textures.push(map);const material=new THREE.SpriteMaterial({map,depthTest:false});resources.materials.push(material);const sprite=new THREE.Sprite(material);sprite.visible=false;sprite.scale.set(5,5,1);sprite.renderOrder=5;scene.add(sprite);return sprite;});
 const token=mesh(model.key);token.root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.translate(-8,-8,-7.75);});token.root.scale.setScalar(.25);scene.add(token.root);
 host.replaceChildren(renderer.domElement);
 const ease=(x:number)=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
 const lerp=(a:number,b:number,u:number)=>a+(b-a)*u;
 let lastTime=-1,disposed=false;
 function draw(t:number){
  if(disposed)return;lastTime=t;
  const index=t<0?0:Math.min(motion.frames.length-2,Math.floor(t/2)+1),a=motion.frames[index],b=motion.frames[Math.min(index+1,motion.frames.length-1)],u=t<0?0:Math.min(1,(t-a.t)/2);
  const point=(x:number[],y:number[])=>x.map((v,k)=>lerp(v,y[k],u));const claw=point(a.claw,b.claw),carriage=point(a.carriage,b.carriage),grip=lerp(a.grip,b.grip,u),lid=lerp(a.lid,b.lid,u);
  for(const [name,part] of machine.parts){part.visible=t<154||(t<198&&name==='delivery');part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.setScalar(1);if(name==='crossbeam')part.position.z=carriage[2];if(name==='carriage')part.position.set(carriage[0],0,carriage[2]);if(name==='claw'||name==='cable'||name.startsWith('finger_')){part.position.set(...claw as [number,number,number]);if(name==='cable'){const direction=new THREE.Vector3(carriage[0]-claw[0],38.2-claw[1],carriage[2]-claw[2]);part.scale.y=direction.length();part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}else{part.scale.setScalar(motion.scale);if(name.startsWith('finger_')){const i=Number(name.slice(7)),yaw=i*2*Math.PI/3,angle=(52+(motion.angles[i]-52)*grip)*Math.PI/180;const pivot=new THREE.Vector3(1,-.5,0),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle),turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);const offset=pivot.clone().sub(pivot.clone().applyQuaternion(rotation)).applyQuaternion(turn).multiplyScalar(motion.scale);part.position.add(offset);part.quaternion.copy(turn).multiply(rotation);}}}}
  balls.forEach((ball,i)=>{const p=point(a.balls[i],b.balls[i]);ball.root.position.set(...p as [number,number,number]);ball.root.visible=t<154||i===motion.selected;ball.root.rotation.x=i===motion.selected?lerp(a.roll,b.roll,u)*Math.PI/180:t>=0&&t<60?18*Math.sin(t*.3+i)*Math.pow(Math.sin(Math.PI*t/60),2)*Math.PI/180:0;const squash=i===motion.selected?lerp(a.squash||0,b.squash||0,u):0;ball.root.scale.set(motion.scale*(1+squash*.5),motion.scale*(1-squash),motion.scale*(1+squash*.5));ball.top.rotation.x=i===motion.selected?115*lid*Math.PI/180:0;});
  const slot=model.crate.tokenSlot||[16,14.8,2.6];token.root.visible=t>=0&&t<34;token.root.position.set(slot[0],22-9.4*ease((t-12)/20)+slot[1]-14.8,slot[2]);token.root.rotation.y=(model.crate.tokenYaw||0)*ease((t-6)/6)*Math.PI/180;
  const selected=balls[motion.selected].root.position;
  const shots=[
   [0,slot[0],25+slot[1]-14.8,-17,slot[0],18+slot[1]-14.8,slot[2]],
   [34,slot[0],25+slot[1]-14.8,-17,slot[0],18+slot[1]-14.8,slot[2]],
   [60,16,30,-32,16,29,18],[78,16,30,-32,16,29,18],
   [102,selected.x,selected.y+6,-20,selected.x,selected.y+4,selected.z],
   [132,16,37,-24,selected.x,selected.y+3,selected.z],[153,16,37,-24,16,34,12],
   [154,16,38,3,16,18,12],[164,16,22,4,16,9,12],[176,16,8,-12,16,7,10],
   [184,16,7,-12,16,7,8],[204,16,7,-23,16,4,-3],[218,16,6,-24,16,3,-8],
   [226,16,9,-32,16,6,-8],[306,16,9,-32,16,6,-8],[314,16,12,-48,16,11,-8],[354,16,12,-48,16,11,-8]
  ];
  let shot=shots[shots.length-1].slice(1);for(let i=1;i<shots.length;i++)if(t<=shots[i][0]){const a=shots[i-1],b=shots[i],u=ease((t-a[0])/(b[0]-a[0]));shot=a.slice(1).map((x,k)=>lerp(x,b[k+1],u));break;}
  if(t<0)shot=[51,45,-78,16,26,16];
  camera.aspect=Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight);camera.position.set(shot[0],shot[1],shot[2]);camera.lookAt(shot[3],shot[4],shot[5]);camera.updateProjectionMatrix();
  const prize=t<306?Math.floor(Math.max(0,t-226)/8)%previews.length:previews.indexOf(winner)>=0?previews.indexOf(winner):previews.findIndex((r:any)=>r.label===winner.label);
  prizeSprites.forEach((sprite,i)=>{sprite.visible=t>=226&&i===prize;sprite.position.set(selected.x,selected.y+6,selected.z);});renderer.render(scene,camera);

 }
 const resize=new ResizeObserver(()=>{renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);draw(lastTime);});resize.observe(host);renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);draw(-1);
 return {draw,winner,previewAt(t:number){return t<226?null:t<306?previews[Math.floor((t-226)/8)%previews.length]:winner;},end:motion.end-2,rate:motion.rate,dispose(){disposed=true;resize.disconnect();resources.geometries.forEach(g=>g.dispose());resources.materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}};
}
