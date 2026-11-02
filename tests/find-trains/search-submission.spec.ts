import { test, expect } from '@src/fixtures/test';
import { aSearch } from '@src/builders/SearchCriteriaBuilder';
import type { TravelerCounts } from '@src/components/TravelersPanel';
import { Stations } from '@src/data/stations';
import { expectRequestToMatch } from '@src/utils/SearchRequestSpy';

/**
 * Happy paths: fill the form, click FIND TRAINS, and check the search request
 * the page sends carries exactly what the user entered.
 */
test.describe('Find trains: submitting a valid search', { tag: '@smoke' }, () => {
  test(
    'one-way search with default traveler sends the selected stations and date',
    { tag: '@SUB-01' },
    async ({ homePage, searchSpy }) => {
      const search = aSearch().from(Stations.NEW_YORK).to(Stations.WASHINGTON).departingInDays(14).build();
      const form = homePage.fareFinder;

      await form.fill(search);
      await form.expectSearchEnabled();
      await form.clickFindTrains();

      expectRequestToMatch(await searchSpy.waitForSearch(), search);
    },
  );

  test('round-trip search sends an outbound and a return leg', { tag: '@SUB-02' }, async ({ homePage, searchSpy }) => {
    const search = aSearch().from(Stations.BOSTON).to(Stations.PHILADELPHIA).departingInDays(10).roundTrip(4).build();
    const form = homePage.fareFinder;

    await form.fill(search);
    await form.expectSearchEnabled();
    await form.clickFindTrains();

    expectRequestToMatch(await searchSpy.waitForSearch(), search);
  });

  test(
    'search with a mix of traveler types sends one passenger per traveler',
    { tag: '@SUB-03' },
    async ({ homePage, searchSpy }) => {
      const search = aSearch()
        .from(Stations.CHICAGO)
        .to(Stations.WASHINGTON)
        .withTravelers({ adult: 2, senior: 1, youth: 1, child: 1, infant: 1 })
        .build();
      const form = homePage.fareFinder;

      await form.fill(search);
      await expect(form.travelers.toggle).toContainText('6');
      await form.clickFindTrains();

      expectRequestToMatch(await searchSpy.waitForSearch(), search);
    },
  );

  test('searching for a departure today is allowed', { tag: '@SUB-04' }, async ({ homePage, searchSpy }) => {
    const search = aSearch().departingInDays(0).build();
    const form = homePage.fareFinder;

    await form.fill(search);
    await form.clickFindTrains();

    expectRequestToMatch(await searchSpy.waitForSearch(), search);
  });

  test(
    'swapping stations before searching sends the reversed route',
    { tag: '@SUB-05' },
    async ({ homePage, searchSpy }) => {
      const entered = aSearch().from(Stations.NEW_YORK).to(Stations.BOSTON).build();
      const form = homePage.fareFinder;

      await form.fill(entered);
      await form.waitForStationsToSettle();
      await form.swapStations();
      await form.from.expectSelected(Stations.BOSTON);
      await form.to.expectSelected(Stations.NEW_YORK);
      await form.clickFindTrains();

      const expected = aSearch().from(Stations.BOSTON).to(Stations.NEW_YORK).departingOn(entered.departDate).build();
      expectRequestToMatch(await searchSpy.waitForSearch(), expected);
    },
  );

  // Matrix: valid parties, including the less obvious ones found on the live site.
  const validParties: Array<{ party: string; travelers: Partial<TravelerCounts> }> = [
    { party: '1 senior alone (seniors count as adults)', travelers: { adult: 0, senior: 1 } },
    { party: '1 senior with 1 child', travelers: { adult: 0, senior: 1, child: 1 } },
    { party: '1 adult with 2 infants', travelers: { adult: 1, infant: 2 } },
    { party: '1 adult with 7 children (8 total)', travelers: { adult: 1, child: 7 } },
  ];
  for (const { party, travelers } of validParties) {
    test(`party of ${party} is sent as passengers`, { tag: '@SUB-07' }, async ({ homePage, searchSpy }) => {
      const search = aSearch().withTravelers(travelers).build();
      const form = homePage.fareFinder;

      await form.fill(search);
      await form.clickFindTrains();

      expectRequestToMatch(await searchSpy.waitForSearch(), search);
    });
  }
});
