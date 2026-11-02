import { Stations, type Station } from '../data/stations';
import { TripType } from '../components/TripTypeMenu';
import type { TravelerCounts } from '../components/TravelersPanel';
import { type CalendarDate, daysFromToday, addDays } from '../utils/dates';

/** Everything a user can enter in the "Find trains" form for a search. */
export interface SearchCriteria {
  tripType: TripType.OneWay | TripType.RoundTrip;
  from: Station;
  to: Station;
  departDate: CalendarDate;
  returnDate?: CalendarDate;
  travelers: TravelerCounts;
}

/**
 * Builder for SearchCriteria with sensible defaults, so each test only states
 * what it cares about:
 *
 *   const search = aSearch().roundTrip(3).from(Stations.BOSTON).build();
 *
 * Defaults: one-way, NYP -> WAS, departing in 14 days, 1 adult.
 * Dates are relative to "today" so tests never go stale.
 */
export class SearchCriteriaBuilder {
  private criteria: SearchCriteria = {
    tripType: TripType.OneWay,
    from: Stations.NEW_YORK,
    to: Stations.WASHINGTON,
    departDate: daysFromToday(14),
    travelers: { adult: 1, senior: 0, youth: 0, child: 0, infant: 0 },
  };

  from(station: Station): this {
    this.criteria.from = station;
    return this;
  }

  to(station: Station): this {
    this.criteria.to = station;
    return this;
  }

  oneWay(): this {
    this.criteria.tripType = TripType.OneWay;
    delete this.criteria.returnDate;
    return this;
  }

  /** Round trip returning `nights` days after the departure date. */
  roundTrip(nights = 3): this {
    this.criteria.tripType = TripType.RoundTrip;
    this.criteria.returnDate = addDays(this.criteria.departDate, nights);
    return this;
  }

  departingInDays(days: number): this {
    const nights = this.nightsAway();
    this.criteria.departDate = daysFromToday(days);
    if (nights !== undefined) this.criteria.returnDate = addDays(this.criteria.departDate, nights);
    return this;
  }

  departingOn(date: CalendarDate): this {
    this.criteria.departDate = date;
    return this;
  }

  returningOn(date: CalendarDate): this {
    this.criteria.tripType = TripType.RoundTrip;
    this.criteria.returnDate = date;
    return this;
  }

  /** Travelers not listed default to 0 (adults default to 1 only when omitted entirely). */
  withTravelers(counts: Partial<TravelerCounts>): this {
    this.criteria.travelers = { adult: 0, senior: 0, youth: 0, child: 0, infant: 0, ...counts };
    return this;
  }

  build(): SearchCriteria {
    return structuredClone(this.criteria);
  }

  private nightsAway(): number | undefined {
    const { departDate, returnDate } = this.criteria;
    if (!returnDate) return undefined;
    const ms = Date.UTC(returnDate.year, returnDate.month - 1, returnDate.day) -
      Date.UTC(departDate.year, departDate.month - 1, departDate.day);
    return Math.round(ms / 86_400_000);
  }
}

export const aSearch = () => new SearchCriteriaBuilder();
