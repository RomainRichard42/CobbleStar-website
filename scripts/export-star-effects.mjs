import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {buildStarPack} from '../api/dist/star-assets.js';
// Standalone pack for local/solo tests. Server publication still goes through authenticated Star Studio.
const target=resolve(process.argv[2]??'CobbleStar-Star-FX.zip');
await mkdir(dirname(target),{recursive:true});
await writeFile(target,buildStarPack([],[]));
console.log(target);
