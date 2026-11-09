import { test, expect } from '@src/fixtures/test';
import { aSearch } from '@src/builders/SearchCriteriaBuilder';
import type { TravelerCounts } from '@src/components/TravelersPanel';
import { Stations } from '@src/data/stations';
import { toInputFormat } from '@src/utils/dates';
import { Messages } from '@src/data/messages';
import { expectRequestToMatch } from '@src/utils/SearchRequestSpy';
import { savedSearchReply } from '@src/data/searchReplies';
import { ResultsPage } from '@src/pages/ResultsPage';

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

  test('"Use Points" searches in points instead of dollars', { tag: '@SUB-08' }, async ({ homePage, searchSpy }) => {
    const search = aSearch().build();
    const form = homePage.fareFinder;
    await form.fill(search);

    await form.usePointsSwitch.click();
    await form.clickFindTrains();

    const request = await searchSpy.waitForSearch();
    expect(request.journeyRequest.fare?.pricingUnit).toBe('POINTS');
    expectRequestToMatch(request, search);
  });

  test(
    'if the search server fails, the user sees an error and keeps their search',
    { tag: ['@negative', '@SUB-09'] },
    async ({ homePage, page, searchSpy }) => {
      const search = aSearch().build();
      const form = homePage.fareFinder;
      searchSpy.replyWith(500);
      await form.fill(search);

      await form.clickFindTrains();

      await expect(form.message(Messages.SEARCH_FAILED)).toBeVisible();
      await expect(page).toHaveURL(/\/home/);
      await form.from.expectSelected(search.from);
      await form.to.expectSelected(search.to);
      await expect(form.departInput).toHaveValue(toInputFormat(search.departDate));
      expectRequestToMatch(await searchSpy.waitForSearch(), search);
    },
  );

  test(
    'when the server returns trains, the user is taken to the results and sees them',
    { tag: ['@mocked', '@SUB-10'] },
    async ({ homePage, page, searchSpy }) => {
      const search = aSearch().from(Stations.NEW_YORK).to(Stations.WASHINGTON).build();
      const reply = savedSearchReply(search.departDate);
      searchSpy.replyWithResults(reply.body);
      await homePage.fareFinder.fill(search);

      await homePage.fareFinder.clickFindTrains();

      const results = new ResultsPage(page);
      await results.expectLoaded();
      await results.expectResultsFor(search.from, search.to, search.departDate);
      await results.expectTrains(reply.trains);
      expectRequestToMatch(await searchSpy.waitForSearch(), search);
    },
  );
});
