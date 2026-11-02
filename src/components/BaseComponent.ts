import type { Locator, Page } from '@playwright/test';

/**
 * Shared helpers for page components.
 *
 * amtrak.com renders the booking form twice (a desktop and a mobile layout) and
 * hides one with CSS, so every lookup is narrowed to the visible copy. Elements
 * are found by the site's own `amt-auto-test-id` attributes where they exist,
 * because those are the most stable hooks on the page.
 */
export abstract class BaseComponent {
  constructor(protected readonly page: Page) {}

  protected byTestId(id: string): Locator {
    return this.page.locator(`[amt-auto-test-id="${id}"]`).filter({ visible: true });
  }

  protected visible(selector: string): Locator {
    return this.page.locator(selector).filter({ visible: true });
  }

  /**
   * Waits until CSS transitions/animations inside the element have finished.
   * Panels fade in; scanning or screenshotting mid-fade gives false
   * colour-contrast hits and flaky images.
   */
  protected async waitForAnimations(element: Locator): Promise<void> {
    await element.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  }
}
