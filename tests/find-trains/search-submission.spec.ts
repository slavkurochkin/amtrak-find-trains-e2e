import { test, expect } from '@src/fixtures/test';
import { aSearch } from '@src/builders/SearchCriteriaBuilder';
import { Stations } from '@src/data/stations';
import { expectRequestToMatch } from '@src/utils/SearchRequestSpy';

/**
 * Happy paths: fill the form, click FIND TRAINS, and check the search request
 * the page sends carries exactly what the user entered.
 */
test.describe('Find trains: submitting a valid search', { tag: '@smoke' }, () => {
  test('one-way search with default traveler sends the selected stations and date', async ({ homePage, searchSpy }) => {
    const search = aSearch().from(Stations.NEW_YORK).to(Stations.WASHINGTON).departingInDays(14).build();
    const form = homePage.fareFinder;

    await form.fill(search);
    await form.expectSearchEnabled();
    await form.clickFindTrains();

    expectRequestToMatch(await searchSpy.waitForSearch(), search);
  });

  test('round-trip search sends an outbound and a return leg', async ({ homePage, searchSpy }) => {
    const search = aSearch().from(Stations.BOSTON).to(Stations.PHILADELPHIA).departingInDays(10).roundTrip(4).build();
    const form = homePage.fareFinder;

    await form.fill(search);
    await form.expectSearchEnabled();
    await form.clickFindTrains();

    expectRequestToMatch(await searchSpy.waitForSearch(), search);
  });

  test('search with a mix of traveler types sends one passenger per traveler', async ({ homePage, searchSpy }) => {
    const search = aSearch()
      .from(Stations.CHICAGO).to(Stations.WASHINGTON)
      .withTravelers({ adult: 2, senior: 1, youth: 1, child: 1, infant: 1 })
      .build();
    const form = homePage.fareFinder;

    await form.fill(search);
    await expect(form.travelers.toggle).toContainText('6');
    await form.clickFindTrains();

    expectRequestToMatch(await searchSpy.waitForSearch(), search);
  });

  test('searching for a departure today is allowed', async ({ homePage, searchSpy }) => {
    const search = aSearch().departingInDays(0).build();
    const form = homePage.fareFinder;

    await form.fill(search);
    await form.clickFindTrains();

    expectRequestToMatch(await searchSpy.waitForSearch(), search);
  });

  test('swapping stations before searching sends the reversed route', async ({ homePage, searchSpy }) => {
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
  });
});
