import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {meshModel,type PreviewAsset,type TextureFrames} from './bedrock-model';
import {animateModel} from './bedrock-motion';

export function createDexRenderer(interactive=false){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.add(new T.AmbientLight(0xffffff,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(3,5,-4);scene.add(light);
 const camera=new T.PerspectiveCamera(35,1,.01,10000);
 const controls=interactive?new OrbitControls(camera,renderer.domElement):null;
 if(controls){controls.enableZoom=false;controls.enablePan=false;controls.addEventListener('change',render);}
 type Item={model:T.Group;animate:(time:number)=>void;radius:number;fit:Map<number,number>;textures:T.Texture[];materials:T.Material[];frames:{material:T.MeshStandardMaterial|T.MeshBasicMaterial;textures:T.Texture[];fps:number}[]};
 const cache=new Map<string,Item>();let current:Item|undefined,radius=1,closed=false;
 function render(){if(!closed)renderer.render(scene,camera);}
 function disposeItem(item:Item){const geometries=new Set<T.BufferGeometry>();item.model.traverse(o=>{if(o instanceof T.Mesh)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());item.materials.forEach(m=>m.dispose());item.textures.forEach(t=>t.dispose());}
 function frame(){
  const direction=new T.Vector3(-.4,.18,-1).normalize();camera.position.copy(direction);camera.lookAt(0,0,0);
  let distance=current?.fit.get(camera.aspect);
  if(distance===undefined){distance=radius*2;const inverse=camera.quaternion.clone().invert(),v=new T.Vector3(),tanY=Math.tan(camera.fov*Math.PI/360),tanX=tanY*camera.aspect;let needed=0;
   current?.model.updateMatrixWorld(true);current?.model.traverseVisible(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyQuaternion(inverse);needed=Math.max(needed,Math.abs(v.x)/tanX+v.z,Math.abs(v.y)/tanY+v.z);}}});
   if(needed>0)distance=needed*1.16;current?.fit.set(camera.aspect,distance);
  }
  camera.position.copy(direction).multiplyScalar(distance);controls?.target.set(0,0,0);controls?.update();render();
 }
 function show(key:string,time=0){const item=cache.get(key);if(!item)return false;
  if(current!==item){if(current)scene.remove(current.model);current=item;scene.add(item.model);radius=item.radius;frame();}
  item.animate(time);for(const f of item.frames)f.material.map=f.textures[Math.floor(time*f.fps)%f.textures.length];render();return true;
 }
 return {
  canvas:renderer.domElement,show,has:(key:string)=>cache.has(key),
  async set(asset:PreviewAsset,key=asset.species){
   if(cache.has(key)){show(key);return;}
   const textures:T.Texture[]=[],materials:T.Material[]=[],frames:Item['frames']=[];const loader=new T.TextureLoader();
   const texture=async(b:string)=>{const t=await loader.loadAsync('data:image/png;base64,'+b);if(closed){t.dispose();throw new Error('closed');}textures.push(t);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t;};
   const animated=async(ref:TextureFrames)=>Promise.all(ref.frames.map(texture));
   const base=await animated(asset.textureAnimation??{frames:[asset.texture],fps:0}),emissiveMap=asset.emissive?await texture(asset.emissive):null;
   const material=new T.MeshStandardMaterial({map:base[0],alphaTest:.1,side:T.DoubleSide,roughness:1,metalness:0,emissiveMap,emissive:emissiveMap?0xffffff:0,emissiveIntensity:1});materials.push(material);
   frames.push({material,textures:base,fps:asset.textureAnimation?.fps??0});
   const model=meshModel(asset,material),animators=[animateModel(model,asset.motion)];
   for(const layer of asset.layers??[]){
    const maps=await animated(layer),options={map:maps[0],alphaTest:.1,side:T.DoubleSide,transparent:layer.translucent,depthWrite:!layer.translucent,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1};
    const mat=layer.emissive?new T.MeshBasicMaterial(options):new T.MeshStandardMaterial({...options,roughness:1});materials.push(mat);frames.push({material:mat,textures:maps,fps:layer.fps});
    const overlay=meshModel(asset,mat);animators.push(animateModel(overlay,asset.motion));model.add(overlay);
   }
   const animate=(t:number)=>animators.forEach(a=>a(t));animate(0);
   const bounds=new T.Box3();model.updateMatrixWorld(true);model.traverseVisible(o=>{if(o instanceof T.Mesh){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));}});
   const size=bounds.getSize(new T.Vector3());model.position.sub(bounds.getCenter(new T.Vector3()));
   const item={model,animate,radius:Math.max(size.length()/2,1),fit:new Map<number,number>(),textures,materials,frames};
   if(closed){disposeItem(item);return;}
   if(cache.size>=(interactive?1:24)){const first=cache.keys().next().value!,old=cache.get(first)!;if(current===old){scene.remove(old.model);current=undefined;}disposeItem(old);cache.delete(first);}
   cache.set(key,item);show(key);
  },
  tick(time:number){if(current){current.animate(time);for(const f of current.frames)f.material.map=f.textures[Math.floor(time*f.fps)%f.textures.length];render();}},
  orbit(angle:number){const distance=camera.position.length();camera.position.set(-.4,.18,-1).normalize().multiplyScalar(distance).applyAxisAngle(new T.Vector3(0,1,0),angle);camera.lookAt(0,0,0);},
  resize(w:number,h:number){if(closed)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();frame();},
  turn(amount:number){camera.position.applyAxisAngle(new T.Vector3(0,1,0),amount);camera.lookAt(0,0,0);controls?.update();render();},
  zoom(factor:number){camera.position.setLength(T.MathUtils.clamp(camera.position.length()*factor,radius*1.1,radius*10));controls?.update();render();},
  reset:frame,
  dispose(){closed=true;cache.forEach(disposeItem);cache.clear();controls?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},
 };
}
