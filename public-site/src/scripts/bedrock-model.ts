import * as T from "three";
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Motion} from './bedrock-motion';
type Vec = [number, number, number];
type Face = { uv:[number,number]; uv_size:[number,number] };
type Cube = { origin:Vec; size:Vec; uv:[number,number]|Record<string,Face>; pivot?:Vec; rotation?:Vec; inflate?:number; mirror?:boolean };
type Bone = { name:string; parent?:string; pivot?:Vec; rotation?:Vec; mirror?:boolean; inflate?:number; cubes?:Cube[] };
export type TextureFrames={frames:string[];fps:number};
export type PreviewAsset = { species:string; texture:string; emissive?:string; textureAnimation?:TextureFrames;layers?:(TextureFrames&{emissive:boolean;translucent:boolean})[];motion?:Motion;model:{"minecraft:geometry":{description:{texture_width:number;texture_height:number};bones:Bone[]}[]} };
const point = (v:Vec = [0,0,0]) => new T.Vector3(-v[0],v[1],v[2]);
function rotation(group:T.Object3D, v:Vec = [0,0,0]) { group.rotation.set(-v[0]*Math.PI/180,-v[1]*Math.PI/180,v[2]*Math.PI/180,"ZYX"); }

/** Native Bedrock cubes, UVs and bind-pose hierarchy. No guessed silhouette. */
export function meshModel(asset:PreviewAsset, material:T.Material) {
 const geo=asset.model["minecraft:geometry"][0];
 const root=new T.Group(), groups=new Map<string,T.Group>(), bones=new Map(geo.bones.map(b=>[b.name,b]));
 for(const bone of geo.bones){const group=new T.Group();group.name=bone.name;group.userData.bedrockBone=true;groups.set(bone.name,group);}
 for(const bone of geo.bones){
  const group=groups.get(bone.name)!, pivot=point(bone.pivot), parent=bone.parent?bones.get(bone.parent):undefined;
  group.position.copy(pivot).sub(point(parent?.pivot));rotation(group,bone.rotation);
  (parent?groups.get(parent.name)!:root).add(group);
  const pieces:T.BufferGeometry[]=[];
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
   const indices=Array.from(geometry.getIndex()!.array),visibleIndices=geometry.groups.flatMap(g=>indices.slice(g.start,g.start+g.count));geometry.setIndex(visibleIndices);geometry.clearGroups();
   const mesh=new T.Mesh(geometry,material), cubePivot=point(cube.pivot??bone.pivot);
   mesh.position.copy(point([cube.origin[0]+w/2,cube.origin[1]+h/2,cube.origin[2]+d/2])).sub(cubePivot);
   const holder=new T.Group();holder.position.copy(cubePivot).sub(pivot);rotation(holder,cube.rotation);holder.add(mesh);holder.updateMatrixWorld(true);geometry.applyMatrix4(mesh.matrixWorld);pieces.push(geometry);
  }
  if(pieces.length){const merged=mergeGeometries(pieces,false);pieces.forEach(p=>p.dispose());if(merged)group.add(new T.Mesh(merged,material));}
 }
 return root;
}


