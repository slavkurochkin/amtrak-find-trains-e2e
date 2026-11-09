/**
 * Station test data. `code` is what Amtrak sends in the search request,
 * `optionText` is a fragment of the autocomplete option, and `cityLabel` is
 * what the selected-station chip shows.
 */
import { environment } from '../environments';

export interface Station {
  code: string;
  name: string; // what a user would type to search by name
  optionText: RegExp;
  cityLabel: string;
}

/** Production's stations. Other environments override only what differs (src/environments/). */
const PRODUCTION_STATIONS = {
  NEW_YORK: {
    code: 'NYP',
    name: 'New York',
    optionText: /\(NYP\)/,
    cityLabel: 'New York, NY',
  },
  WASHINGTON: {
    code: 'WAS',
    name: 'Washington',
    optionText: /\(WAS\)/,
    cityLabel: 'Washington, DC',
  },
  BOSTON: {
    code: 'BOS',
    name: 'Boston',
    optionText: /\(BOS\)/,
    cityLabel: 'Boston, MA',
  },
  CHICAGO: {
    code: 'CHI',
    name: 'Chicago',
    optionText: /\(CHI\)/,
    cityLabel: 'Chicago, IL',
  },
  PHILADELPHIA: {
    code: 'PHL',
    name: 'Philadelphia',
    optionText: /\(PHL\)/,
    cityLabel: 'Philadelphia, PA',
  },
} as const satisfies Record<string, Station>;

export type StationKey = keyof typeof PRODUCTION_STATIONS;

export const Stations: Record<StationKey, Station> = { ...PRODUCTION_STATIONS, ...environment.data?.stations };
