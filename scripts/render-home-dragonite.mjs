// Transparent fallback rendered from the published Star model and its real idle pose.
// No illustration generation or texture editing.
import {writeFileSync} from 'node:fs';
import * as T from 'three';
import sharp from 'sharp';
import {meshModel} from '../public-site/src/scripts/bedrock-model.ts';
import {animateModel} from '../public-site/src/scripts/bedrock-motion.ts';
const response=await fetch('https://cobblestar-mc.fr/api/pokedex/star-dragonite-base/asset');if(!response.ok)throw Error('Published model unavailable');
const {asset}=await response.json(),model=meshModel(asset,new T.MeshBasicMaterial());animateModel(model,asset.motion)(.4);
const {data:tex,info}=await sharp(Buffer.from(asset.texture,'base64')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const camera=new T.PerspectiveCamera();camera.position.set(-.4,.18,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);const inverse=camera.matrixWorldInverse;
const tris=[];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
model.traverseVisible(o=>{if(!(o instanceof T.Mesh))return;const geo=o.geometry,p=geo.getAttribute('position'),uv=geo.getAttribute('uv'),indices=geo.getIndex().array;for(let i=0;i<indices.length;i+=3){const tri=[];for(let j=0;j<3;j++){const k=indices[i+j],v=new T.Vector3().fromBufferAttribute(p,k).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);minX=Math.min(minX,v.x);minY=Math.min(minY,v.y);maxX=Math.max(maxX,v.x);maxY=Math.max(maxY,v.y);tri.push({x:v.x,y:v.y,z:v.z,u:uv.getX(k),v:uv.getY(k)});}tris.push(tri);}});
const N=1400,pixels=Buffer.alloc(N*N*4),depth=new Float64Array(N*N).fill(-Infinity),scale=N*.88/Math.max(maxX-minX,maxY-minY),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
for(const tri of tris){const [a,b,c]=tri.map(v=>({...v,x:(v.x-cx)*scale+N/2,y:N/2-(v.y-cy)*scale}));const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<.001)continue;
 const normal=new T.Vector3().subVectors(new T.Vector3(tri[1].x,tri[1].y,tri[1].z),new T.Vector3(tri[0].x,tri[0].y,tri[0].z)).cross(new T.Vector3().subVectors(new T.Vector3(tri[2].x,tri[2].y,tri[2].z),new T.Vector3(tri[0].x,tri[0].y,tri[0].z))).normalize();const shade=.76+.24*Math.abs(normal.dot(new T.Vector3(-.3,.7,1).normalize()));
 for(let y=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y)));y<=Math.min(N-1,Math.ceil(Math.max(a.y,b.y,c.y)));y++)for(let x=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x)));x<=Math.min(N-1,Math.ceil(Math.max(a.x,b.x,c.x)));x++){
  const w0=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/den,w1=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/den,w2=1-w0-w1;if(Math.min(w0,w1,w2)<-.00001)continue;const z=w0*a.z+w1*b.z+w2*c.z,k=y*N+x;if(z<depth[k])continue;
  const u=w0*a.u+w1*b.u+w2*c.u,v=w0*a.v+w1*b.v+w2*c.v,tx=Math.max(0,Math.min(info.width-1,Math.floor(u*info.width))),ty=Math.max(0,Math.min(info.height-1,Math.floor((1-v)*info.height))),t=(ty*info.width+tx)*4;if(tex[t+3]<26)continue;depth[k]=z;for(let n=0;n<3;n++)pixels[k*4+n]=Math.round(tex[t+n]*shade);pixels[k*4+3]=tex[t+3];
 }
}
writeFileSync('public/astral/assets/dragonite-star-posed.png',await sharp(pixels,{raw:{width:N,height:N,channels:4}}).resize(900,900).png().toBuffer());console.log('Published Dragonite Star rendered in native idle pose.');
