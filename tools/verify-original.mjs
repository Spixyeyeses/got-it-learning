import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSourceTree, repositoryRoot } from './build-web.mjs';

// This is an import baseline, not a rule forbidding future application changes.
// Keep the manifest unchanged so reviewers can always identify later source edits.
export async function verifyOriginal({ root = repositoryRoot } = {}) {
  const manifest = JSON.parse(await readFile(path.join(root, 'docs', 'original-files.sha256.json'), 'utf8'));
  if (!Array.isArray(manifest.files)) throw new Error('Invalid original-files manifest.');
  const actual = await readSourceTree(path.join(root, 'web'), { ignoreMetadata: false });
  const expected = new Map();
  for (const file of manifest.files) {
    if (typeof file.path !== 'string' || file.path.includes('\\') || file.path.startsWith('/') || file.path.split('/').some(part => part === '..' || part === '.') || expected.has(file.path)) {
      throw new Error('Invalid or duplicate path in original-files manifest.');
    }
    expected.set(file.path, file);
  }
  const changes = [];
  for (const file of actual) {
    const original = expected.get(file.path);
    if (!original) changes.push(`Added: ${file.path}`);
    else {
      if (file.data.length !== original.bytes || createHash('sha256').update(file.data).digest('hex') !== original.sha256) changes.push(`Changed: ${file.path}`);
      expected.delete(file.path);
    }
  }
  for (const name of expected.keys()) changes.push(`Missing: ${name}`);
  if (changes.length) throw new Error(`Application differs from the imported original:\n${changes.join('\n')}`);
  return { fileCount: actual.length, totalBytes: actual.reduce((sum, file) => sum + file.data.length, 0) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  verifyOriginal().then(result => console.log(`Original application verified: ${result.fileCount} files, ${result.totalBytes} bytes; no additions, removals, or content changes.`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
