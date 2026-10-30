import * as THREE from 'three';
type Model={palette:number[];tokenSlot?:number[];tokenYaw?:number;faces:{part:string;material:number;alpha:number;p:number[][]}[]};
type Frame={t:number;claw:number[];carriage:number[];grip:number;lid:number;roll:number;balls:number[][]};
type Motion={selected:number;scale:number;end:number;rate:number;angles:number[];frames:Frame[]};
export async function createCrateScene(host:HTMLElement,id:string){
 const [model,motion]=await Promise.all([fetch('/crates/'+id+'.json').then(r=>{if(!r.ok)throw Error('model');return r.json() as Promise<Record<string,Model>>;}),fetch('/crates/motion.json').then(r=>{if(!r.ok)throw Error('motion');return r.json() as Promise<Motion>;} )]);
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-40,40,40,-40,.1,500);
 const resources:{geometries:THREE.BufferGeometry[];materials:THREE.Material[]}={geometries:[],materials:[]};
 function mesh(data:Model){
  const root=new THREE.Group(),parts=new Map<string,THREE.Group>(),buckets=new Map<string,{part:string;alpha:number;positions:number[];colors:number[]}>();
  for(const f of data.faces){const key=f.part+'|'+f.alpha;let b=buckets.get(key);if(!b){b={part:f.part,alpha:f.alpha,positions:[],colors:[]};buckets.set(key,b);}const color=new THREE.Color(data.palette[f.material]);const p=f.p;const normal=new THREE.Vector3().subVectors(new THREE.Vector3(...p[1] as [number,number,number]),new THREE.Vector3(...p[0] as [number,number,number])).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...p[2] as [number,number,number]),new THREE.Vector3(...p[0] as [number,number,number]))).normalize();color.multiplyScalar(normal.y>.35?1:normal.x<-.35?.8:.92);for(let t=1;t<p.length-1;t++)for(const i of [0,t,t+1]){b.positions.push(...p[i]);b.colors.push(color.r,color.g,color.b);}}
  for(const b of buckets.values()){let part=parts.get(b.part);if(!part){part=new THREE.Group();parts.set(b.part,part);root.add(part);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(b.colors,3));const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:b.alpha<255,opacity:b.alpha/255,depthWrite:b.alpha===255});const mesh=new THREE.Mesh(geometry,material);if(b.alpha<255)mesh.renderOrder=3;part.add(mesh);resources.geometries.push(geometry);resources.materials.push(material);}
  return {root,parts};
 }
 const machine=mesh(model.crate);scene.add(machine.root);
 const capsule=mesh(model.ball);
 const top=capsule.parts.get('capsule_top')!;top.position.z=3.2;top.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.translate(0,0,-3.2);});
 const balls=motion.frames[0].balls.map(()=>{const root=capsule.root.clone(true);root.scale.setScalar(motion.scale);scene.add(root);return {root,top:root.children[capsule.root.children.indexOf(top)]};});
 const token=mesh(model.key);token.root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.translate(-8,-8,-7.5);});token.root.scale.setScalar(.45);scene.add(token.root);
 host.replaceChildren(renderer.domElement);
 const ease=(x:number)=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
 const lerp=(a:number,b:number,u:number)=>a+(b-a)*u;
 let lastTime=-1,disposed=false;
 function draw(t:number){
  if(disposed)return;lastTime=t;
  const index=t<0?0:Math.min(motion.frames.length-2,Math.floor(t/2)+1),a=motion.frames[index],b=motion.frames[Math.min(index+1,motion.frames.length-1)],u=t<0?0:Math.min(1,(t-a.t)/2);
  const point=(x:number[],y:number[])=>x.map((v,k)=>lerp(v,y[k],u));const claw=point(a.claw,b.claw),carriage=point(a.carriage,b.carriage),grip=lerp(a.grip,b.grip,u),lid=lerp(a.lid,b.lid,u);
  for(const [name,part] of machine.parts){part.visible=t<154||name==='delivery';part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.setScalar(1);if(name==='crossbeam')part.position.z=carriage[2];if(name==='carriage')part.position.set(carriage[0],0,carriage[2]);if(name==='claw'||name==='cable'||name.startsWith('finger_')){part.position.set(...claw as [number,number,number]);if(name==='cable'){const direction=new THREE.Vector3(carriage[0]-claw[0],38.2-claw[1],carriage[2]-claw[2]);part.scale.y=direction.length();part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}else{part.scale.setScalar(motion.scale);if(name.startsWith('finger_')){const i=Number(name.slice(7)),yaw=i*2*Math.PI/3,angle=(52+(motion.angles[i]-52)*grip)*Math.PI/180;const pivot=new THREE.Vector3(1,-.5,0),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle),turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);const offset=pivot.clone().sub(pivot.clone().applyQuaternion(rotation)).applyQuaternion(turn).multiplyScalar(motion.scale);part.position.add(offset);part.quaternion.copy(turn).multiply(rotation);}}}}
  balls.forEach((ball,i)=>{const p=point(a.balls[i],b.balls[i]);ball.root.position.set(...p as [number,number,number]);ball.root.visible=t<154||i===motion.selected;ball.root.rotation.x=i===motion.selected?lerp(a.roll,b.roll,u)*Math.PI/180:0;ball.top.rotation.x=i===motion.selected?115*lid*Math.PI/180:0;});
  const slot=model.crate.tokenSlot||[16,14.8,2.6];token.root.visible=t>=0&&t<34;token.root.position.set(slot[0],22-9.4*ease((t-12)/20)+slot[1]-14.8,slot[2]);token.root.rotation.y=(model.crate.tokenYaw||0)*ease((t-6)/6)*Math.PI/180;
  const selected=balls[motion.selected].root.position,close=ease((t-154)/18),target=new THREE.Vector3(16,26,16).lerp(new THREE.Vector3(selected.x,selected.y+4,selected.z),close);const span=lerp(65,24,close),width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight),aspect=width/height;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.position.copy(target).add(new THREE.Vector3(-35,19,-94));camera.lookAt(target);camera.updateProjectionMatrix();renderer.render(scene,camera);
 }
 const resize=new ResizeObserver(()=>{renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);draw(lastTime);});resize.observe(host);renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);draw(-1);
 return {draw,end:motion.end-2,rate:motion.rate,dispose(){disposed=true;resize.disconnect();resources.geometries.forEach(g=>g.dispose());resources.materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}};
}
