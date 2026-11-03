/** User-facing copy the tests assert on. Kept in one place so copy changes are a one-line fix. */
export const Messages = {
  SAME_STATIONS: 'Enter different origin and destination stations.',
  NO_STATIONS_FOUND: 'No stations found.',
  INVALID_STATION: 'Enter a valid station',
  NEED_ADULT: 'Add at least one adult 18 years old or older.',
  SEARCH_FAILED: "We've experienced an unknown error. Try again later or call us at 1-800-USA-RAIL.",
  TOO_MANY_TRAVELERS: /Call 1-800-USA-RAIL to make reservations for 9 to 14 travelers/,
} as const;
