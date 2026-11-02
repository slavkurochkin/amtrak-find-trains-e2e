import { test, expect } from '@src/fixtures/test';
import { aSearch } from '@src/builders/SearchCriteriaBuilder';
import { TripType } from '@src/components/TripTypeMenu';
import { Stations } from '@src/data/stations';
import { daysFromToday, toApiFormat } from '@src/utils/dates';
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

  test('multi-city search sends each leg in order', { tag: '@TRIP-03' }, async ({ homePage, searchSpy }) => {
    const form = homePage.fareFinder;
    const legs = [
      { from: Stations.NEW_YORK, to: Stations.PHILADELPHIA, date: daysFromToday(10) },
      { from: Stations.PHILADELPHIA, to: Stations.WASHINGTON, date: daysFromToday(13) },
    ];
    await form.tripType.select(TripType.MultiCity);
    for (const [i, leg] of legs.entries()) {
      await form.leg(i).from.selectByCode(leg.from);
      await form.leg(i).to.selectByCode(leg.to);
      await form.pickLegDate(i, leg.date);
    }

    await form.clickFindTrains();

    const { journeyRequest } = await searchSpy.waitForSearch();
    expect(journeyRequest.type).toBe('MC');
    expect(
      journeyRequest.journeyLegRequests.map((l) => [
        l.origin.code,
        l.destination.code,
        l.origin.schedule.departureDateTime,
      ]),
    ).toEqual(legs.map((l) => [l.from.code, l.to.code, toApiFormat(l.date)]));
  });

  test('Group Travel opens the group request page', { tag: '@TRIP-04' }, async ({ homePage, page }) => {
    await homePage.fareFinder.tripType.openGroupTravel();

    await expect(page).toHaveURL(/\/tickets\/grouptravel/);
  });
});
