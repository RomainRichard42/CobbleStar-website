import * as THREE from 'three';
export const BALL_HINGE=4*3.2/4.25;
/** Native Cobblemon cuboids and UVs, matching GashaponBallModel's split lid and relief button. */
export async function createBallFactory(resources:{geometries:THREE.BufferGeometry[];materials:THREE.Material[]},textures:THREE.Texture[]){
 const model=await fetch('/crates/balls/model.json').then(r=>r.json());
 const loader=new THREE.TextureLoader(),kinds=['poke_ball','great_ball','ultra_ball','master_ball','constellation_ball'];
 const maps=await Promise.all(kinds.map(id=>loader.loadAsync('/crates/balls/'+id+'.png')));
 const materials=new Map<string,THREE.MeshBasicMaterial>();maps.forEach((map,i)=>{map.colorSpace=THREE.SRGBColorSpace;map.magFilter=THREE.NearestFilter;map.minFilter=THREE.NearestFilter;map.generateMipmaps=false;textures.push(map);const material=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,alphaTest:.1});materials.set(kinds[i],material);resources.materials.push(material);});
 const geometries=[false,true].map(upper=>{const p:number[]=[],uvs:number[]=[];for(const el of model.elements){if(el.name==='button'||el.name.startsWith('top_')!==upper)continue;const [x0,y0,z0]=el.from,[x1,y1,z1]=el.to;
 const faces:Record<string,number[][]>={north:[[x1,y1,z0],[x1,y0,z0],[x0,y0,z0],[x0,y1,z0]],south:[[x0,y1,z1],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1]],east:[[x1,y1,z1],[x1,y0,z1],[x1,y0,z0],[x1,y1,z0]],west:[[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1]],up:[[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]],down:[[x0,y0,z1],[x0,y0,z0],[x1,y0,z0],[x1,y0,z1]]};
 for(const [dir,value] of Object.entries(el.faces)){const f=value as {uv:number[];rotation?:number};const [u0,v0,u1,v1]=f.uv;const coords=[[u0,v0],[u0,v1],[u1,v1],[u1,v0]];for(const i of [0,1,2,0,2,3]){const v=faces[dir][i];p.push(v[0]*3.2/4.25,(v[1]-4)*3.2/4.25,v[2]*3.2/4.25-(upper?BALL_HINGE:0));const q=coords[(i+(f.rotation||0)/90)%4];uvs.push(q[0]/16,1-q[1]/16);}}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));resources.geometries.push(g);return g;});
 const buttons=[[.94,-3.22,-3.38,0x232837],[.70,-3.39,-3.57,0xf6f7ff]].map(([half,back,front,color])=>{const geometry=new THREE.BoxGeometry(half*2,half*2,back-front);geometry.translate(0,0,(back+front)/2-BALL_HINGE);const material=new THREE.MeshBasicMaterial({color});resources.geometries.push(geometry);resources.materials.push(material);return {geometry,material};});
 return (kind:string)=>{const root=new THREE.Group(),top=new THREE.Group();root.add(new THREE.Mesh(geometries[0],materials.get(kind)));top.position.z=BALL_HINGE;top.add(new THREE.Mesh(geometries[1],materials.get(kind)));for(const b of buttons)top.add(new THREE.Mesh(b.geometry,b.material));root.add(top);return {root,top};};
}
