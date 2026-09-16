'use strict';
const { defineConfig, chromium } = require('@playwright/test');
const fs = require('node:fs');

// Prefer Playwright's pinned Chromium in CI; use installed Edge for an offline
// Windows checkout that has not downloaded a second Chromium distribution.
const channel = process.env.PLAYWRIGHT_CHANNEL ||
  (!fs.existsSync(chromium.executablePath()) && process.platform === 'win32' ? 'msedge' : undefined);

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list']],
  outputDir: '.cache/playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    channel,
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node tools/serve.mjs --port 4173',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: false,
    timeout: 30_000
  }
});
