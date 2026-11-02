import { test, expect } from '@src/fixtures/test';
import { TripType } from '@src/components/TripTypeMenu';
import { Stations } from '@src/data/stations';
import { addDays, daysFromToday, today, toInputFormat } from '@src/utils/dates';

test.describe('Find trains: depart and return dates', () => {
  test('the calendar opens on the current month with today selectable', async ({ homePage }) => {
    const form = homePage.fareFinder;

    await form.openDepartCalendar();

    expect(await form.calendar.isDayDisabled(today())).toBe(false);
  });

  test('a chosen date is shown in MM/DD/YYYY format', async ({ homePage }) => {
    const form = homePage.fareFinder;
    const date = daysFromToday(30);

    await form.pickDepartDate(date);

    await expect(form.departInput).toHaveValue(toInputFormat(date));
  });

  test('dates several months ahead can be reached with "Next month"', async ({ homePage }) => {
    const form = homePage.fareFinder;
    const date = daysFromToday(120);

    await form.pickDepartDate(date);

    await expect(form.departInput).toHaveValue(toInputFormat(date));
  });

  test('round trip: depart and return are chosen as a range', async ({ homePage }) => {
    const form = homePage.fareFinder;
    const depart = daysFromToday(7);
    const ret = addDays(depart, 5);
    await form.tripType.select(TripType.RoundTrip);

    await form.pickDateRange(depart, ret);

    await expect(form.departInput).toHaveValue(toInputFormat(depart));
    await expect(form.returnInput).toHaveValue(toInputFormat(ret));
  });

  test('round trip: return on the same day as departure is allowed', async ({ homePage }) => {
    const form = homePage.fareFinder;
    const day = daysFromToday(9);
    await form.tripType.select(TripType.RoundTrip);

    await form.pickDateRange(day, day);

    await expect(form.departInput).toHaveValue(toInputFormat(day));
    await expect(form.returnInput).toHaveValue(toInputFormat(day));
  });

  test.describe('invalid dates', { tag: '@negative' }, () => {
    test('past dates are disabled in the calendar', async ({ homePage }) => {
      const form = homePage.fareFinder;
      const yesterday = daysFromToday(-1);
      test.skip(yesterday.month !== today().month, 'yesterday is in the previous month, which the calendar does not render');

      await form.openDepartCalendar();

      expect(await form.calendar.isDayDisabled(yesterday)).toBe(true);
    });

    test('clicking a past date does not select it', async ({ homePage }) => {
      const form = homePage.fareFinder;
      const yesterday = daysFromToday(-1);
      test.skip(yesterday.month !== today().month, 'yesterday is in the previous month, which the calendar does not render');

      await form.openDepartCalendar();
      await form.calendar.day(yesterday).click({ force: true });

      await expect(form.calendar.day(yesterday)).toHaveAttribute('aria-selected', 'false');
      await form.calendar.close();
      await expect(form.departInput).toHaveValue('');
    });

    test('the calendar cannot go back before the current month', async ({ homePage }) => {
      const form = homePage.fareFinder;

      await form.openDepartCalendar();

      await expect(form.calendar.previousMonth).toBeDisabled();
    });

    test('round trip: a return date before departure is not accepted as the return', async ({ homePage }) => {
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

    test('closing the calendar without choosing leaves the date empty and search disabled', async ({ homePage }) => {
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
