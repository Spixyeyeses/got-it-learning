import assert from 'node:assert/strict';
import { cp, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildWeb, readSourceTree, repositoryRoot } from '../tools/build-web.mjs';

async function fixture(t, { original = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'got-it-build-test-'));
  t.after(async () => {
    // mkdtemp returns this exact absolute target; never remove a computed ancestor.
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('got-it-build-test-'));
    await rm(root, { recursive: true, force: true });
  });
  if (original) await cp(path.join(repositoryRoot, 'web'), path.join(root, 'web'), { recursive: true });
  else {
    await mkdir(path.join(root, 'web'));
    await writeFile(path.join(root, 'web', 'index.html'), '<!doctype html><title>Learning</title>');
    await writeFile(path.join(root, 'web', 'games.html'), '<!doctype html><title>Games</title>');
    await writeFile(path.join(root, 'web', 'service-worker.js'), "const CACHE_NAME = 'original';\nself.addEventListener('fetch', () => {});\n");
  }
  return root;
}

test('a complete release preserves every application payload and only versions the worker cache', async t => {
  const root = await fixture(t, { original: true });
  const before = await readSourceTree(path.join(root, 'web'));
  const first = await buildWeb({ root });
  const release = await readSourceTree(first.outputDir);
  assert.deepEqual(release.map(file => file.path), before.map(file => file.path));
  assert.ok(release.length > 90, 'The full package, including question banks and assets, is present.');
  for (let i = 0; i < before.length; i++) {
    const expected = before[i];
    const actual = release[i];
    if (expected.path === 'service-worker.js') {
      assert.match(actual.data.toString(), new RegExp(first.cacheName));
      const stripCache = source => source.toString().replace(/^const CACHE_NAME = [^\r\n]+/m, 'CACHE_VERSION');
      assert.equal(stripCache(actual.data), stripCache(expected.data));
    } else assert.deepEqual(actual.data, expected.data, expected.path);
  }
  const second = await buildWeb({ root });
  assert.deepEqual(second, first, 'Repeated builds are deterministic.');
  assert.deepEqual(await readSourceTree(first.outputDir), release);
  assert.deepEqual(await readSourceTree(path.join(root, 'web')), before, 'Building never edits the source.');
});

test('a changed question bank rotates the offline cache and stale output is removed', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'web', 'data'));
  await writeFile(path.join(root, 'web', 'data', 'questions.json'), '{"answer":1}');
  const first = await buildWeb({ root });
  await writeFile(path.join(first.outputDir, 'stale-release.js'), 'old');
  await writeFile(path.join(root, 'web', 'data', 'questions.json'), '{"answer":2}');
  const second = await buildWeb({ root });
  assert.notEqual(second.cacheName, first.cacheName);
  assert.equal(await readFile(path.join(second.outputDir, 'data', 'questions.json'), 'utf8'), '{"answer":2}');
  await assert.rejects(lstat(path.join(second.outputDir, 'stale-release.js')), { code: 'ENOENT' });
});

test('macOS transport metadata is excluded without excluding ordinary hidden content', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'web', '__MACOSX'));
  await writeFile(path.join(root, 'web', '__MACOSX', 'resource'), 'metadata');
  await writeFile(path.join(root, 'web', '.DS_Store'), 'metadata');
  await writeFile(path.join(root, 'web', '._index.html'), 'metadata');
  await writeFile(path.join(root, 'web', '.well-known'), 'ordinary content');
  const result = await buildWeb({ root });
  assert.deepEqual((await readSourceTree(result.outputDir)).map(file => file.path), ['.well-known', 'games.html', 'index.html', 'service-worker.js']);
});

test('a linked output directory is refused before any outside file can be removed', async t => {
  const root = await fixture(t);
  const outside = path.join(root, 'keep-me');
  await mkdir(outside);
  await writeFile(path.join(outside, 'sentinel.txt'), 'keep');
  await mkdir(path.join(root, 'dist'));
  await symlink(outside, path.join(root, 'dist', 'web'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildWeb({ root }), /real directory/);
  assert.equal(await readFile(path.join(outside, 'sentinel.txt'), 'utf8'), 'keep');
});

test('a source link is rejected before replacing a previous release', async t => {
  const root = await fixture(t);
  const result = await buildWeb({ root });
  const previous = await readSourceTree(result.outputDir);
  const outside = path.join(root, 'private');
  await mkdir(outside);
  await writeFile(path.join(outside, 'private.txt'), 'private');
  await symlink(outside, path.join(root, 'web', 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(buildWeb({ root }), /Symbolic links/);
  assert.deepEqual(await readSourceTree(result.outputDir), previous);
});
