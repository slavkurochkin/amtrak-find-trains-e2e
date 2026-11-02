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
  private fromStation: Station = Stations.NEW_YORK;
  private toStation: Station = Stations.WASHINGTON;
  private departDate: CalendarDate = daysFromToday(14);
  private nights?: number; // set => round trip
  private travelers: TravelerCounts = { adult: 1, senior: 0, youth: 0, child: 0, infant: 0 };

  from(station: Station): this {
    this.fromStation = station;
    return this;
  }

  to(station: Station): this {
    this.toStation = station;
    return this;
  }

  /** Round trip returning `nights` days after departure (0 = same day). */
  roundTrip(nights = 3): this {
    this.nights = nights;
    return this;
  }

  departingInDays(days: number): this {
    return this.departingOn(daysFromToday(days));
  }

  departingOn(date: CalendarDate): this {
    this.departDate = date;
    return this;
  }

  /** Types not listed are 0, except adults, which stay 1 unless given (pass `adult: 0` explicitly). */
  withTravelers(counts: Partial<TravelerCounts>): this {
    this.travelers = { adult: 1, senior: 0, youth: 0, child: 0, infant: 0, ...counts };
    return this;
  }

  build(): SearchCriteria {
    const roundTrip = this.nights !== undefined;
    return {
      tripType: roundTrip ? TripType.RoundTrip : TripType.OneWay,
      from: this.fromStation,
      to: this.toStation,
      departDate: this.departDate,
      returnDate: roundTrip ? addDays(this.departDate, this.nights!) : undefined,
      travelers: { ...this.travelers },
    };
  }
}

export const aSearch = () => new SearchCriteriaBuilder();
