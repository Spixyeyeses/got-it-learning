# Packaging verification — 16 September 2026

Validated on Windows 11 x64 with Node.js 24.21.0, npm 11.19.0, Electron 44.4.1 and electron-builder 26.15.3.

| Check | Result |
| --- | --- |
| Imported application integrity | All 96 files in `web/` match the recorded original SHA-256 hashes, totaling 21,023,298 bytes. |
| Original downloaded package | All 353 original files, including packaging metadata, still match the prior inspection hashes. |
| Static validation | JavaScript syntax, JSON parsing, local asset paths, generated content parity, and curriculum integrity checks pass. |
| Node tests | 10 pass: complete output preservation, deterministic builds/cache updates, guarded output handling, content regeneration, and local HTTP serving. |
| Browser regression tests | 3 pass: unpaid game access, learning/rewards/export/game flows, and malformed course-import handling. |
| Electron development test | Shared learning/game flow passes; progress remains after full application close and restart. |
| Packaged Windows application | Same flow and restart test pass using `dist/desktop/win-unpacked/Got It Learning.exe`. |
| Portable EXE | Launched the self-extracting EXE on Windows and visually confirmed the dashboard and retained five-question learning record using the isolated test profile. |
| Packaged assets | All 96 files extracted from `app.asar` match `dist/web/`; inherited notices are included. |
| Windows artifacts | Portable EXE and NSIS installer built; SHA-256 values are recorded in `dist/desktop/SHA256SUMS.txt`. Both builds are unsigned. |
| Fresh Git checkout | A separate local clone completed `npm ci`, content regeneration (no changes), static checks, all 10 Node tests, web build, and original-file verification. Its working tree remained clean. |

The shared functional flow checks the final 4,860-question/460-lesson curriculum, a real five-question lesson, a draft restored after reload, 7 earned points, a readable Chinese-named JSON export, redemption of 4 points for two game minutes, all 11 game entry screens, chess/stick-fighting startup, game fullscreen, language switching, and a retained balance of 3 points. Desktop tests also verify persistence across a complete process restart. No uncaught application JavaScript errors were recorded. Desktop runs recorded no external network origins.

The Windows browser had Kaspersky web protection injecting requests to its own domain. The test report distinguishes that observed browser integration from application requests and rejects other unexpected origins. Electron's graphics subprocess could not initialize inside the restricted automation runner; the same tests passed in the normal Windows process environment, with renderer sandboxing and isolation still enabled.

These are packaging/regression checks, not an exhaustive audit of every question, game rule, operating system, or prior malware report. The NSIS installer was built but not installed into this computer. Optional cloud services remain unavailable because their implementation was not supplied. GitHub Actions has been prepared but has not run on GitHub. See [known limitations](known-limitations.md).

Run checks from the repository root:

```sh
npm ci
npm run check
npm test
npm run build:web
npm run test:e2e
npm run test:desktop
npm run build:win
```

For the browser test, install Playwright Chromium with `npx playwright install chromium` or use an installed Windows Edge. To test the packaged app in PowerShell:

```powershell
$env:GOT_IT_EXECUTABLE = 'dist/desktop/win-unpacked/Got It Learning.exe'
npm run test:desktop
Remove-Item Env:GOT_IT_EXECUTABLE
```

Tests use synthetic data in isolated profiles under `.cache/`; those records and generated distributions are excluded from Git.
