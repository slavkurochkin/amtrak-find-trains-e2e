import { test, expect } from '@src/fixtures/test';

/**
 * Seed for Playwright's AI test agents (.claude/agents/playwright-test-*.md):
 * every agent session starts here, on a loaded amtrak.com/home with the
 * cookie consent already applied and the search request spy attached.
 * It also runs in the suite as a "page is ready" smoke check.
 */
test('seed: home page loads with the Find trains form ready', { tag: '@smoke' }, async ({ homePage }) => {
  await expect(homePage.fareFinder.findTrainsButton).toBeVisible();
});
