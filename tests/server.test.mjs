import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { startServer } from '../tools/static-server.cjs';

test('localhost server serves assets, rejects remote hosts and never exposes tooling', async t => {
  const app = await startServer({ root: fileURLToPath(new URL('../web', import.meta.url)), port: 0 });
  t.after(app.close);
  const home = await fetch(app.url);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.match(await home.text(), /学会啦/);
  for (const file of ['/games.html', '/src/app/bootstrap.js', '/data/math.json', '/service-worker.js']) assert.equal((await fetch(app.url + file)).status, 200, file);
  for (const file of ['/package.json', '/desktop/main.cjs', '/.git/config', '/%2e%2e%5cpackage.json', '/data/']) assert.equal((await fetch(app.url + file)).status, 404, file);
  assert.equal((await fetch(app.url, { method: 'POST' })).status, 405);
  const head = await fetch(app.url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const forbidden = await new Promise((resolve, reject) => { const req = http.get(app.url, { headers: { Host: 'attacker.example' } }, res => { res.resume(); resolve(res.statusCode); }); req.on('error', reject); });
  assert.equal(forbidden, 403);
  assert.equal(app.server.address().address, '127.0.0.1');
});
