import { access, cp, mkdir, rm, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const deployDir = join(projectDir, "deploy");

const required = [
  "out/index.html",
  "api/dist/server.js",
  "api/migrations/001_initial.sql",
  "api/shop.catalog.json",
  "api/vote-sites.json",
  "wiki.default.json",
  "news.default.json",
  "api/package.json",
  "api/package-lock.json",
  "api/star-templates/index.json",
  "api/star-effects/manifest.json",
  "api/regional-starters/manifest.json",
];

for (const relativePath of required) {
  const absolutePath = join(projectDir, relativePath);
  try {
    await access(absolutePath, constants.R_OK);
  } catch {
    throw new Error(`Fichier de build manquant : ${absolutePath}`);
  }
}

await rm(deployDir, { recursive: true, force: true });
await Promise.all([
  mkdir(join(deployDir, "site"), { recursive: true }),
  mkdir(join(deployDir, "dist"), { recursive: true }),
  mkdir(join(deployDir, "migrations"), { recursive: true }),
]);

await cp(join(projectDir, "out"), join(deployDir, "site"), { recursive: true });
await cp(join(projectDir, "api", "dist"), join(deployDir, "dist"), { recursive: true });
await cp(join(projectDir, "api", "migrations"), join(deployDir, "migrations"), { recursive: true });
await cp(join(projectDir, "api", "licenses"), join(deployDir, "licenses"), { recursive: true });
await cp(join(projectDir, "api", "star-templates"), join(deployDir, "star-templates"), { recursive: true });
await cp(join(projectDir, "api", "star-layers"), join(deployDir, "star-layers"), { recursive: true });
await cp(join(projectDir, "api", "star-effects"), join(deployDir, "star-effects"), { recursive: true });
await cp(join(projectDir, "api", "regional-starters"), join(deployDir, "regional-starters"), { recursive: true });
await mkdir(join(deployDir,"star-addon-templates"),{recursive:true});
const addonDir=join(projectDir,"api","star-addon-templates");
const addonIndex=JSON.parse(await readFile(join(addonDir,"index.json"),"utf8"));
await cp(join(addonDir,"index.json"),join(deployDir,"star-addon-templates","index.json"));
for(const row of addonIndex.species){
  if(!/^[a-z0-9_]{1,80}$/.test(row.species))throw new Error("Invalid addon template species");
  await cp(join(addonDir,row.species+".zip"),join(deployDir,"star-addon-templates",row.species+".zip"));
}

for (const file of ["package.json", "package-lock.json", "shop.catalog.json", "vote-sites.json", ".env.example", "README-KINETIC.md"]) {
  await cp(join(projectDir, "api", file), join(deployDir, file));
}

await cp(join(projectDir, "wiki.default.json"), join(deployDir, "wiki.default.json"));
await cp(join(projectDir, "news.default.json"), join(deployDir, "news.default.json"));

console.log(`Artefact Kinetic créé dans ${deployDir}`);
