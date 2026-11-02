import { test, expect } from '@src/fixtures/test';

/**
 * Visual baseline for the one overlay with fully static content. Screenshots
 * render differently per OS, so baselines are kept per platform; Linux ones are
 * generated in the Playwright Docker image CI runs in (`npm run test:visual:update:linux`).
 */
test.describe('Find trains: visual', { tag: '@visual' }, () => {
  test('the travelers panel matches the approved screenshot', { tag: '@VIS-01' }, async ({ homePage }) => {
    const { travelers } = homePage.fareFinder;

    await travelers.open();

    await expect(travelers.panel).toHaveScreenshot('travelers-panel.png');
  });
});
