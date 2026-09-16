import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildData } from '../tools/build-data.mjs';
import { readSourceTree, repositoryRoot } from '../tools/build-web.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'got-it-data-test-'));
  t.after(async () => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('got-it-data-test-'));
    await rm(root, { recursive: true, force: true });
  });
  await cp(path.join(repositoryRoot, 'web'), path.join(root, 'web'), { recursive: true });
  return root;
}
const parseBundle = bytes => JSON.parse(bytes.toString().split('\n').slice(1).join('\n').replace(/^globalThis\.[A-Z_0-9]+=/, '').trim().replace(/;$/, ''));

test('regenerating the imported data is a byte-for-byte no-op', async t => {
  const root = await fixture(t);
  const before = await readSourceTree(path.join(root, 'web'));
  const result = await buildData({ root, write: true });
  assert.deepEqual(result.changedFiles, []);
  assert.deepEqual(await readSourceTree(path.join(root, 'web')), before);
});

test('bank edits regenerate their standalone payload without rewriting curriculum files', async t => {
  const root = await fixture(t);
  const filename = path.join(root, 'web', 'data', 'math.json');
  const bank = JSON.parse(await readFile(filename, 'utf8'));
  bank.levels[0].questions[0].answer = 999;
  await writeFile(filename, JSON.stringify(bank));
  const before = await readFile(path.join(root, 'web', 'src/generated/question-banks.js'));
  const checked = await buildData({ root });
  assert.deepEqual(checked.changedFiles, ['src/generated/question-banks.js']);
  assert.deepEqual(await readFile(path.join(root, 'web', 'src/generated/question-banks.js')), before, 'Read-only check cannot update output.');
  await buildData({ root, write: true });
  const generated = parseBundle(await readFile(path.join(root, 'web', 'src/generated/question-banks.js')));
  assert.equal(generated['math:normal'].levels[0].questions[0].answer, 999);
  assert.deepEqual((await buildData({ root })).changedFiles, []);
});

test('shard edits update manifest digest and item count, and bundle the updated manifest', async t => {
  const root = await fixture(t);
  const base = 'data/curriculum/packages/cn-2022-math-g1-pilot/';
  const shardName = `${base}g1-first-number-foundation.json`;
  const manifestName = `${base}package.json`;
  const shard = JSON.parse(await readFile(path.join(root, 'web', shardName), 'utf8'));
  shard.units[0].lessons[0].items.pop();
  const bytes = Buffer.from(JSON.stringify(shard, null, 2) + '\n');
  await writeFile(path.join(root, 'web', shardName), bytes);
  const result = await buildData({ root, write: true });
  assert.deepEqual(result.changedFiles, [manifestName, 'src/generated/curriculum-content.js']);
  const manifest = JSON.parse(await readFile(path.join(root, 'web', manifestName), 'utf8'));
  assert.equal(manifest.shards[0].itemCount, 59);
  assert.equal(manifest.shards[0].sha256, createHash('sha256').update(bytes).digest('hex'));
  const generated = parseBundle(await readFile(path.join(root, 'web', 'src/generated/curriculum-content.js')));
  assert.deepEqual(generated.documents[`./${manifestName}`], manifest);
  assert.deepEqual(generated.documents[`./${shardName}`], shard);
  assert.deepEqual((await buildData({ root })).changedFiles, []);
});

test('external and escaping curriculum URLs fail before generated files are written', async t => {
  const root = await fixture(t);
  const catalogName = path.join(root, 'web', 'data/curriculum/catalog.v3.json');
  const catalog = JSON.parse(await readFile(catalogName, 'utf8'));
  const originalBundle = await readFile(path.join(root, 'web', 'src/generated/curriculum-content.js'));
  for (const url of ['https://example.com/package.json', './data/curriculum/../../../private.json', './data/curriculum/%2e%2e/private.json', 'C:\\private.json']) {
    catalog.packages[0].manifestUrl = url;
    await writeFile(catalogName, JSON.stringify(catalog));
    await assert.rejects(buildData({ root, write: true }), /local curriculum URL|must stay inside/);
    assert.deepEqual(await readFile(path.join(root, 'web', 'src/generated/curriculum-content.js')), originalBundle);
  }
});
