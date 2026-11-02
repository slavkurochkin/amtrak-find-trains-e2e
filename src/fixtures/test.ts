import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchRequestSpy } from '../utils/SearchRequestSpy';
import { DEFAULT_TIMING, type TimingOptions } from '../utils/timing';

interface Fixtures {
  /** Records and blocks the request FIND TRAINS sends. Attached before navigation. */
  searchSpy: SearchRequestSpy;
  /** amtrak.com/home, loaded and ready (cookie consent comes from the setup project). */
  homePage: HomePage;
}

export const test = base.extend<Fixtures & TimingOptions>({
  // Fixture options: values come from playwright.config.ts `use`.
  stationSettleMs: [DEFAULT_TIMING.stationSettleMs, { option: true }],
  noSearchWindowMs: [DEFAULT_TIMING.noSearchWindowMs, { option: true }],
  typingDelayMs: [DEFAULT_TIMING.typingDelayMs, { option: true }],

  searchSpy: async ({ page, noSearchWindowMs }, use, testInfo) => {
    await use(await SearchRequestSpy.attach(page, testInfo, { noSearchWindowMs }));
  },
  homePage: async ({ page, searchSpy: _spy, stationSettleMs, typingDelayMs }, use) => {
    const home = new HomePage(page, { stationSettleMs, typingDelayMs });
    await home.goto();
    await use(home);
  },
});

export { expect };
