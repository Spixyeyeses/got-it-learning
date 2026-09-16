'use strict';
const { test, expect } = require('@playwright/test');
const { runLearningSmoke, runImportValidationSmoke } = require('../../tools/smoke-desktop.cjs');

test('opening the arcade without earned access returns to learning', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/games.html');
  await expect(page).toHaveURL(/index\.html(?:[?#]|$)/);
  await expect(page.locator('#error')).toContainText('请先使用专注积分兑换休息时间');
  expect(errors).toEqual([]);
});

test('learning, drafts, rewards, exports and all eleven games survive web packaging', async ({ page }, testInfo) => {
  const result = await runLearningSmoke(page, 'http://127.0.0.1:4173');
  await testInfo.attach('functional-results', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
});

test('local course import reports malformed data without replacing courses', async ({ page }) => {
  await runImportValidationSmoke(page, 'http://127.0.0.1:4173');
});
