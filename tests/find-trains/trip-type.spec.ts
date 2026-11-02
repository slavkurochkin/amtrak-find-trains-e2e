import { test, expect } from '@src/fixtures/test';
import { aSearch } from '@src/builders/SearchCriteriaBuilder';
import { TripType } from '@src/components/TripTypeMenu';
import { expectRequestToMatch } from '@src/utils/SearchRequestSpy';

test.describe('Find trains: trip type', () => {
  test('one-way is the default and asks for a depart date only', { tag: '@TRIP-01' }, async ({ homePage }) => {
    const form = homePage.fareFinder;

    await form.tripType.expectSelected(TripType.OneWay);

    await expect(form.departInput).toBeVisible();
    await expect(form.returnInput).toBeHidden();
  });

  test(
    'switching from round-trip back to one-way searches without the return date',
    { tag: ['@smoke', '@TRIP-02'] },
    async ({ homePage, searchSpy }) => {
      const form = homePage.fareFinder;
      const roundTrip = aSearch().roundTrip(3).build();
      await form.fill(roundTrip);

      await form.tripType.select(TripType.OneWay);
      await form.clickFindTrains();

      await expect(form.returnInput).toBeHidden();
      const oneWay = aSearch().departingOn(roundTrip.departDate).build();
      expectRequestToMatch(await searchSpy.waitForSearch(), oneWay);
    },
  );
});
