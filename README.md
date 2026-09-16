# 学会啦 · Got It Learning

[简体中文](README.zh-CN.md)

A learning application with short lessons, practice, progress records, achievements, and points that buy limited game time. This repository turns the supplied browser application into a reproducible local web app and Windows desktop distribution.

The original 96 application files are preserved byte for byte in `web/`. The repository adds development, testing, and packaging tools around them. It does not change question content, scoring, game rules, or existing application limitations. The original package can stay where it is; this repository has its own Git history.

## Run locally

Install **Node.js 24 LTS**, then run these commands from this repository:

```sh
npm ci
npm start
```

Open **http://127.0.0.1:4173**. Keep the terminal running; press Ctrl+C to stop the server. `npm start` builds the web distribution and serves it on the local computer only. Use the same address consistently because browser data belongs to an origin, including its port.

For the desktop development version:

```sh
npm run desktop
```

This builds the same web application and opens it in Electron. The desktop wrapper serves its content on **http://127.0.0.1:4174**. It retains local progress between runs. Port 4174 must be available.

## Build a Windows app

On Windows x64, after `npm ci`:

```sh
npm run build:win
```

Find the portable `.exe` and NSIS installer in `dist/desktop/`. The portable app runs directly; the installer installs the desktop app. Neither requires Node.js on the learner's computer. Build tools download the Electron runtime and packaging dependencies, so the initial installation/build needs internet access.

These builds are **unsigned**. Windows may display a publisher or SmartScreen warning. Code signing is a separate release step; no update service or automatic publishing is configured.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm start` | Build and serve the local web app at port 4173. |
| `npm run desktop` | Build and launch the desktop development app. |
| `npm run build:web` | Generate the static web distribution in `dist/web/`. |
| `npm run build:data` | Regenerate embedded content and integrity metadata after editing JSON. |
| `npm test` | Run the automated test suite. |
| `npm run check` | Run repository checks. |
| `npm run verify:original` | Compare `web/` against the recorded original-file hashes. |
| `npm run build:win` | Build the Windows x64 portable app and installer. |
| `npm run test:e2e` | Test the built web app with Playwright. |
| `npm run test:desktop` | Test Electron, including a restart with saved progress. |

`verify:original` establishes the preserved baseline. After deliberately editing an application file, a difference is expected; do not rewrite the original manifest to disguise that change. See [contributing](CONTRIBUTING.md).

For browser tests, first run `npm run build:web` and `npx playwright install chromium` (an installed Windows Edge is also supported). Desktop tests use an isolated synthetic profile; set `GOT_IT_EXECUTABLE` to a packaged app path to test that build. GitHub Actions is configured to test and build both distributions; it does not publish GitHub Releases. Check the workflow results for each commit rather than assuming a successful remote build.

## What is included

```text
web/             Editable HTML, CSS, JavaScript, content, and assets
desktop/         Electron desktop wrapper
tools/           Build, local-server, and verification tools
tests/           Automated checks
docs/            Architecture, known limitations, provenance, and notices
dist/web/        Generated browser distribution; excluded from Git
dist/desktop/    Generated Windows distributions; excluded from Git
```

The existing app provides maths, English, science, a Grade 1 maths pilot, wrong-answer corrections, scheduled reviews, local reports, 15 achievement titles, and 11 visible games. The enabled default curriculum contains 4,860 active questions. Two points buy one minute of game time under the existing limits.

This is editable source code: you can modify `web/`, rebuild, and review the changes with Git. Generated output and dependencies are not source files and should not be committed.

## Data and feature boundaries

Learning data is stored locally in browser storage. The web app, desktop app, and old directly opened HTML package have separate storage contexts; existing progress is not automatically migrated. Desktop data is stored under `%APPDATA%/GotItLearning`. Moving the portable executable does not move its saved learner data.

The privacy center can export a JSON learning archive. The current application has **no matching archive-restore flow**. Its course-import control imports course content, not a saved learner profile. Keep the old package and browser profile if they hold progress you need.

Optional cloud accounts, synchronization, friends, and leaderboards still refer to a service on port 8787 whose server code was not supplied. The remote AI endpoint is empty; hints use local rules. Online game matchmaking is disabled. None of these missing services is created by the local web server or Electron wrapper. See [known limitations](docs/known-limitations.md) and [architecture](docs/architecture.md).

## Repository and release status

The [development repository](https://github.com/Spixyeyeses/got-it-learning) is private. Source and its history are stored in Git; `node_modules/` and `dist/` remain excluded. The Windows portable executable, installer, and SHA-256 checksums are attached to a [draft release](https://github.com/Spixyeyeses/got-it-learning/releases) for maintainer review and download. Draft access requires appropriate repository permissions.

Build commands and CI do not automatically push commits or publish releases. Publishing a draft release is a separate, deliberate step.

No project-wide open-source license was supplied. Existing notices are retained, including a curriculum notice that says redistribution is not granted. The project owner needs to resolve publication rights before public sharing. See [third-party and inherited notices](docs/THIRD_PARTY_NOTICES.md).

See the [verification record](docs/verification.md) for checks performed and their scope.
