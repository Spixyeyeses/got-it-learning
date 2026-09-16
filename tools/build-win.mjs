import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { buildWeb, repositoryRoot } from './build-web.mjs';

if (process.platform !== 'win32' || process.arch !== 'x64') throw new Error('Build the Windows x64 release on Windows x64 (or use the Windows CI job).');
process.chdir(repositoryRoot);
process.env.electron_config_cache ||= path.join(repositoryRoot, '.cache/electron');
process.env.ELECTRON_BUILDER_CACHE ||= path.join(repositoryRoot, '.cache/electron-builder');
process.env.CSC_IDENTITY_AUTO_DISCOVERY ||= 'false';
const require = createRequire(import.meta.url);
const electronDist = path.dirname(require('electron'));
const built = await buildWeb();
console.log(`Built ${built.fileCount} web files; cache ${built.cacheName}`);
const result = spawnSync(process.execPath, [require.resolve('electron-builder/cli.js'), '--win', '--x64', '--publish', 'never', `--config.electronDist=${electronDist}`], { cwd: repositoryRoot, stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
await import('./checksums.mjs');
