import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
// Both are overridable so parallel runs (IDE extension + terminal) don't clobber each other.
const outputDir = process.env.PW_OUTPUT_DIR ?? 'test-results';
const reportsDir = process.env.PW_REPORTS_DIR ?? 'reports';

export default defineConfig({
  testDir: './tests',
  outputDir,
  fullyParallel: true,
  forbidOnly: isCI,
  // The target is a live production site behind bot protection. Retries absorb
  // network blips on CI. Locally we keep 0 so flakiness is visible.
  retries: isCI ? 2 : 0,
  // Keep concurrency modest: many parallel sessions against amtrak.com raise the
  // chance of being challenged by the bot-protection layer.
  workers: isCI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    [isCI ? 'github' : 'list'], // 'github' adds inline failure annotations on PRs
    ['html', { open: 'never', outputFolder: `${reportsDir}/html` }],
    ['junit', { outputFile: `${reportsDir}/junit.xml` }],
    ['./src/reporters/ai-failure-reporter.ts', { outputDir: reportsDir }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.amtrak.com',
    locale: 'en-US',
    // The calendar decides which dates are "past" from the browser clock, so the
    // browser and our date helpers must agree on a time zone.
    timezoneId: process.env.TEST_TZ ?? 'America/New_York',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
