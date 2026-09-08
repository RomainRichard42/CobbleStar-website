// Exported production UI with isolated API fixtures. No live server/account writes.
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { arenaContent, arenaPuzzles, epreuveSites } from "../api/dist/arena-studio-schema.js";
import { content, catalog, pokemon, trainer, rewards } from "../api/test/fixtures/arena-studio.mjs";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const root=resolve("out"), server=createServer(async(req,res)=>{
  try {const path=new URL(req.url,"http://localhost").pathname,file=resolve(root,`.${path.endsWith("/")?path+"index.html":path}`);if(!file.startsWith(root+sep))return res.writeHead(403).end();res.setHeader("Content-Type",({".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml"})[extname(file)]??"application/octet-stream");res.end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const browser=await chromium.launch({headless:true});
const previous=content();previous.stages[0].champion="Capitaine conservé";previous.stages[10].team[0].level=77;
const observed={schemaVersion:2,legacyLeagueStages:previous.stages.filter(s=>["elite_electric","elite_ground"].includes(s.id)),stages:epreuveSites.map(([id,theme,x,z],i)=>{
 const old=previous.stages.find(s=>s.id===id), stage=old?{...structuredClone(old),index:i+1,x,z}:{...structuredClone(previous.stages[12]),id,theme,x,z,index:i+1,name:id,champion:"",team:[],level:100};
 if(!stage.league){stage.trial={enabled:true,puzzleId:arenaPuzzles[id],intro:"Parcours reçu du serveur.",hint:"Les indices viennent des rencontres.",alpha:{name:"Totem du parcours",pokemon:pokemon(),rewards:rewards()}};stage.trainers=[trainer(),{...trainer(),id:"second",slot:1}];}
 return stage;
})};
let state={content:previous,observed,catalog:catalog(),draftRevision:1,publishedRevision:0,appliedRevision:0,hasUnpublishedChanges:true,lastSeenAt:new Date().toISOString(),error:"",history:[],canWrite:true};
let saves=0,publishes=0;const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on("pageerror",e=>errors.push(e.message));
 await page.route("https://**",r=>r.abort());
 await page.route("**/api/**",async route=>{const req=route.request(),url=new URL(req.url());
  if(url.pathname==="/api/admin/arenas")return route.fulfill({json:{servers:[{serverId:"epreuves-fixture"}],canWrite:true}});
  if(req.method()==="PUT"){state.content=arenaContent.parse(req.postDataJSON().content);state.draftRevision++;saves++;return route.fulfill({json:{draftRevision:state.draftRevision}});}
  if(req.method()==="POST"){publishes++;throw Error("Validation UI must not publish to game");}
  return route.fulfill({json:state});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}/admin/arenes/`,{waitUntil:"networkidle"});
 await page.getByText("Migration préparée dans ton brouillon",{exact:false}).waitFor();
 await page.getByText(/Préparation nécessaire —/).waitFor();
 assert.equal(await page.getByText(/tous les Pokémon doivent être de niveau 50–55/).count(),2,"Actual level guard diagnosed for Captain and first saved trainer, without modifying them");
 assert.equal(await page.getByLabel("Nom du Capitaine",{exact:true}).inputValue(),"Capitaine conservé");
 assert.equal(saves,0,"Observations cannot autosave migration");
 await page.getByRole("button",{name:"2 Équipe",exact:true}).click();
 await page.getByRole("combobox",{name:"Pokémon principal du Capitaine",exact:true}).selectOption("0");
 await page.getByRole("button",{name:/^Enregistrer/}).click();await page.getByRole("status").filter({hasText:"Brouillon enregistré"}).waitFor();
 assert.equal(state.content.schemaVersion,2);
 assert.equal(state.content.stages[0].champion,"Capitaine conservé");
 assert.equal(state.content.stages[8].team[0].level,77,"Ghost team kept by semantic ID, not old Electric slot");
 assert.ok(state.content.stages[0].signaturePokemonId);
 assert.deepEqual(state.content.stages[10].team,[]);assert.equal(state.content.stages[10].champion,"");
 assert.deepEqual(state.content.legacyLeagueStages,previous.stages.filter(s=>["elite_electric","elite_ground"].includes(s.id)));
 assert.equal(await page.getByRole("button",{name:/^(Facile|Difficile)$/}).count(),0,"No second difficulty");
 await page.getByRole("button",{name:/^4 Dresseurs/}).click();
 await page.getByRole("button",{name:"＋ Préparer un dresseur",exact:true}).click();
 assert.equal(await page.getByRole("button",{name:"＋ Préparer un dresseur",exact:true}).isDisabled(),true,"A third active trainer cannot be created");
 await page.getByRole("button",{name:"5 Parcours",exact:true}).click();
 await page.getByRole("heading",{name:"La Maison des métamorphoses",exact:true}).waitFor();
 assert.equal(await page.getByText("Le Totem vient de l’équipe du Capitaine.",{exact:true}).count(),1);
 assert.equal(await page.getByRole("button",{name:/^(Facile|Difficile)$/}).count(),0);
 await mkdir("ui-review-arena-studio",{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1100});
  await page.getByRole("heading",{name:"La Maison des métamorphoses",exact:true}).scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"No horizontal overflow");
  await page.screenshot({path:`ui-review-arena-studio/epreuves-plan-${width}.png`});
 }
 await page.setViewportSize({width:1440,height:1100});
 await page.getByRole("button",{name:/elite_fairy/}).click();
 await page.getByRole("button",{name:"5 Parcours",exact:true}).click();
 await page.getByRole("heading",{name:"Le Palais des Horizons.",exact:true}).waitFor();
 await page.screenshot({path:"ui-review-arena-studio/epreuves-ligue-1440.png"});
 assert.equal(publishes,0);assert.equal(saves,1);assert.deepEqual(errors,[]);
 console.log("PASS: production UI migration, semantic team preservation, unconfigured Fairy/Steel, one team/principal, two-trainer cap, native plans, desktop/mobile no overflow; zero publications");
}finally{await browser.close();await new Promise(r=>server.close(r));}
