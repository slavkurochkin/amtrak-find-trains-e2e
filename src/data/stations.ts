/**
 * Station test data. `code` is what Amtrak sends in the search request,
 * `optionText` is a fragment of the autocomplete option, and `cityLabel` is
 * what the selected-station chip shows.
 */
export interface Station {
  code: string;
  name: string; // what a user would type to search by name
  optionText: RegExp;
  cityLabel: string;
}

export const Stations = {
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
