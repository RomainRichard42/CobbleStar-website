import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import { siteSecurity } from '../dist/site-security.js';

test('Production CSP allows Pokemon portraits without opening arbitrary origins', async () => {
  const app = Fastify();
  try {
    await app.register(helmet, siteSecurity);
    app.get('/', async () => 'test');
    const response = await app.inject('/');
    const directives = Object.fromEntries(response.headers['content-security-policy'].split(';').map(s => { const [key,...values]=s.trim().split(/\s+/); return [key,values]; }));
    assert.deepEqual(directives['connect-src'], ["'self'", 'https://pokeapi.co']);
    assert.ok(directives['img-src'].includes('https://raw.githubusercontent.com/PokeAPI/sprites/'));
    assert.ok(directives['img-src'].includes('https://cdn.discordapp.com'));
    assert.ok(directives['img-src'].includes('https://mc-heads.net'));
    assert.ok(!directives['img-src'].some(s => s === '*' || s === 'https:'));
    assert.deepEqual(directives['object-src'], ["'none'"]);
    assert.deepEqual(directives['frame-ancestors'], ["'self'"]);
  } finally { await app.close(); }
});
