import { execFile } from 'node:child_process';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { promisify, isDeepStrictEqual } from 'node:util';
import { readSourceTree, repositoryRoot } from './build-web.mjs';

const run = promisify(execFile);
function parseBundle(source, globalName) {
  const prefix = `globalThis.${globalName}=`;
  const start = source.indexOf(prefix);
  if (start < 0) throw new Error(`Missing generated global ${globalName}`);
  return JSON.parse(source.slice(start + prefix.length).trim().replace(/;$/, ''));
}

export async function checkSource({ root = repositoryRoot } = {}) {
  const files = await readSourceTree(path.join(root, 'web'), { ignoreMetadata: false });
  const byPath = new Map(files.map(file => [file.path, file.data.toString('utf8')]));
  let javascript = 0;
  let json = 0;
  let references = 0;
  const errors = [];
  for (const directory of ['tools', 'desktop', 'tests']) {
    for (const file of await readSourceTree(path.join(root, directory))) {
      if (!/\.(?:cjs|mjs|js)$/.test(file.path)) continue;
      javascript++;
      try { await run(process.execPath, ['--check', path.join(root, directory, file.path)], { windowsHide: true }); }
      catch (error) { errors.push(`${directory}/${file.path}: ${error.stderr || error.message}`); }
    }
  }
  for (const name of ['package.json', 'package-lock.json']) {
    try { JSON.parse(await readFile(path.join(root, name), 'utf8')); json++; }
    catch (error) { errors.push(`${name}: ${error.message}`); }
  }
  function requireAsset(owner, reference) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return;
    const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    if (!pathname) return;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(owner), pathname));
    references++;
    if (!byPath.has(target)) errors.push(`${owner}: missing asset ${reference}`);
  }
  for (const file of files) {
    const source = byPath.get(file.path);
    if (file.path.endsWith('.js')) {
      javascript++;
      try { await run(process.execPath, ['--check', path.join(root, 'web', file.path)], { windowsHide: true }); }
      catch (error) { errors.push(`${file.path}: ${error.stderr || error.message}`); }
    }
    if (file.path.endsWith('.json') || file.path.endsWith('.webmanifest')) {
      json++;
      try { JSON.parse(source); } catch (error) { errors.push(`${file.path}: ${error.message}`); }
    }
    if (file.path.endsWith('.html')) {
      for (const match of source.matchAll(/\b(?:src|href)\s*=\s*['"]([^'"]+)['"]/gi)) requireAsset(file.path, match[1]);
    }
    if (file.path.endsWith('.css')) {
      for (const match of source.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi)) requireAsset(file.path, match[1]);
    }
  }
  try {
    const worker = byPath.get('service-worker.js');
    const shell = worker.match(/const APP_SHELL = \[([\s\S]*?)\];/);
    if (!shell) throw new Error('Cannot find service-worker APP_SHELL.');
    for (const match of shell[1].matchAll(/['"]([^'"]+)['"]/g)) requireAsset('service-worker.js', match[1]);

    const banks = parseBundle(byPath.get('src/generated/question-banks.js'), '__NAMELESS_QUESTION_BANKS__');
    for (const subject of ['math', 'english', 'science']) {
      if (!isDeepStrictEqual(banks[`${subject}:normal`], JSON.parse(byPath.get(`data/${subject}.json`)))) {
        errors.push(`Generated ${subject} bank does not match data/${subject}.json. Run npm run build:data.`);
      }
    }
    const curriculum = parseBundle(byPath.get('src/generated/curriculum-content.js'), '__GOTIT_CURRICULUM_V3__');
    if (!isDeepStrictEqual(curriculum.catalog, JSON.parse(byPath.get('data/curriculum/catalog.v3.json')))) {
      errors.push('Generated curriculum catalog is stale. Run npm run build:data.');
    }
    for (const [url, document] of Object.entries(curriculum.documents)) {
      if (!isDeepStrictEqual(document, JSON.parse(byPath.get(url.replace(/^\.\//, ''))))) errors.push(`Generated curriculum document is stale: ${url}`);
    }
  } catch (error) { errors.push(error.message); }
  if (errors.length) throw new Error(errors.join('\n'));
  return { files: files.length, javascript, json, references };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  checkSource().then(result => console.log(`Checked ${result.javascript} JavaScript files, ${result.json} JSON documents, ${result.references} local asset references, and generated data parity.`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
