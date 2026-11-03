import type { Page, Route } from '@playwright/test';

/** The location-search API behind the station autocomplete ("Locations" group). */
export const STATION_LOOKUP = '**/AutoCompleterArcgis/**';

/**
 * Controls the station lookup API for tests about failures and slowness,
 * things the live site can't produce on demand. The rest of the page stays live.
 */
export class StationLookupMock {
  /** Number of lookup requests seen (the app retries failed ones). */
  calls = 0;

  private constructor(private readonly page: Page) {}

  /**
   * Every lookup answers "no matches", exactly as Amtrak's service does for an
   * unknown query. Used so a test about the form doesn't depend on the service
   * being up (on CI it sometimes answers 503 instead).
   */
  static async answerNoMatches(page: Page): Promise<StationLookupMock> {
    const mock = new StationLookupMock(page);
    await page.route(STATION_LOOKUP, (route) => {
      mock.calls++;
      return route.fulfill({ json: { autoCompleterResponse: { autoCompleteList: [] }, responseCode: 0 } });
    });
    return mock;
  }

  /** Every lookup answers with this HTTP status (e.g. 500). */
  static async failWith(page: Page, status: number): Promise<StationLookupMock> {
    const mock = new StationLookupMock(page);
    await page.route(STATION_LOOKUP, (route) => {
      mock.calls++;
      return route.fulfill({ status, body: 'mocked failure' });
    });
    return mock;
  }

  /**
   * Lookups wait until `release()` is called, then go to the real API.
   * No timers: the test decides exactly when the response arrives.
   */
  static async holdUntilReleased(page: Page): Promise<StationLookupMock & { release: () => void }> {
    const mock = new StationLookupMock(page);
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route(STATION_LOOKUP, async (route: Route) => {
      mock.calls++;
      await released;
      await route.continue();
    });
    return Object.assign(mock, { release });
  }
}
