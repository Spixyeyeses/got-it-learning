# Contributing

Install Node.js 24 LTS and use `npm ci` to install the versions recorded in `package-lock.json`. Work from this repository's root, not from the original downloaded package.

## Make a change

1. Create a branch describing the change.
2. Edit application code, content, or assets in `web/`; edit build/server tools in `tools/` and desktop integration in `desktop/`.
3. Run `npm run check` and `npm test`.
4. Run `npm start` or `npm run desktop` and exercise the affected flow. For packaging changes, build and launch the Windows output with `npm run build:win`.
5. Review the Git diff, document relevant behavior changes, and commit source files plus any necessary lockfile updates.

The `dist/` directory is generated output. Do not edit it as the source of a fix or commit build outputs or `node_modules/`. Rebuild after source edits.

## Preserve the imported baseline

This repository begins with the supplied 96 application files unchanged in `web/`. `npm run verify:original` compares them to the recorded import hashes. It is a provenance check, so intentional future source changes will produce differences. Keep the original manifest intact and explain intended behavior changes in commits; do not treat the imported files as read-only forever.

The current migration adds packaging while preserving behavior. Address the issues in [known limitations](docs/known-limitations.md) in separate, reviewable changes. Do not silently change scoring, content, game time, or storage keys during unrelated infrastructure work.

## Curriculum changes

Edit canonical JSON content rather than hand-editing embedded JavaScript data. Run `npm run build:data` after content edits to regenerate embedded bundles and update changed shard hashes/counts, then run `npm run check` before rebuilding. `build:web` packages the existing source and does not silently rewrite it. Preserve stable question and lesson IDs where existing progress refers to them. Content validity does not establish educational accuracy or ownership; teacher review and the applicable rights declarations remain separate concerns.

Avoid real student records in test fixtures, screenshots, logs, or commits. Use synthetic profiles when testing exports and reports. Existing learning exports are records for inspection; there is no supported learning-archive restore flow yet.

## Pull requests and releases

Describe the problem, the resulting behavior, and the checks performed. Include a reproducible example for scoring, storage, curriculum, or game changes. Mention any data migration and whether both local web and desktop modes were exercised.

Version changes belong in `package.json` and `package-lock.json`. Windows executables are release artifacts, not repository source. The current packaging configuration does not publish releases or configure automatic updates. Public release rights and code signing must be resolved separately by the project maintainers.
