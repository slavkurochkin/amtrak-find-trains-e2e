import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchRequestSpy } from '../utils/SearchRequestSpy';

interface Fixtures {
  /** Records (and by default blocks) the request FIND TRAINS sends. Attached before navigation. */
  searchSpy: SearchRequestSpy;
  /** amtrak.com/home, loaded, with the cookie banner handled. */
  homePage: HomePage;
}

export const test = base.extend<Fixtures>({
  searchSpy: async ({ page }, use, testInfo) => {
    await use(await SearchRequestSpy.attach(page, testInfo));
  },
  homePage: async ({ page, searchSpy: _spy }, use) => {
    const home = new HomePage(page);
    await home.goto();
    await use(home);
  },
});

export { expect };
