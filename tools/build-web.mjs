import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const isMetadata = name => name === '__MACOSX' || name === '.DS_Store' || name.startsWith('._');

// Do not follow links: a release must contain only the files in its source tree.
export async function readSourceTree(directory, { ignoreMetadata = true } = {}) {
  const rootStat = await lstat(directory);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error(`Source must be a real directory: ${directory}`);
  }
  const files = [];
  async function visit(relative) {
    const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
    entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const entry of entries) {
      if (ignoreMetadata && isMetadata(entry.name)) continue;
      const localPath = path.join(relative, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not allowed: ${localPath}`);
      if (entry.isDirectory()) await visit(localPath);
      else if (entry.isFile()) {
        files.push({ path: localPath.split(path.sep).join('/'), data: await readFile(path.join(directory, localPath)) });
      } else throw new Error(`Unsupported source entry: ${localPath}`);
    }
  }
  await visit('');
  return files;
}

async function checkOutputPath(root, output) {
  const expected = path.resolve(root, 'dist', 'web');
  if (path.resolve(output) !== expected || path.relative(root, expected) !== path.join('dist', 'web')) {
    throw new Error('Refusing to remove a directory outside this repository’s dist/web.');
  }
  for (const directory of [path.join(root, 'dist'), expected]) {
    try {
      const stat = await lstat(directory);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`Build output must be a real directory: ${directory}`);
      }
      if (await realpath(directory) !== directory) {
        throw new Error(`Build output resolves outside its expected path: ${directory}`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

export async function buildWeb({ root = repositoryRoot } = {}) {
  const resolvedRoot = await realpath(root);
  const source = path.join(resolvedRoot, 'web');
  const output = path.join(resolvedRoot, 'dist', 'web');
  const files = await readSourceTree(source);
  for (const required of ['index.html', 'games.html', 'service-worker.js']) {
    if (!files.some(file => file.path === required)) throw new Error(`Missing web/${required}`);
  }

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(`${file.path}\0${file.data.length}\0`);
    hash.update(file.data);
  }
  const contentHash = hash.digest('hex');
  const cacheName = `got-it-learning-build-${contentHash.slice(0, 20)}`;
  const worker = files.find(file => file.path === 'service-worker.js');
  const workerSource = worker.data.toString('utf8');
  const cacheAssignment = /^const CACHE_NAME = ['"][^'"\r\n]+['"];$/gm;
  if ([...workerSource.matchAll(cacheAssignment)].length !== 1) {
    throw new Error('Expected exactly one service-worker CACHE_NAME declaration.');
  }
  // The source stays byte-for-byte intact; only the release cache version changes.
  worker.data = Buffer.from(workerSource.replace(cacheAssignment, `const CACHE_NAME = '${cacheName}';`));

  // Resolve and validate the exact target before recursively replacing generated output.
  await checkOutputPath(resolvedRoot, output);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const file of files) {
    const destination = path.join(output, file.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.data);
  }
  return { outputDir: output, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.data.length, 0), contentHash, cacheName };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildWeb().then(result => {
    console.log(`Built ${result.fileCount} files (${result.totalBytes} bytes) in ${result.outputDir}`);
    console.log(`Offline cache: ${result.cacheName}`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
