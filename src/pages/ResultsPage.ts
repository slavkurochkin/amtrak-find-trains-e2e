import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Station } from '../data/stations';
import type { Train } from '../data/searchReplies';
import { toResultsHeading, type CalendarDate } from '../utils/dates';

/**
 * The "Select Your Trip" page (/tickets/departure.html) that FIND TRAINS leads to.
 * Tests reach it only by searching with a saved reply (`searchSpy.replyWithResults`),
 * never by opening it directly, and only check what it shows.
 */
export class ResultsPage {
  static readonly PATH = /\/tickets\/departure\.html/;

  /** The date heading above the list, e.g. "Monday, November 23". */
  readonly departureDate: Locator;
  /** One card per train. */
  readonly trainCards: Locator;

  constructor(readonly page: Page) {
    this.departureDate = this.byTestId('autoId-journey-date-0-Departure');
    this.trainCards = this.page.locator('am-journey-card').filter({ visible: true });
  }

  private byTestId(id: string): Locator {
    return this.page.locator(`[amt-auto-test-id="${id}"]`).filter({ visible: true });
  }

  async expectLoaded(): Promise<void> {
    await test.step('Results page is shown', async () => {
      await expect(this.page).toHaveURL(ResultsPage.PATH);
      await expect(this.trainCards.first()).toBeVisible();
    });
  }

  /**
   * The results are for what was searched: the date heading and every train's route.
   * (The search summary at the top is folded away on mobile, so it isn't used.)
   */
  async expectResultsFor(from: Station, to: Station, date: CalendarDate): Promise<void> {
    await expect(this.departureDate).toHaveText(toResultsHeading(date));
    const routes = this.page
      .getByRole('heading', { level: 3, name: `${from.code} to ${to.code}` })
      .filter({ visible: true });
    await expect(routes).toHaveCount(await this.trainCards.count());
  }

  /** Checks the page lists exactly these trains, in this order, with their times and lowest fares. */
  async expectTrains(trains: Train[]): Promise<void> {
    await test.step(`Results list ${trains.length} trains`, async () => {
      await expect(this.trainCards.locator('[amt-auto-test-id="search-result-train-name"]')).toHaveText(
        trains.map((t) => t.name),
      );
      for (const [i, train] of trains.entries()) {
        const card = this.trainCards.nth(i);
        await expect(card.locator('[amt-auto-test-id^="journey-card-DEPARTS"]')).toHaveText(train.departs);
        await expect(card.locator(`[amt-auto-test-id="journey-lowest-price-${train.lowestFare}"]`)).toBeVisible();
      }
    });
  }
}
