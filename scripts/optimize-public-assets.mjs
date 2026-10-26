import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
await mkdir('public-site/static/media',{recursive:true});
for(const size of [128,480])await sharp('public/cobblestar-logo.png').resize(size,size,{fit:'inside',withoutEnlargement:true}).webp({quality:88}).toFile(`public-site/static/media/cobblestar-logo-${size}.webp`);
for(const [size,name] of [[96,'favicon-96.png'],[180,'apple-touch-icon.png']])await sharp('public/cobblestar-logo.png').resize(size,size,{fit:'contain',background:{r:8,g:6,b:22,alpha:1}}).png({compressionLevel:9}).toFile(`public-site/static/media/${name}`);
console.log('Existing logo resized to WebP for public pages.');
