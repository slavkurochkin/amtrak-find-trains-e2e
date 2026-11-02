import { test, expect } from '@src/fixtures/test';
import { TripType } from '@src/components/TripTypeMenu';
import { Stations } from '@src/data/stations';
import { aSearch } from '@src/builders/SearchCriteriaBuilder';
import { daysFromToday } from '@src/utils/dates';

/**
 * Negative paths for the whole form: FIND TRAINS stays disabled and clicking
 * it sends no search until every required field is valid.
 */
test.describe('Find trains: required fields', { tag: '@negative' }, () => {
  test('an empty form cannot be submitted', { tag: '@REQ-01' }, async ({ homePage, searchSpy }) => {
    const form = homePage.fareFinder;

    await form.expectSearchDisabled();
    await form.clickFindTrains();

    await searchSpy.expectNoSearch();
  });

  test('From alone is not enough', { tag: '@REQ-02' }, async ({ homePage, searchSpy }) => {
    const form = homePage.fareFinder;
    await form.from.selectByCode(Stations.NEW_YORK);

    await form.expectSearchDisabled();
    await form.clickFindTrains();

    await searchSpy.expectNoSearch();
  });

  test('missing To station blocks the search', { tag: '@REQ-03' }, async ({ homePage, searchSpy }) => {
    const form = homePage.fareFinder;
    await form.from.selectByCode(Stations.NEW_YORK);
    await form.pickDepartDate(daysFromToday(5));

    await form.expectSearchDisabled();
    await form.clickFindTrains();

    await searchSpy.expectNoSearch();
  });

  test('missing depart date blocks the search', { tag: '@REQ-04' }, async ({ homePage, searchSpy }) => {
    const form = homePage.fareFinder;
    await form.from.selectByCode(Stations.NEW_YORK);
    await form.to.selectByCode(Stations.WASHINGTON);

    await form.expectSearchDisabled();
    await form.clickFindTrains();

    await searchSpy.expectNoSearch();
  });

  test('round trip without a return date blocks the search', { tag: '@REQ-05' }, async ({ homePage, searchSpy }) => {
    const form = homePage.fareFinder;
    await form.tripType.select(TripType.RoundTrip);
    await form.from.selectByCode(Stations.NEW_YORK);
    await form.to.selectByCode(Stations.BOSTON);
    await form.openDepartCalendar();
    await form.calendar.pick(daysFromToday(6));

    // Without a return date the range can't be confirmed...
    await expect(form.calendar.doneButton).toBeDisabled();
    await form.calendar.close();

    // ...and the search stays blocked.
    await expect(form.returnInput).toHaveValue('');
    await form.expectSearchDisabled();
    await form.clickFindTrains();

    await searchSpy.expectNoSearch();
  });

  test(
    'with assistance needed, FIND TRAINS asks for accessibility details before searching',
    { tag: '@REQ-06' },
    async ({ homePage, searchSpy }) => {
      const form = homePage.fareFinder;
      await form.fill(aSearch().build());
      await form.assistanceCheckbox.click();

      await form.clickFindTrains();

      await expect(form.assistanceDialog).toBeVisible();
      await searchSpy.expectNoSearch();
    },
  );
});
