import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify, {LogController} from 'fastify';
import {registerRequestLogging} from '../dist/request-logging.js';
test('successful sync fragments produce one summary; errors stay visible without query secrets',async()=>{
 const lines=[];const app=Fastify({logController:new LogController({disableRequestLogging:true}),logger:{stream:{write:line=>lines.push(JSON.parse(line))}}});registerRequestLogging(app,40);
 app.post('/api/internal/star/sync-chunk',async()=>({ok:true}));app.get('/broken',async(_r,reply)=>reply.code(503).send({error:'unavailable'}));
 for(let i=0;i<20;i++)await app.inject({method:'POST',url:'/api/internal/star/sync-chunk?token=secret-value'});
 await app.inject('/broken?code=oauth-secret');await new Promise(resolve=>setTimeout(resolve,60));await app.close();
 assert.ok(!lines.some(l=>l.msg==='incoming request'||l.msg==='request completed'));assert.ok(lines.some(l=>l.level===50&&l.statusCode===503));
 assert.equal(lines.filter(l=>l.msg==='HTTP activity / minute').reduce((n,l)=>n+l.requests,0),21);
 assert.ok(!JSON.stringify(lines).includes('secret'));
});
