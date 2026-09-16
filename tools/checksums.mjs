import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const folder = new URL('../dist/desktop/', import.meta.url);
const files = (await readdir(folder)).filter(name => name.endsWith('.exe')).sort();
if (!files.length) throw new Error('No executable artifacts found');
const lines = await Promise.all(files.map(async name => `${createHash('sha256').update(await readFile(new URL(name, folder))).digest('hex')}  ${name}`));
await writeFile(new URL('SHA256SUMS.txt', folder), lines.join('\n') + '\n');
console.log(lines.join('\n'));
