import { expect, type Page } from '@playwright/test';
import { step } from '../utils/step';

/** Behaviour every amtrak.com page shares: navigation and site-wide overlays. */
export abstract class BasePage {
  protected abstract readonly path: string;

  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await step(`Open ${this.path} and dismiss cookie banner`, async () => {
      await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
      await this.dismissCookieBanner();
      await this.waitUntilReady();
    });
  }

  /** Each page decides what "ready to use" means. */
  protected abstract waitUntilReady(): Promise<void>;

  /**
   * The OneTrust cookie banner appears a few seconds after load and covers
   * the page with a click-blocking overlay. We dismiss it once, up front,
   * with "Reject All" (keeps tracking off during test runs).
   *
   * Why not `page.addLocatorHandler`? The banner often appears while a test
   * is typing into a station field; the handler's click moves focus away and
   * the rest of the typed text is lost. Dismissing first avoids that race.
   */
  private async dismissCookieBanner(): Promise<void> {
    const rejectAll = this.page.locator('#onetrust-reject-all-handler');
    try {
      await rejectAll.click({ timeout: 20_000 });
    } catch {
      // No banner (e.g. consent already stored, or a region without one).
      return;
    }
    await expect(this.page.locator('#onetrust-banner-sdk')).toBeHidden();
    await expect(this.page.locator('.onetrust-pc-dark-filter')).toBeHidden();
  }
}
