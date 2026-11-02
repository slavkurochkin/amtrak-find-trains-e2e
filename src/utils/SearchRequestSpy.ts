import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page, type Route, type TestInfo } from '@playwright/test';
import type { SearchCriteria } from '../builders/SearchCriteriaBuilder';
import type { TravelerType } from '../components/TravelersPanel';
import { toApiFormat } from './dates';
import { TripType } from '../components/TripTypeMenu';

/** The parts of the search request body the tests check. */
export interface JourneySearchRequest {
  journeyRequest: {
    type: 'OW' | 'RT' | string;
    journeyLegRequests: Array<{
      origin: { code: string; schedule: { departureDateTime: string } };
      destination: { code: string };
      passengers: Array<{ id: string; type: string; initialType: string }>;
    }>;
  };
}

export const SEARCH_ENDPOINT = '**/dotcom/journey-solution-option';

/**
 * Clicking FIND TRAINS makes the page send
 * `POST /dotcom/journey-solution-option` with the search as JSON. That request
 * is the end of our scope, so it's what the tests check.
 *
 * By default the spy aborts the request:
 *  - tests stay within scope and don't depend on the results page
 *  - no search load reaches Amtrak's production backend
 *  - from automated browsers the endpoint returns 403 (bot protection) anyway
 * Set LIVE_SEARCH=1 to let the request through.
 */
export class SearchRequestSpy {
  readonly requests: JourneySearchRequest[] = [];

  private constructor(private readonly page: Page, private readonly testInfo?: TestInfo) {}

  static async attach(page: Page, testInfo?: TestInfo): Promise<SearchRequestSpy> {
    const spy = new SearchRequestSpy(page, testInfo);
    await page.route(SEARCH_ENDPOINT, (route) => spy.handle(route));
    return spy;
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    if (request.method() !== 'POST') return route.continue();
    const body = request.postDataJSON() as JourneySearchRequest;
    this.requests.push(body);
    if (this.testInfo) {
      // Saved as a file next to the screenshot/trace, and linked in the report.
      const file = this.testInfo.outputPath(`search-request-${this.requests.length}.json`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(body, null, 2));
      await this.testInfo.attach(path.basename(file), { path: file, contentType: 'application/json' });
    }
    if (process.env.LIVE_SEARCH === '1') return route.continue();
    return route.abort('aborted');
  }

  /**
   * Returns the next search request not yet returned, waiting if needed.
   * A read cursor (not a "count before" snapshot) is used because the request
   * often arrives before this method is even called.
   */
  async waitForSearch(timeout = 15_000): Promise<JourneySearchRequest> {
    const index = this.consumed;
    await expect.poll(() => this.requests.length, { timeout, message: 'FIND TRAINS should send a search request' })
      .toBeGreaterThan(index);
    this.consumed = index + 1;
    return this.requests[index];
  }

  private consumed = 0;

  /** For negative tests: no search request may go out within `ms`. */
  async expectNoSearch(ms = 3_000): Promise<void> {
    await this.page.waitForTimeout(ms);
    expect(this.requests, 'no search request should be sent').toHaveLength(0);
  }

  get last(): JourneySearchRequest | undefined {
    return this.requests[this.requests.length - 1];
  }
}

/**
 * Checks that a captured request matches what was entered in the form.
 * Kept separate from the spy so the same check can serve other entry points
 * (deep links, the mobile layout) later.
 */
export function expectRequestToMatch(body: JourneySearchRequest, criteria: SearchCriteria): void {
  const { journeyRequest } = body;
  const isRoundTrip = criteria.tripType === TripType.RoundTrip;

  expect(journeyRequest.type, 'trip type').toBe(isRoundTrip ? 'RT' : 'OW');
  expect(journeyRequest.journeyLegRequests, 'number of legs').toHaveLength(isRoundTrip ? 2 : 1);

  const [outbound, inbound] = journeyRequest.journeyLegRequests;
  expect(outbound.origin.code, 'outbound origin station').toBe(criteria.from.code);
  expect(outbound.destination.code, 'outbound destination station').toBe(criteria.to.code);
  expect(outbound.origin.schedule.departureDateTime, 'outbound date').toBe(toApiFormat(criteria.departDate));

  if (isRoundTrip) {
    expect(inbound.origin.code, 'return origin station').toBe(criteria.to.code);
    expect(inbound.destination.code, 'return destination station').toBe(criteria.from.code);
    expect(inbound.origin.schedule.departureDateTime, 'return date').toBe(toApiFormat(criteria.returnDate!));
  }

  expect(passengerTally(body), 'passengers by type').toEqual(
    Object.fromEntries(Object.entries(criteria.travelers).filter(([, n]) => n > 0)),
  );
}

/**
 * The API's `initialType` names per traveler type. They mostly match the UI,
 * except seniors, which the API calls "seniors" (plural).
 */
const API_PASSENGER_TYPE: Record<string, TravelerType> = {
  adult: 'adult',
  seniors: 'senior',
  senior: 'senior',
  youth: 'youth',
  child: 'child',
  infant: 'infant',
};

/** Counts passengers on the outbound leg by type, e.g. { adult: 2, child: 1 }. */
export function passengerTally(body: JourneySearchRequest): Partial<Record<TravelerType, number>> {
  const tally: Record<string, number> = {};
  for (const p of body.journeyRequest.journeyLegRequests[0].passengers) {
    const type = API_PASSENGER_TYPE[p.initialType] ?? `unknown:${p.initialType}`;
    tally[type] = (tally[type] ?? 0) + 1;
  }
  return tally;
}
