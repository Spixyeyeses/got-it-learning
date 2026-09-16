'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { expect, _electron } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');

async function loaded(page) {
  await expect(page.locator('#mathCard')).toBeVisible();
  // Legacy banks load before the V3 pilot replaces grade 1; wait for the final
  // provider badge rather than sampling that temporary 4,900-question state.
  await expect(page.locator('#contentSourceBadge')).toContainText('国家课标 V3');
}

async function answerCurrentQuestion(page) {
  // Read the randomly selected fixture's answer, then exercise its actual UI.
  // This avoids a seed that would hide changes to selection or answer controls.
  const question = await page.evaluate(() => JSON.parse(JSON.stringify(questions[current])));
  const type = question.type || 'single_choice';
  if (type === 'number') await page.locator('#content input.answer').fill(String(question.answer));
  else if (['text', 'fill_blank', 'short_answer'].includes(type)) {
    await page.locator('#content input.text-answer').fill(String((question.answers || [question.answer])[0]));
  } else if (type === 'boolean') {
    await page.locator(`#content .choice[data-key="${question.answer ? 'T' : 'F'}"]`).click();
  } else if (type === 'multi_select') {
    for (const index of question.answer) await page.locator('#content .choice').nth(index).click();
  } else if (type === 'ordering') {
    for (const [index, answer] of question.answer.entries()) await page.locator('#content select').nth(index).selectOption(String(answer));
  } else if (type === 'matching') {
    for (let index = 0; index < question.pairs.length; index++) await page.locator('#content select').nth(index).selectOption(String(index));
  } else await page.locator('#content .choice').nth(Number(question.answer)).click();
}

async function dismissAchievements(page) {
  for (let index = 0; index < 5; index++) {
    if (await page.locator('#titleDetailModal').isVisible()) await page.locator('#titleDetailModal .title-detail-close-v6').click();
    await page.waitForTimeout(180); // Existing achievement queue opens its next dialog after 120 ms.
    if (await page.evaluate(() => titleDetailModal.hidden && achievementRevealQueueV6.length === 0)) return;
  }
  await expect(page.locator('#titleDetailModal')).toBeHidden();
}

