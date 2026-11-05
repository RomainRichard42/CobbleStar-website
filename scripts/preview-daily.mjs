// Local-only sandbox for the real exported admin page. No credentials or remote API.
import {createServer} from "node:http";
import {readFile,stat,realpath} from "node:fs/promises";
import {resolve,sep,extname} from "node:path";
import {emptyCalendar,dailyCalendar,validateCalendar,parisDate} from "../api/dist/daily-schema.js";
const root=await realpath(new URL("../out/",import.meta.url));
const port=Number(process.argv[2]??8816),months=new Map();
const items=[{id:"cobblemon:poke_ball",label:"Poké Ball"},{id:"cobblemon:great_ball",label:"Super Ball"},{id:"cobblemon:ultra_ball",label:"Hyper Ball"},{id:"cobblestar_planets:key_vote",label:"Jeton Vote"},{id:"cobblestar_planets:booster_asteria",label:"Booster Astéria"}];
function monthData(month){
 if(!months.has(month)){
  const content=emptyCalendar(month);
  if(month===parisDate().slice(0,7))content.days=content.days.map((r,i)=>({...r,label:(i+1)%7===0?"Le rendez-vous de la semaine":"Réserve de Poké Balls",cobbleCoins:(i+1)%7===0?1000:100,items:[{item:items[(i+1)%7===0?3:0].id,count:(i+1)%7===0?1:5}]}));
  months.set(month,{month,content,revision:0,publishedRevision:null,published:null,canWrite:true,items,claims:[],stats:[]});
 }
 return months.get(month);
}
const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml",".woff2":"font/woff2",".json":"application/json"};
const server=createServer(async(req,res)=>{
 const json=(status,value)=>{res.writeHead(status,{"Content-Type":"application/json"});res.end(JSON.stringify(value));};
 res.setHeader("Cache-Control","no-store");
 if(!["127.0.0.1:"+port,"localhost:"+port].includes(req.headers.host)||req.headers["sec-fetch-site"]==="cross-site")return json(403,{message:"Aperçu local uniquement."});
 try{
  const url=new URL(req.url,"http://127.0.0.1:"+port),match=url.pathname.match(/^\/api\/admin\/daily\/(20\d{2}-(?:0[1-9]|1[0-2]))(\/publish)?$/);
  if(match){
   const data=monthData(match[1]);
   if(req.method==="GET")return json(200,data);
   if(req.headers.origin!=="http://127.0.0.1:"+port)return json(403,{message:"Origine locale requise."});
   let raw="";for await(const chunk of req){raw+=chunk;if(raw.length>100000)throw Error("Requête trop longue");}
   const body=JSON.parse(raw);if(body.revision!==data.revision)return json(409,{message:"Recharge ce mois : il a été modifié."});
   if(req.method==="PUT"&&!match[2]){data.content=dailyCalendar.parse(body.content);validateCalendar(match[1],data.content);data.revision++;return json(200,{revision:data.revision});}
   if(req.method==="POST"&&match[2]){validateCalendar(match[1],data.content,true);data.published=structuredClone(data.content);data.publishedRevision=data.revision;return json(200,{ok:true});}
   return json(405,{});
  }
  if(url.pathname.startsWith("/api/"))return json(401,{message:"Aperçu local, aucun compte connecté."});
  if(!["GET","HEAD"].includes(req.method))return json(405,{});
  let path=resolve(root,"."+decodeURIComponent(url.pathname));
  if(!path.startsWith(root+sep)&&path!==root)return json(403,{});
  if((await stat(path)).isDirectory())path=resolve(path,"index.html");
  let bytes=await readFile(path);const type=types[extname(path)]??"application/octet-stream";
  if(type.startsWith("text/html"))bytes=Buffer.from(bytes.toString().replace(/(<body[^>]*>)/,'$1<aside style="padding:10px;text-align:center;background:#342242;color:#f4dcaa;font:600 14px Arial">APERÇU LOCAL — récompenses fictives, aucune modification du serveur</aside>'));
  res.writeHead(200,{"Content-Type":type});res.end(req.method==="HEAD"?undefined:bytes);
 }catch(e){json(400,{message:e.message});}
});
server.listen(port,"127.0.0.1",()=>console.log("Daily admin preview http://127.0.0.1:"+port+"/admin/daily/"));
