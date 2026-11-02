import { test, type Page } from '@playwright/test';
import { step } from '../utils/step';

/**
 * Behaviour every amtrak.com page shares.
 * The cookie banner is handled once for the whole run by the `setup` project
 * (tests/setup/consent.setup.ts), so pages don't need to deal with it.
 */
export abstract class BasePage {
  protected abstract readonly path: string;

  /**
   * Data the page must have loaded before it's usable. The visible form
   * renders before its data arrives, so "visible" alone isn't "ready".
   */
  protected readonly requiredData: RegExp[] = [];

  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await step(`Open ${this.path}`, async () => {
      // Start listening before navigating so fast responses aren't missed.
      // Same budget as the navigation itself (config `navigationTimeout`).
      const timeout = test.info().project.use.navigationTimeout ?? 0;
      const dataLoaded = Promise.all(
        this.requiredData.map((url) => this.page.waitForResponse((r) => url.test(r.url()) && r.ok(), { timeout })),
      );
      await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
      await dataLoaded;
      await this.waitUntilReady();
    });
  }

  /** Each page decides what "ready to use" means in the UI. */
  protected abstract waitUntilReady(): Promise<void>;
}
