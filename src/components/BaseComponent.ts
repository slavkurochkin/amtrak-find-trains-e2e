import { expect, test, type Locator, type Page } from '@playwright/test';

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
  /**
   * Taps a Done button inside a mobile panel the way a finger would.
   * On touch devices Playwright's click first scrolls the button "into view",
   * which in these pinned/scrolling layouts moves other content under it, and
   * the click lands there (seen: a date row, the disability checkbox). So:
   *  1. if the button isn't the topmost element at its centre, scroll it to
   *     the middle of its panel (what a user does) and re-check;
   *  2. tap at its position. Desktop just clicks.
   */
  protected async pressPinnedButton(button: Locator, options: { force?: boolean } = {}): Promise<void> {
    if (!test.info().project.use.hasTouch) {
      await button.click(options);
      return;
    }
    await expect(button).toBeVisible();
    const isTopmost = () =>
      button.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return el === top || el.contains(top);
      });
    if (!(await isTopmost())) await button.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect.poll(isTopmost, { message: 'the button must be the topmost element where a user taps' }).toBe(true);
    const box = (await button.boundingBox())!;
    await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }

  protected async waitForAnimations(element: Locator): Promise<void> {
    await element.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  }
}
