# Known limitations

This packaging change preserves application behavior. The observations below concern the supplied application and are not claims that a new backend, content review, or classroom deployment has been completed. They include prior local browser observations and source-review findings; current packaging verification should be read separately.

## Services and account model

- The cloud account, synchronization, friends, and leaderboard clients expect a service at port 8787. The referenced `server/index.js` was absent from the supplied package.
- AI hints use local rules. The remote AI endpoint is unconfigured.
- Online matchmaking is disabled. Forest Twins and Iron Snout are experimental source files outside the 11-game menu.
- Student provisioning, school/class membership, server-enforced teacher permissions, and learning-time integration with external reading/video sites are not included.
- The administrator passcode initially defaults to `0000`, and enforcement is local. This is not a security boundary for a shared school computer.

## Imported content and learner state

- Imported lesson IDs reach an inline `onclick` handler in the learning-path renderer with incomplete escaping. Version 2 import validation checks question records but does not validate explicit lesson records. Crafted imported content can therefore execute JavaScript in the application when its learning-path button is clicked. Use only trusted course packages until this is fixed. See [`product-suite.js`](../web/src/app/product-suite.js#L109) and the [learning-path renderer](../web/src/app/product-suite.js#L429).
- `applyRemoteSnapshot`, used during sign-in and logout, merges incoming mastery, review, reward, and daily-lesson maps with the previous in-memory maps. Entries from a previous learner can remain in the resulting account state. The missing cloud backend prevents a live end-to-end account-switch test. See [`account.js`](../web/src/app/account.js#L14).
- Code inspection shows that `saveUser` replaces the whole stored learner object from the current tab's memory without a revision check. Multiple open app tabs can consequently overwrite newer progress or point changes with stale state. See [`learning-platform.js`](../web/src/app/learning-platform.js#L45).

## Learning and reporting

| Observation | Existing implementation |
| --- | --- |
| New maths lessons can leave subject-level progress at 0% while overall/lesson mastery increases. | `masteryRecordsV2` filters IDs by the legacy `math:` prefix; V3 lesson IDs use `CN-MATH-...`. |
| Resuming a practice session loses the earlier portion of its recorded session duration. | `startQuiz` resets the quiz start timestamp on resume. |
| Study time does not include the separate lesson demonstration view. | The current timer counts selected learning views. |
| Repeating one lesson can satisfy a two-lesson daily target. | Completed submissions are counted, including retries. |
| An immediate successful retry advances the scheduled review interval. | Each qualifying result advances the existing review rule. |
| English mode contains remaining Chinese labels and dialogs. | Translation coverage is incomplete. |
| Onboarding can suggest Grade 3 while initially selecting age 14+. | These are the supplied form defaults. |

The supplied mastery percentages and grade/Lexile labels have not been independently validated as educational measures.

## Content quality

The default active library contains 4,860 questions, but only the 60 pilot questions have individual explanation fields. Separate lesson libraries provide additional teaching material; answer-specific feedback elsewhere can be generic. Some wording and diagrams may be unsuitable for the stated grade. Teacher review of answers, language, examples, and difficulty remains necessary for school use.

Curriculum catalog entries for additional subjects/textbooks do not establish that corresponding licensed course material is present. Existing rights declarations are retained; see [notices](THIRD_PARTY_NOTICES.md).

## Local data and packaging

- Web, desktop, and the old `file://` launch have separate storage contexts. There is no automatic migration or cross-mode synchronization.
- Learning records can be exported as JSON, but the current UI does not restore those archives. Importing a course package is a different operation.
- Desktop learner data lives in `%APPDATA%/GotItLearning`, including for the portable executable. The executable alone is not a portable copy of the learner profile.
- The Windows builds are unsigned; Windows may display publisher/SmartScreen prompts. No automatic updates are configured.
- The original service worker caches resources. If testing changed web files appears to show an older version, close app tabs and remove that origin's service worker/cache using browser developer tools, then reload. Clearing all site data also deletes local learning records, so distinguish cache cleanup from deleting stored progress.
- Ports 4173 and 4174 are the default web and desktop ports; another process using a required port prevents startup.

The supplied chat screenshots described a Windows incident involving hidden folders and same-named executables. The reviewed source package contained no Windows executable; the screenshots do not establish its cause. Packaging verification is not an antivirus investigation of that earlier incident.
