// Real compiled UI, synthetic server responses; no production data or game mutations.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { studioContent, emptyStudio } from '../api/dist/quest-studio-schema.js';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root=resolve('out');
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const file=resolve(root,`.${path.endsWith('/')?path+'index.html':path}`);if(!file.startsWith(root+sep))return res.writeHead(403).end();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
let state={content:structuredClone(emptyStudio),observed:structuredClone(emptyStudio),draftRevision:0,publishedRevision:0,appliedRevision:0,lastSeenAt:new Date().toISOString(),error:'',canWrite:true,placements:[],history:[]};
let saves=0,publishes=0,denied=false;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**',r=>r.abort());
 await page.route('**/api/**',r=>{
  const url=new URL(r.request().url()),method=r.request().method();
  if(denied)return r.fulfill({status:403,json:{error:'GAME_ADMIN_REQUIRED'}});
  if(url.pathname==='/api/admin/quests')return r.fulfill({json:{servers:[{serverId:'fixture'}],canWrite:state.canWrite}});
  if(method==='PUT'){const input=r.request().postDataJSON();const parsed=studioContent.safeParse(input.content);if(!parsed.success)return r.fulfill({status:400,json:{message:parsed.error.message}});state.content=parsed.data;state.draftRevision++;saves++;return r.fulfill({json:{draftRevision:state.draftRevision}});}
  if(method==='POST'){publishes++;state.publishedRevision++;return r.fulfill({json:{publishedRevision:state.publishedRevision}});}
  return r.fulfill({json:state});
 });
 const url=`http://127.0.0.1:${server.address().port}/admin/creation/`;
 await page.goto(url,{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'+ Créer une quête',exact:true}).click();
 await page.getByLabel('Titre',{exact:true}).fill('Rencontre de test');
 await page.getByRole('button',{name:'+ Ajouter une récompense',exact:true}).click();
 await page.getByRole('button',{name:/^Enregistrer/}).click();
 await page.getByRole('status').filter({hasText:'Brouillon enregistré'}).waitFor();
 assert.equal(saves,1);assert.equal(publishes,0);assert.equal(state.content.questConfig.quests[0].title,'Rencontre de test');
 await page.getByRole('button',{name:'PNJ',exact:true}).click();await page.getByRole('button',{name:'+ Créer un PNJ',exact:true}).click();
 await page.getByLabel('Nom du PNJ · liaison du bâton',{exact:true}).fill('Professeur Test');
 await page.getByLabel('Rencontre de test',{exact:true}).check();
 await page.getByRole('button',{name:'+ Ajouter une réponse',exact:true}).click();
 await page.getByLabel('Action',{exact:true}).selectOption(`accept:${state.content.questConfig.quests[0].id}`);
 await page.getByRole('button',{name:/^Enregistrer/}).click();await page.getByRole('status').filter({hasText:'Brouillon enregistré'}).waitFor();
 assert.equal(saves,2);assert.equal(state.content.npcs[0].name,'Professeur Test');assert.ok(state.content.npcs[0].dialogueGraph.nodes[0].choices[0].action.startsWith('accept:'));
 await page.getByRole('button',{name:'Publier en jeu',exact:true}).click();assert.equal(publishes,0);
 await page.getByLabel('Motif de publication').fill('Publication de test uniquement');
 await page.getByRole('button',{name:'Confirmer la publication',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Version 1 publiée'}).waitFor();assert.equal(publishes,1);
 await page.getByRole('button',{name:'PNJ',exact:true}).click();
 await mkdir('ui-review-quest-studio',{recursive:true});await page.screenshot({path:'ui-review-quest-studio/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'ui-review-quest-studio/mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No mobile overflow');
 state.canWrite=false;await page.reload({waitUntil:'networkidle'});assert.equal(await page.getByRole('button',{name:'Publier en jeu',exact:true}).count(),0);
 denied=true;await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('fieldset').count(),0);
 assert.deepEqual(errors,[]);console.log('Quest Studio UI: create quest/reward/NPC/choice, save, explicit publication, mobile and read-only/denied access OK');
}finally{await browser.close();await new Promise(r=>server.close(r));}
