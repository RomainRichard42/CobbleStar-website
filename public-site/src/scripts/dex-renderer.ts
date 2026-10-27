import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {meshModel,type PreviewAsset} from './bedrock-model';

export function createDexRenderer(interactive=false){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.add(new T.AmbientLight(0xffffff,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(3,5,-4);scene.add(light);
 const camera=new T.PerspectiveCamera(35,1,.01,10000);
 const controls=interactive?new OrbitControls(camera,renderer.domElement):null;
 if(controls){controls.enableZoom=false;controls.enablePan=false;controls.addEventListener('change',render);}
 let model:T.Group|undefined,material:T.MeshStandardMaterial|undefined,textures:T.Texture[]=[],radius=1,closed=false;
 function render(){if(!closed)renderer.render(scene,camera);}
 function clear(){if(model){scene.remove(model);model.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});model=undefined;}material?.dispose();textures.forEach(t=>t.dispose());textures=[];}
 function frame(){const angle=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));camera.position.set(-.4,.18,-1).normalize().multiplyScalar(radius/Math.sin(angle)*1.05);camera.lookAt(0,0,0);controls?.target.set(0,0,0);controls?.update();render();}
 return {
  canvas:renderer.domElement,
  async set(asset:PreviewAsset){
   clear();const loader=new T.TextureLoader();
   const texture=async(b:string)=>{const t=await loader.loadAsync('data:image/png;base64,'+b);if(closed){t.dispose();throw new Error('closed');}textures.push(t);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t;};
   const map=await texture(asset.texture),emissiveMap=asset.emissive?await texture(asset.emissive):null;if(closed)return;
   material=new T.MeshStandardMaterial({map,alphaTest:.1,side:T.DoubleSide,roughness:1,metalness:0,emissiveMap,emissive:emissiveMap?0xffffff:0,emissiveIntensity:1});model=meshModel(asset,material);scene.add(model);
   const bounds=new T.Box3().setFromObject(model);radius=Math.max(bounds.getSize(new T.Vector3()).length()/2,1);model.position.sub(bounds.getCenter(new T.Vector3()));frame();
  },
  resize(w:number,h:number){if(closed)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();frame();},
  turn(amount:number){camera.position.applyAxisAngle(new T.Vector3(0,1,0),amount);camera.lookAt(0,0,0);controls?.update();render();},
  zoom(factor:number){camera.position.setLength(T.MathUtils.clamp(camera.position.length()*factor,radius*1.1,radius*10));controls?.update();render();},
  reset:frame,
  dispose(){closed=true;clear();controls?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();},
 };
}
