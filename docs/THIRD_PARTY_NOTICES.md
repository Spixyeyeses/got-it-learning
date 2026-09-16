# Third-party and inherited notices

This repository preserves the supplied application and its existing notices. No project-wide open-source license was supplied, and this migration does not grant rights to code, question banks, artwork, or other assets whose ownership has not been established. A public GitHub repository would make those materials available for copying; the project owner must resolve publication rights before public sharing.

## Curriculum content

The Grade 1 maths pilot manifest at `web/data/curriculum/packages/cn-2022-math-g1-pilot/package.json` declares:

> Platform-original items; redistribution not granted

Its textbook mapping records `status: "not-mapped"` and `rights: "none"`. The manifest also states that the pilot is based on public curriculum standards and does not copy textbook text, illustrations, or original questions. These are inherited declarations, not independent verification of authorship or permission. Referencing a public curriculum standard does not grant rights to unrelated textbook content.

No blanket MIT, Apache, or other open-source license has been applied to the application or its course library. Keep the source declarations with their content.

## Noto Serif SC

`web/assets/fonts/noto-serif-sc-700.woff2` is accompanied by `web/assets/fonts/OFL-Noto-Serif-SC.txt`, which identifies Google Inc. and includes the **SIL Open Font License, Version 1.1**. That license file is retained alongside the font in the web distribution.

## Application artwork and other assets

The supplied logos, achievement images, control icons, and experimental game artwork are retained without a newly asserted license. Their presence in the package alone is not proof that public redistribution is authorized.

## Build and desktop dependencies

Development and packaging dependencies are recorded in `package.json` and `package-lock.json`. Their own license files and package metadata govern those components; those licenses do not relicense the application or its content.

Electron contains Chromium, Node.js, and additional third-party components. Preserve the license and notice files that accompany the packaged Electron runtime when distributing the desktop application. A portable executable or installer may contain these runtime files within its packaged payload.

Project names, partner names, and logos do not imply endorsement or a trademark license.
