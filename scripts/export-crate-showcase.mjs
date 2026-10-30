import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const mod=process.argv[2];if(!mod)throw Error('Pass the CobbleStar mod source directory');
const out=resolve('public-site/static/crates');mkdirSync(out,{recursive:true});
const catalogue=JSON.parse(readFileSync(join(out,'catalog.json'))),native=JSON.parse(readFileSync(join(out,'balls/model.json')));const textures=new Map();for(const id of ['poke_ball','great_ball','ultra_ball','master_ball','constellation_ball']){const {data,info}=await sharp(join(out,'balls',id+'.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});textures.set(id,{data,info});}
const rotate=(p,axis,r)=>{const a=(axis+1)%3,b=(axis+2)%3,x=p[a],y=p[b];p[a]=x*Math.cos(r)-y*Math.sin(r);p[b]=x*Math.sin(r)+y*Math.cos(r);};
const provenance={source:'CobbleStar-mod/src/main/resources/assets/cobblestar_planets/models/cosmic',generatedAt:new Date().toISOString(),files:[]};
for(const id of ['vote','nova','pulsar','quasar']){
 const motion=JSON.parse(readFileSync(join(out,'motion-'+id+'.json'))),rest=motion.frames[0];const rewards=catalogue.crates.find(c=>c.id===id).tiers.flatMap(t=>t.rewards.map(r=>({...r,ball:t.ball})));
 const models={};for(const kind of ['crate','ball','key']){const bytes=readFileSync(join(mod,'src/main/resources/assets/cobblestar_planets/models/cosmic',kind+'_'+id+'.json'));const m=JSON.parse(bytes);models[kind]={palette:m.palette,tokenSlot:m.tokenSlot,tokenYaw:m.tokenYaw,faces:m.faces.map(f=>({part:f.part,material:f.material,alpha:f.alpha??255,p:f.p.map(p=>p.map(x=>Math.round(x*10000)/10000))}))};provenance.files.push({file:kind+'_'+id+'.json',sha256:createHash('sha256').update(bytes).digest('hex')});}
 writeFileSync(join(out,id+'.json'),JSON.stringify(models));
 const faces=[];
 function add(m,ballIndex=-1){for(const f of m.faces){const ps=f.p.map(p=>{p=[...p];if(ballIndex>=0){p=p.map(x=>x*motion.scale);p=p.map((x,k)=>x+rest.balls[ballIndex][k]);}else{const c=rest.claw,r=rest.carriage;if(f.part==='crossbeam')p[2]+=r[2];if(f.part==='carriage'){p[0]+=r[0];p[2]+=r[2];}if(f.part==='cable'){p[1]*=38.2-c[1];p=p.map((x,k)=>x+c[k]);}if(f.part==='claw'||f.part.startsWith('finger_')){if(f.part.startsWith('finger_')){p[0]-=1;p[1]+=.5;rotate(p,2,52*Math.PI/180);p[0]+=1;p[1]-=.5;rotate(p,1,Number(f.part.slice(7))*Math.PI*2/3);}p=p.map((x,k)=>x*motion.scale+c[k]);}}return p;});faces.push({p:ps,color:m.palette[f.material],alpha:f.alpha});}}
 add(models.crate);
 for(let n=0;n<rest.balls.length;n++)for(const el of native.elements){if(el.name==='button')continue;const [x0,y0,z0]=el.from,[x1,y1,z1]=el.to;
 const quads={north:[[x1,y1,z0],[x1,y0,z0],[x0,y0,z0],[x0,y1,z0]],south:[[x0,y1,z1],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1]],east:[[x1,y1,z1],[x1,y0,z1],[x1,y0,z0],[x1,y1,z0]],west:[[x0,y1,z0],[x0,y0,z0],[x0,y0,z1],[x0,y1,z1]],up:[[x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0]],down:[[x0,y0,z1],[x0,y0,z0],[x1,y0,z0],[x1,y0,z1]]};
 for(const [dir,f] of Object.entries(el.faces)){const [u0,v0,u1,v1]=f.uv;const coords=[[u0,v0],[u0,v1],[u1,v1],[u1,v0]];faces.push({p:quads[dir].map(([x,y,z])=>[x,y-4,z].map((v,k)=>v*3.2/4.25*motion.scale+rest.balls[n][k])),alpha:255,color:0xffffff,uv:coords.map((_,i)=>coords[(i+(f.rotation||0)/90)%4]),texture:textures.get(rewards[n].ball)});}
 }

 const size=1000,pixels=Buffer.alloc(size*size*4),depth=new Float64Array(size*size).fill(-Infinity),scale=14;
 const project=([x,y,z])=>[size*.5-((x-16)*.94+(z-16)*.34)*scale,size*.92+(x*.05-z*.15-y)*scale,x*.34-z*.94+y*.15];
 const edge=(a,b,x,y)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
 faces.sort((a,b)=>a.alpha===255&&b.alpha!==255?-1:a.alpha!==255&&b.alpha===255?1:a.p.reduce((s,p)=>s+project(p)[2],0)-b.p.reduce((s,p)=>s+project(p)[2],0));
 for(const f of faces){const points=f.p.map(project);for(let t=1;t<points.length-1;t++){const a=points[0],b=points[t],c=points[t+1],area=edge(a,b,c[0],c[1]);if(Math.abs(area)<1e-8)continue;const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(size-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(size-1,Math.ceil(Math.max(a[1],b[1],c[1])));for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const u=edge(b,c,x+.5,y+.5)/area,v=edge(c,a,x+.5,y+.5)/area,w=1-u-v;if(Math.min(u,v,w)<-1e-9)continue;const z=u*a[2]+v*b[2]+w*c[2],i=y*size+x;if(z<depth[i]-.0001)continue;let color=f.color,alpha=f.alpha;if(f.texture){const tx=f.texture,uv=[0,1].map(k=>(u*f.uv[0][k]+v*f.uv[t][k]+w*f.uv[t+1][k])/16);const ix=Math.max(0,Math.min(tx.info.width-1,Math.floor(uv[0]*tx.info.width))),iy=Math.max(0,Math.min(tx.info.height-1,Math.floor(uv[1]*tx.info.height))),o=(iy*tx.info.width+ix)*4;alpha=tx.data[o+3];if(alpha<25)continue;color=(tx.data[o]<<16)|(tx.data[o+1]<<8)|tx.data[o+2];}const al=alpha/255,old=pixels[i*4+3]/255,newAlpha=al+old*(1-al);for(let k=0;k<3;k++)pixels[i*4+k]=(((color>>(16-k*8))&255)*al+pixels[i*4+k]*old*(1-al))/newAlpha;pixels[i*4+3]=newAlpha*255;if(f.alpha===255)depth[i]=z;}}}
 await sharp(pixels,{raw:{width:size,height:size,channels:4}}).resize(640,640).webp({quality:90}).toFile(join(out,id+'.webp'));
 console.log(id,models.crate.faces.length,'cabinet faces exported');
}
writeFileSync(join(out,'sources.json'),JSON.stringify(provenance,null,2));
