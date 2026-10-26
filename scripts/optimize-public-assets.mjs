import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
await mkdir('public-site/static/media',{recursive:true});
for(const size of [128,480])await sharp('public/cobblestar-logo.png').resize(size,size,{fit:'inside',withoutEnlargement:true}).webp({quality:88}).toFile(`public-site/static/media/cobblestar-logo-${size}.webp`);
console.log('Existing logo resized to WebP for public pages.');
