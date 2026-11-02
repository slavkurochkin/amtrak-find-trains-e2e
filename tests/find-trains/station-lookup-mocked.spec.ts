import { test, expect } from '@src/fixtures/test';
import { Stations } from '@src/data/stations';
import { StationLookupMock } from '@src/utils/StationLookupMock';

/**
 * Backend failure modes, produced by mocking one API (the station lookup)
 * while the rest of amtrak.com stays live.
 */
test.describe('Find trains: station lookup failures (mocked)', { tag: '@mocked' }, () => {
  test(
    'station search falls back to the built-in list when the lookup fails',
    { tag: ['@negative', '@STN-13'] },
    async ({ homePage, page }) => {
      const lookup = await StationLookupMock.failWith(page, 500);
      const { from } = homePage.fareFinder;

      await from.search(Stations.BOSTON.name);

      await expect(from.options.filter({ hasText: '(BOS)' })).toBeVisible();
      await expect(from.options.filter({ hasText: '(BBY)' })).toBeVisible();
      await expect(from.options.filter({ hasText: '(BON)' })).toBeVisible();
      await expect(from.options.filter({ hasText: 'Let me enter a station.' })).toBeVisible();
      expect(lookup.calls, 'the app retries the failed lookup').toBeGreaterThan(1);

      await from.chooseOption(Stations.BOSTON.optionText);
      await from.expectSelected(Stations.BOSTON);
    },
  );

  test('a slow lookup shows "Loading" until the results arrive', { tag: '@STN-14' }, async ({ homePage, page }) => {
    const lookup = await StationLookupMock.holdUntilReleased(page);
    const { from } = homePage.fareFinder;

    // Retried in case the app wipes the fresh input (see StationField.search).
    await expect(async () => {
      await from.enter(Stations.BOSTON.name);
      await expect(from.loading).toBeVisible();
    }).toPass();

    lookup.release();

    await expect(from.loading).toBeHidden();
    await expect(from.options.filter({ hasText: '(BOS)' })).toBeVisible();
  });
});
