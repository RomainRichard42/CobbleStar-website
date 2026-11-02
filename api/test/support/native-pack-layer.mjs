import assert from 'node:assert/strict';
import {withServerResources} from '../../dist/server-resource-pack.js';
const base=new Map([...withServerResources(new Map())].filter(([path])=>path.startsWith('assets/cobblemon/')));
export function assertNativePackLayer(files){
 if(files instanceof Map)assert.deepEqual(new Map([...files].filter(([path])=>path.startsWith('assets/cobblemon/'))),base,'published cosmetics may not change the bundled native layer');
 else assert.deepEqual(files.filter(path=>path.startsWith('assets/cobblemon/')).sort(),[...base.keys()].sort(),'published cosmetics may not add native overrides');
}
