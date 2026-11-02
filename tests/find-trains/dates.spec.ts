import { test, expect } from '@src/fixtures/test';
import { TripType } from '@src/components/TripTypeMenu';
import { Stations } from '@src/data/stations';
import { addDays, daysFromToday, lastBookableDate, today, toAriaLabel, toInputFormat } from '@src/utils/dates';
import { aSearch } from '@src/builders/SearchCriteriaBuilder';
import { expectRequestToMatch } from '@src/utils/SearchRequestSpy';

test.describe('Find trains: depart and return dates', () => {
  test('the calendar opens on the current month with today selectable', { tag: '@DATE-01' }, async ({ homePage }) => {
    const form = homePage.fareFinder;

    await form.openDepartCalendar();

    await expect(form.calendar.day(today())).toHaveAttribute('aria-disabled', 'false');
  });

  test('dates several months ahead can be reached with "Next month"', { tag: '@DATE-02' }, async ({ homePage }) => {
    const form = homePage.fareFinder;
    const date = daysFromToday(120);

    await form.pickDepartDate(date);

    await expect(form.departInput).toHaveValue(toInputFormat(date));
  });

  test('round trip: depart and return are chosen as a range', { tag: '@DATE-03' }, async ({ homePage }) => {
    const form = homePage.fareFinder;
    const depart = daysFromToday(7);
    const ret = addDays(depart, 5);
    await form.tripType.select(TripType.RoundTrip);

    await form.pickDateRange(depart, ret);

    await expect(form.departInput).toHaveValue(toInputFormat(depart));
    await expect(form.returnInput).toHaveValue(toInputFormat(ret));
  });

  test('round trip: return on the same day as departure is allowed', { tag: '@DATE-04' }, async ({ homePage }) => {
    const form = homePage.fareFinder;
    const day = daysFromToday(9);
    await form.tripType.select(TripType.RoundTrip);

    await form.pickDateRange(day, day);

    await expect(form.departInput).toHaveValue(toInputFormat(day));
    await expect(form.returnInput).toHaveValue(toInputFormat(day));
  });

  test.describe('invalid dates', { tag: '@negative' }, () => {
    test('past dates are disabled in the calendar', { tag: '@DATE-05' }, async ({ homePage }) => {
      const form = homePage.fareFinder;
      const yesterday = daysFromToday(-1);
      test.skip(yesterday.month !== today().month, 'yesterday is in the previous month, which the calendar does not render');

      await form.openDepartCalendar();

      await expect(form.calendar.day(yesterday)).toHaveAttribute('aria-disabled', 'true');
    });

    test('clicking a past date does not select it', { tag: '@DATE-06' }, async ({ homePage }) => {
      const form = homePage.fareFinder;
      const yesterday = daysFromToday(-1);
      test.skip(yesterday.month !== today().month, 'yesterday is in the previous month, which the calendar does not render');

      await form.openDepartCalendar();
      await form.calendar.day(yesterday).click({ force: true });

      await expect(form.calendar.day(yesterday)).toHaveAttribute('aria-selected', 'false');
      await form.calendar.close();
      await expect(form.departInput).toHaveValue('');
    });

    test('the calendar cannot go back before the current month', { tag: '@DATE-07' }, async ({ homePage }) => {
      const form = homePage.fareFinder;

      await form.openDepartCalendar();

      await expect(form.calendar.previousMonth).toBeDisabled();
    });

    test('round trip: a return date before departure is not accepted as the return', { tag: '@DATE-08' }, async ({ homePage }) => {
      const form = homePage.fareFinder;
      const depart = daysFromToday(12);
      const earlier = addDays(depart, -3);
      const later = addDays(earlier, 2);
      await form.tripType.select(TripType.RoundTrip);
      await form.openDepartCalendar();
      await form.calendar.pick(depart);

      await form.calendar.pick(earlier);

      // The earlier click restarts the range, so there is no return date yet
      // and the range can't be confirmed.
      await expect(form.calendar.doneButton).toBeDisabled();

      await form.calendar.pick(later);
      await form.calendar.done();
      await expect(form.departInput).toHaveValue(toInputFormat(earlier));
      await expect(form.returnInput).toHaveValue(toInputFormat(later));
    });

    test('closing the calendar without choosing leaves the date empty and search disabled', { tag: '@DATE-09' }, async ({ homePage }) => {
      const form = homePage.fareFinder;
      await form.from.selectByCode(Stations.NEW_YORK);
      await form.to.selectByCode(Stations.WASHINGTON);

      await form.openDepartCalendar();
      await form.calendar.close();

      await expect(form.departInput).toHaveValue('');
      await form.expectSearchDisabled();
    });
  });
});

test.describe('Find trains: booking horizon and typed dates', () => {
  test('bookings open 11 months ahead', { tag: '@DATE-10' }, async ({ homePage }) => {
    const form = homePage.fareFinder;
    const lastBookable = lastBookableDate();

    await form.openDepartCalendar();
    await form.calendar.showMonth(lastBookable);

    await expect(form.calendar.day(lastBookable)).toHaveAttribute('aria-disabled', 'false');
    await expect.poll(() => form.calendar.lastEnabledDay(), 'no day after the horizon is bookable')
      .toBe(toAriaLabel(lastBookable));
    await expect(form.calendar.nextMonth).toBeDisabled();
  });

  test('a valid date can be typed into the depart field and is used in the search', { tag: ['@smoke', '@DATE-11'] }, async ({ homePage, searchSpy }) => {
    const search = aSearch().departingInDays(20).build();
    const form = homePage.fareFinder;
    await form.from.selectByCode(search.from);
    await form.to.selectByCode(search.to);

    await form.typeDepartDate(toInputFormat(search.departDate));
    await form.clickFindTrains();

    await expect(form.departInput).toHaveValue(toInputFormat(search.departDate));
    expectRequestToMatch(await searchSpy.waitForSearch(), search);
  });

  const invalidTypedDates = [
    { kind: 'an impossible date', value: () => `13/45/${today().year}` },
    { kind: 'a past date', value: () => toInputFormat(daysFromToday(-1)) },
    { kind: 'a date beyond the 11-month horizon', value: () => toInputFormat(addDays(lastBookableDate(), 1)) },
  ];
  for (const { kind, value } of invalidTypedDates) {
    test(`typing ${kind} clears the field and keeps search disabled`, { tag: ['@negative', '@DATE-12'] }, async ({ homePage }) => {
      const form = homePage.fareFinder;
      await form.from.selectByCode(Stations.NEW_YORK);
      await form.to.selectByCode(Stations.WASHINGTON);

      await form.typeDepartDate(value());

      await expect(form.departInput).toHaveValue('');
      await form.expectSearchDisabled();
    });
  }
});
