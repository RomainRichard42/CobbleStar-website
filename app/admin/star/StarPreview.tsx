"use client";

import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import s from "./star.module.css";

type Vec = [number, number, number];
type Face = { uv:[number,number]; uv_size:[number,number] };
type Cube = { origin:Vec; size:Vec; uv:[number,number]|Record<string,Face>; pivot?:Vec; rotation?:Vec; inflate?:number; mirror?:boolean };
type Bone = { name:string; parent?:string; pivot?:Vec; rotation?:Vec; mirror?:boolean; inflate?:number; cubes?:Cube[] };
export type PreviewAsset = { species:string; texture:string; emissive?:string; model:{"minecraft:geometry":{description:{texture_width:number;texture_height:number};bones:Bone[]}[]} };
const point = (v:Vec = [0,0,0]) => new T.Vector3(-v[0],v[1],v[2]);
function rotation(group:T.Object3D, v:Vec = [0,0,0]) { group.rotation.set(-v[0]*Math.PI/180,-v[1]*Math.PI/180,v[2]*Math.PI/180,"ZYX"); }

/** Native Bedrock cubes, UVs and bind-pose hierarchy. No guessed silhouette. */
function meshModel(asset:PreviewAsset, material:T.Material) {
 const geo=asset.model["minecraft:geometry"][0];
 const root=new T.Group(), groups=new Map<string,T.Group>(), bones=new Map(geo.bones.map(b=>[b.name,b]));
 for(const bone of geo.bones)groups.set(bone.name,new T.Group());
 for(const bone of geo.bones){
  const group=groups.get(bone.name)!, pivot=point(bone.pivot), parent=bone.parent?bones.get(bone.parent):undefined;
  group.position.copy(pivot).sub(point(parent?.pivot));rotation(group,bone.rotation);
  (parent?groups.get(parent.name)!:root).add(group);
  for(const cube of bone.cubes??[]){
   const [w,h,d]=cube.size, inflate=cube.inflate??bone.inflate??0;
   const geometry=new T.BoxGeometry(Math.max(.001,w+inflate*2),Math.max(.001,h+inflate*2),Math.max(.001,d+inflate*2));
   const uv=geometry.getAttribute("uv"), mirror=cube.mirror??bone.mirror??false;
   const faceNames=["west","east","up","down","south","north"];
   let faces:Record<string,Face>;
   if(Array.isArray(cube.uv)){
    const [u,v]=cube.uv;
    faces={west:{uv:[u+d+w,v+d],uv_size:[d,h]},east:{uv:[u,v+d],uv_size:[d,h]},up:{uv:[u+d,v],uv_size:[w,d]},down:{uv:[u+d+w,v+d],uv_size:[w,-d]},south:{uv:[u+2*d+w,v+d],uv_size:[w,h]},north:{uv:[u+d,v+d],uv_size:[w,h]}};
   }else faces=cube.uv;
   geometry.clearGroups();
   faceNames.forEach((face,index)=>{
    const data=faces[mirror&&face==="east"?"west":mirror&&face==="west"?"east":face];
    if(!data)return;geometry.addGroup(index*6,6,0);
    let u=data.uv[0],du=data.uv_size[0];const v=data.uv[1],dv=data.uv_size[1];
    if(!mirror){u+=du;du=-du;}
    [[u,v],[u+du,v],[u,v+dv],[u+du,v+dv]].forEach(([a,b],i)=>uv.setXY(index*4+i,a/geo.description.texture_width,1-b/geo.description.texture_height));
   });
   const mesh=new T.Mesh(geometry,[material]), cubePivot=point(cube.pivot??bone.pivot);
   mesh.position.copy(point([cube.origin[0]+w/2,cube.origin[1]+h/2,cube.origin[2]+d/2])).sub(cubePivot);
   const holder=new T.Group();holder.position.copy(cubePivot).sub(pivot);rotation(holder,cube.rotation);holder.add(mesh);group.add(holder);
  }
 }
 return root;
}

export default function StarPreview({url,label}:{url:string;label:string}) {
 const host=useRef<HTMLDivElement>(null),[error,setError]=useState("");
 useEffect(()=>{
  const container=host.current;if(!container)return;
  const abort=new AbortController();let closed=false,started=false,cleanup=()=>{};
  async function start(){
   if(started)return;started=true;
   let renderer:T.WebGLRenderer|undefined;
   const textures:T.Texture[]=[];let model:T.Group|undefined,material:T.MeshStandardMaterial|undefined;
   let controls:OrbitControls|undefined,resize:ResizeObserver|undefined;
   cleanup=()=>{closed=true;abort.abort();resize?.disconnect();controls?.dispose();model?.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});material?.dispose();textures.forEach(t=>t.dispose());renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();};
   try{
    const response=await fetch(url,{credentials:"include",cache:"no-store",signal:abort.signal});
    if(!response.ok)throw new Error("Aperçu indisponible. Réessaie après la synchronisation.");
    const {asset}=await response.json() as {asset:PreviewAsset};if(closed)return;
    const loader=new T.TextureLoader();
    async function texture(base64:string){const t=await loader.loadAsync(`data:image/png;base64,${base64}`);if(closed){t.dispose();throw new Error("closed");}textures.push(t);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t;}
    const map=await texture(asset.texture),emissiveMap=asset.emissive?await texture(asset.emissive):null;if(closed)return;
    renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-label",label);renderer.domElement.setAttribute("role","img");container!.appendChild(renderer.domElement);
    const scene=new T.Scene();scene.add(new T.AmbientLight(0xffffff,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(3,5,-4);scene.add(light);
    material=new T.MeshStandardMaterial({map,alphaTest:.1,side:T.DoubleSide,roughness:1,metalness:0,emissiveMap,emissive:emissiveMap?0xffffff:0x000000,emissiveIntensity:1});
    model=meshModel(asset,material);scene.add(model);
    const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());model.position.sub(center);
    const camera=new T.PerspectiveCamera(35,1,.01,10000),radius=Math.max(size.length()/2,1);
    controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.minDistance=radius*1.1;controls.maxDistance=radius*8;
    const render=()=>{if(!closed)renderer?.render(scene,camera);};let framed=false;
    resize=new ResizeObserver(()=>{
     if(!renderer||closed)return;const width=container!.clientWidth,height=container!.clientHeight;if(!width||!height)return;
     renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
     if(!framed){const angle=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));const distance=radius/Math.sin(angle)*1.05;camera.position.set(-.4,.18,-1).normalize().multiplyScalar(distance);controls!.update();framed=true;}
     render();
    });resize.observe(container!);controls.addEventListener("change",render);
   }catch(e){if(!closed){setError(e instanceof Error?e.message:"Aperçu 3D indisponible");cleanup();}}
  }
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();void start();}});
  observer.observe(container);
  return()=>{closed=true;abort.abort();observer.disconnect();cleanup();};
 },[url,label]);
 return <div className={s.preview} ref={host}>{error?<p role="status">{error}</p>:<span className={s.previewHint}>Glisser pour tourner · molette pour zoomer</span>}</div>;
}