async function runLearningSmoke(page, origin, { navigate = true, captureExport } = {}) {
  page.setDefaultTimeout(15_000);
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) unexpectedRequests.push(request.url());
  });
  if (navigate) await page.goto(`${origin}/index.html`);
  await loaded(page);
  const inventory = await page.evaluate(() => ({
    lessons: allLessonsV3().length,
    questions: allLessonsV3().reduce((count, lesson) => count + lesson.questions.length, 0),
    secure: isSecureContext,
    nodeExposed: typeof window.require !== 'undefined' || typeof window.process !== 'undefined'
  }));
  assert.deepEqual(inventory, { lessons: 460, questions: 4860, secure: true, nodeExposed: false });

  const onboarding = page.locator('#onboardingFormV3');
  await expect(onboarding).toBeVisible();
  await onboarding.locator('[name="grade"]').selectOption('1');
  await onboarding.locator('[name="under14"]').selectOption('true');
  await onboarding.locator('[name="guardianConfirmed"]').check();
  await onboarding.locator('button[type="submit"]').click();
  await expect(page.locator('#lessonDemoView')).toBeVisible();
  await page.locator('#lessonDemoStart').click();
  await expect(page.locator('#quizView')).toBeVisible();
  await answerCurrentQuestion(page);
  await page.locator('#next').click();
  const draft = await page.evaluate(() => ({ lessonId: questions[0].lessonId, ids: questions.map(question => question.id), answers: [...answers], current }));
  assert.equal(draft.current, 1);
  await page.reload();
  await loaded(page);
  await page.locator('#mathCard').click();
  await page.locator('#levels').selectOption('1');
  await page.locator(`[data-lesson-id="${draft.lessonId}"]`).click();
  await page.locator('#start').click();
  await expect(page.locator('#quizView')).toBeVisible();
  assert.deepEqual(await page.evaluate(() => ({ lessonId: questions[0].lessonId, ids: questions.map(question => question.id), answers: [...answers], current })), draft);
  for (let index = draft.current; index < draft.ids.length; index++) {
    await answerCurrentQuestion(page);
    if (index < draft.ids.length - 1) await page.locator('#next').click();
  }
  await page.locator('#submit').click();
  await expect(page.locator('#score')).toContainText('5/5');
  await dismissAchievements(page);
  const learned = await page.evaluate(() => JSON.parse(localStorage.getItem('gongxing_academy_data')));
  assert.equal(learned.totalSolved, 5);
  assert.equal(learned.totalCorrect, 5);
  assert.equal(learned.points, 7);
  assert.ok(learned.unlockedAchievements.includes('first_step'));
  assert.ok(learned.unlockedAchievements.includes('perfect_quiz'));

  await page.locator('#quizHome').click();
  await page.locator('button.privacy-entry').click();
  let exportFilename, exported;
  const clickExport = () => page.getByRole('button', { name: '导出全部数据', exact: true }).click();
  if (captureExport) {
    ({ filename: exportFilename, payload: exported } = await captureExport(clickExport));
  } else {
    const downloadPromise = page.waitForEvent('download');
    await clickExport();
    const download = await downloadPromise;
    exportFilename = download.suggestedFilename();
    const exportStream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of exportStream) chunks.push(chunk);
    exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  assert.match(exportFilename, /^学会啦-学习档案-.*\.json$/);
  assert.equal(exported.learningData.points, 7);
  assert.equal(exported.learningData.totalCorrect, 5);
  await page.keyboard.press('Escape');

  await page.locator('button.rest-entry-v6').click();
  await page.locator('#exchangeMinutes').selectOption('2');
  await expect(page.locator('#exchangeCost')).toHaveText('4');
  await page.locator('#exchangeAction').click();
  await expect(page).toHaveURL(/\/games\.html$/);
  await expect(page.locator('.game-card[data-game]')).toHaveCount(11);
  await expect(page.locator('#playTimeTop')).not.toHaveText('--:--');
  const gameIds = await page.locator('.game-card[data-game]').evaluateAll(nodes => nodes.map(node => node.dataset.game));
  for (const game of gameIds) {
    await page.locator(`.game-card[data-game="${game}"]`).click();
    await expect(page.locator('#arena')).toBeVisible();
    await expect(page.locator('#arenaTitle')).not.toBeEmpty();
    if (game === 'chess') {
      await page.locator('#chessStart').click();
      await expect(page.locator('#domGame')).toBeVisible();
    } else if (game === 'stick') {
      await page.locator('#stickSetupStart').click();
      await expect(page.locator('#gameCanvas')).toBeVisible();
    } else if (game === 'reaction') {
      await page.locator('#fullscreenGame').click();
      await page.waitForFunction(() => document.fullscreenElement?.id === 'arena');
      await page.locator('#fullscreenGame').click();
      await page.waitForFunction(() => !document.fullscreenElement);
    }
    await page.locator('#closeGame').click();
    await expect(page.locator('#arena')).toBeHidden();
  }
  await page.locator('a.back[href="index.html"]').click();
  await loaded(page);
  await expect(page.locator('#gamePointBalance')).toHaveText('3');
  await page.reload();
  await loaded(page);
  await expect(page.locator('#gamePointBalance')).toHaveText('3');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gongxing_academy_data')).totalCorrect), 5);
  await page.locator('button.rest-entry-v6').click();
  await expect(page.locator('#exchangeActive')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.tools-menu-v4 summary').click();
  await page.locator('#en').click();
  await expect(page.locator('#brandName')).toHaveText('Got It Learning');
  await page.locator('#zh').click();
  assert.deepEqual(errors, [], `Uncaught application errors: ${errors.join('\n')}`);
  // Installed antivirus can inject its own browser requests. Record origins
  // without confusing that host behavior with an application regression.
  const externalOriginsObserved = [...new Set(unexpectedRequests.map(url => new URL(url).origin))];
  const antivirusOrigins = ['http://me.kis.v2.scr.kaspersky-labs.com'];
  assert.deepEqual(externalOriginsObserved.filter(origin => !antivirusOrigins.includes(origin)), [], 'Unexpected external requests in the default local workflow');
  return { inventory, completedQuestions: 5, pointsBeforeRedemption: 7, pointsAfterRedemption: 3, gameIds, exportFilename, runtimeErrors: errors, externalOriginsObserved };
}

