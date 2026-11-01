import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('public-site/static/media',{recursive:true});
const logo='public/astral/assets/logo-cercle-5.png';
for(const size of [128,480])await sharp(logo).resize(size,size,{fit:'inside',withoutEnlargement:true}).webp({quality:90,alphaQuality:100}).toFile(`public-site/static/media/logo-cercle-5-${size}.webp`);
for(const size of [96,180])await sharp(logo).resize(size,size,{fit:'contain',background:{r:8,g:6,b:22,alpha:1}}).png({compressionLevel:9}).toFile(`public-site/static/media/logo-cercle-5-${size}.png`);
// Retain old public asset URLs for existing news, exports and bookmarked previews.
await sharp(logo).resize(1024,1024,{fit:'inside'}).png({compressionLevel:9}).toFile('public/cobblestar-logo.png');
for(const path of ['public/astral/assets/logo.webp','public/apercus/astral/assets/logo.webp'])await sharp(logo).resize(480,480,{fit:'inside'}).webp({quality:90,alphaQuality:100}).toFile(path);
await sharp(logo).resize(128,128,{fit:'inside'}).webp({quality:90,alphaQuality:100}).toFile('public-site/static/collection-assets/cobblestar-logo-128.webp');
const icon=await sharp(logo).resize(96,96,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
await writeFile('public/favicon.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><image width="96" height="96" href="data:image/png;base64,${icon.toString('base64')}"/></svg>\n`);
for(const [name,width] of [['96',96],['320',320],['640',640],['button',176]])await sharp('public/astral/assets/stars-coins-v3.png').trim().resize({width,withoutEnlargement:true}).webp({quality:90,alphaQuality:100}).toFile('public/astral/assets/stars-'+name+'-v3.webp');
console.log('Original Logo_Cercle_5 and supplied Stars artwork optimized for public pages.');
