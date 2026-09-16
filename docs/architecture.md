# Architecture

## One application, two launchers

`web/` contains the existing static HTML/CSS/JavaScript application. Its initial 96 files are preserved byte for byte from the supplied package, excluding macOS packaging metadata. No framework conversion is involved. Browser scripts retain their existing loading order, globals, local storage keys, content formats, and navigation between `index.html` and `games.html`.

`npm run build:data` regenerates embedded content from canonical JSON and updates shard integrity metadata after content edits. `npm run build:web` copies the source to `dist/web/` and changes only the generated service worker's cache name, derived from a hash of all application files. This rotates asset caches when content changes while preserving learner storage. The local server serves this output on `127.0.0.1:4173`. It is a static file server, not an account or learning-data backend.

The Electron wrapper serves the same built web files on `127.0.0.1:4174` and opens a desktop window. Keeping the desktop origin stable allows browser storage to persist across app launches. Electron supplies the browser runtime; learners do not need Node.js installed when running a packaged Windows executable. The desktop server belongs to the desktop process and stops with the app.

The Windows packaging step generates portable and NSIS installer distributions under `dist/desktop/`. The wrapper does not add an update service or publish anything to GitHub.

The renderer runs with Node integration disabled, context isolation, and Chromium's sandbox. It has no privileged preload or IPC bridge. Navigation stays on the app origin; new windows and unneeded permissions are denied, while same-origin fullscreen remains available for games. This follows the applicable [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security). The original app depends on inline event handlers, so adopting a strict script Content Security Policy is separate application work. The local server rejects foreign Host headers and serves only built assets.

The source import also retains the supplied introductory text in `docs/original/`. It describes the old distribution, including a referenced funding document that was absent. Use the repository READMEs for the current build/run procedure.

## Application layout

| Path in `web/` | Responsibility |
| --- | --- |
| `index.html` | Learning interface and ordered script entry points. |
| `games.html` | Game selection and play interface. |
| `src/app/` | Learning flow, scores, achievements, settings, reports, accounts, and content operations. |
| `src/shared/` | Curriculum contracts, lesson libraries, diagrams, question selection, and remote client. |
| `src/config/` | Content sources and optional remote account/AI settings. |
| `src/games/` | Game logic, time/access gate, lifecycle, and inactive experiments. |
| `src/generated/` | Imported embedded data bundles for the original distribution. |
| `data/` | Canonical question banks, curriculum catalog/packages, references, and schemas. |
| `styles/`, `assets/` | Presentation, images, and the bundled font. |
| `service-worker.js` | Existing browser asset/content caching. |

## Content pipeline

The legacy math, English, and science JSON banks contain 4,900 questions. The enabled V3 Grade 1 maths pilot replaces 100 legacy Grade 1 maths questions with 60 pilot questions, yielding 4,860 active questions. Reference archives and duplicated embedded bundles are not extra active content.

The V3 catalog points to a package manifest, which records its shard paths and hashes. Imported version 2 course packages use the existing local import UI and IndexedDB. This distinction is retained; the desktop launcher does not create a new content format.

## State and origins

The existing code stores learning progress, points, settings, profile information, and usage locally. Browser `localStorage`, `sessionStorage`, and IndexedDB serve different parts of the app. A service worker caches app resources when running from a supported web origin.

Web storage is tied to the browser profile and origin. The standard web URL is `http://127.0.0.1:4173`; the desktop URL is `http://127.0.0.1:4174`, using Electron's separate profile under `%APPDATA%/GotItLearning`. The original `file://` launch also has its own context. None shares learning progress automatically. Changing the host, port, or browser profile can make the app appear to start fresh without deleting data in the old context.

The privacy center exports selected learning records as JSON. Course import handles content; it does not restore that learning export. Retain old profiles when preserving previous progress matters.

## Optional integrations retained as supplied

- Account, registration, cloud sync, friends, and leaderboard clients refer to an HTTP service on port 8787. Its implementation was not supplied.
- The remote AI endpoint is empty; local rule-based hints remain available.
- Online matchmaking is explicitly disabled in the original game client.
- External reading/video tracking and school/class/teacher account management are not implemented by this packaging work.

Local administrator controls belong to the browser application and do not provide server-enforced access control. A shared-school deployment needs a separate product and backend design.