async function runImportValidationSmoke(page, origin) {
  page.setDefaultTimeout(15_000);
  await page.goto(`${origin}/index.html`);
  await loaded(page);
  await expect(page.locator('#onboardingFormV3')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.tools-menu-v4 summary').click();
  await page.locator('#adminEntry').click();
  await page.locator('#adminPassword').fill('0000');
  await page.locator('#adminLoginButton').click();
  await page.getByRole('button', { name: '查看内容质量与纠错记录', exact: true }).click();
  const before = await page.evaluate(() => allLessonsV3().length);
  await page.locator('#coursePackageFileV3').setInputFiles({ name: 'invalid-course.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.getByRole('button', { name: '校验并安装', exact: true }).click();
  await expect(page.locator('#suiteStatus')).toHaveText('文件不是有效的 JSON。');
  assert.equal(await page.evaluate(() => allLessonsV3().length), before);
}

async function runDesktopSmoke() {
  await fs.mkdir(path.join(ROOT, '.cache'), { recursive: true });
  const profile = await fs.mkdtemp(path.join(ROOT, '.cache', 'test-desktop-'));
  const launchOptions = {
    executablePath: process.env.GOT_IT_EXECUTABLE ? path.resolve(ROOT, process.env.GOT_IT_EXECUTABLE) : require('electron'),
    args: process.env.GOT_IT_EXECUTABLE ? [] : [ROOT],
    env: { ...process.env, GOT_IT_TEST_PROFILE: profile },
    timeout: 45_000
  };
  // Codex and some terminals inherit this flag; Electron must start as an app.
  delete launchOptions.env.ELECTRON_RUN_AS_NODE;
  let application;
  try {
    application = await _electron.launch(launchOptions);
    await application.evaluate(({ session }, downloadDirectory) => {
      globalThis.gotItSmokeDownload = null;
      session.defaultSession.on('will-download', (_event, item) => {
        const filename = item.getFilename();
        const savePath = `${downloadDirectory}/${filename}`;
        item.setSavePath(savePath);
        globalThis.gotItSmokeDownload = { filename, savePath, state: 'progressing' };
        item.once('done', (_doneEvent, state) => { globalThis.gotItSmokeDownload.state = state; });
      });
    }, profile);
    const page = await application.firstWindow({ timeout: 30_000 });
    // firstWindow fires before main.cjs finishes its initial loadURL. Wait so a
    // test navigation cannot abort startup and trigger the app's error handler.
    await page.waitForURL(url => url.origin === 'http://127.0.0.1:4174', { timeout: 30_000 });
    await page.waitForLoadState('load');
    const captureExport = async clickExport => {
      await clickExport();
      await expect.poll(() => application.evaluate(() => globalThis.gotItSmokeDownload?.state), { timeout: 15_000 }).toBe('completed');
      const saved = await application.evaluate(() => globalThis.gotItSmokeDownload);
      return { filename: saved.filename, payload: JSON.parse(await fs.readFile(saved.savePath, 'utf8')) };
    };
    const result = await runLearningSmoke(page, 'http://127.0.0.1:4174', { navigate: false, captureExport });
    await application.close();
    application = await _electron.launch(launchOptions);
    const reopened = await application.firstWindow({ timeout: 30_000 });
    await loaded(reopened);
    await expect(reopened.locator('#onboardingFormV3')).toHaveCount(0);
    await expect(reopened.locator('#gamePointBalance')).toHaveText('3');
    assert.equal(await reopened.evaluate(() => JSON.parse(localStorage.getItem('gongxing_academy_data')).totalCorrect), 5);
    const report = { ...result, restartPersistence: true, executable: launchOptions.executablePath, profile };
    await fs.writeFile(path.join(profile, 'smoke-results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (application) await application.close();
  }
}

module.exports = { runLearningSmoke, runImportValidationSmoke };
if (require.main === module) runDesktopSmoke().catch(error => { console.error(error); process.exitCode = 1; });
