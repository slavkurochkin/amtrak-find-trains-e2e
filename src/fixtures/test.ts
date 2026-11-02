import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchRequestSpy } from '../utils/SearchRequestSpy';

interface Fixtures {
  /** Records and blocks the request FIND TRAINS sends. Attached before navigation. */
  searchSpy: SearchRequestSpy;
  /** amtrak.com/home, loaded and ready (cookie consent comes from the setup project). */
  homePage: HomePage;
}

export const test = base.extend<Fixtures>({
  searchSpy: async ({ page }, use, testInfo) => {
    await use(await SearchRequestSpy.attach(page, testInfo));
  },
  // Depends on searchSpy so the spy is listening before the page loads.
  homePage: async ({ page, searchSpy: _spy }, use) => {
    const home = new HomePage(page);
    await home.goto();
    await use(home);
  },
});

export { expect };
