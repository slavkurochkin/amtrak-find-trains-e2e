/**
 * Calendar-date helpers.
 *
 * A "CalendarDate" is a plain year/month/day with no time or zone. That avoids
 * the classic off-by-one bugs when the machine running the tests is in a
 * different zone from the browser (see `timezoneId` in playwright.config.ts).
 */
export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const TZ = process.env.TEST_TZ ?? 'America/New_York';

/** Today's date in the zone the browser runs in. */
export function today(): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function toUtc(d: CalendarDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

function fromUtc(d: Date): CalendarDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function addDays(d: CalendarDate, days: number): CalendarDate {
  const u = toUtc(d);
  u.setUTCDate(u.getUTCDate() + days);
  return fromUtc(u);
}

/** Same day `months` later, clamped to the month's last day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(d: CalendarDate, months: number): CalendarDate {
  const first = new Date(Date.UTC(d.year, d.month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return { year: first.getUTCFullYear(), month: first.getUTCMonth() + 1, day: Math.min(d.day, lastDay) };
}

/** Last day of the date's month. */
export function endOfMonth(d: CalendarDate): CalendarDate {
  return addDays(addMonths({ ...d, day: 1 }, 1), -1);
}

/** True if a is later than b. */
export function isAfter(a: CalendarDate, b: CalendarDate): boolean {
  return Date.UTC(a.year, a.month - 1, a.day) > Date.UTC(b.year, b.month - 1, b.day);
}

/** Last date Amtrak lets you book: 11 months from today (spec DATE-10). */
export function lastBookableDate(): CalendarDate {
  return addMonths(today(), 11);
}

export function daysFromToday(days: number): CalendarDate {
  return addDays(today(), days);
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "11/6/2026", the format the Depart/Return inputs actually display.
 * Note: the field hint says "MM/DD/YYYY" but the site shows no leading zeros.
 */
export function toInputFormat(d: CalendarDate): string {
  return `${d.month}/${d.day}/${d.year}`;
}

/** "2026-11-16T00:00:00", the format sent in the search request. */
export function toApiFormat(d: CalendarDate): string {
  return `${d.year}-${pad(d.month)}-${pad(d.day)}T00:00:00`;
}

/** "Monday, November 16, 2026", the calendar gridcell accessible name. */
export function toAriaLabel(d: CalendarDate): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(toUtc(d));
}

/** "November 2026", the calendar month header. */
export function toMonthHeader(d: CalendarDate): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(toUtc(d));
}
