import { expect, test, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';

export const TRAVELER_TYPES = ['adult', 'senior', 'youth', 'child', 'infant'] as const;
export type TravelerType = (typeof TRAVELER_TYPES)[number];
export type TravelerCounts = Record<TravelerType, number>;

// The site's test ids use "infants" (plural) for that one row.
const TEST_ID_KEY: Record<TravelerType, string> = {
  adult: 'adult',
  senior: 'senior',
  youth: 'youth',
  child: 'child',
  infant: 'infants',
};

/** The "N Traveler(s)" dropdown with +/- steppers per traveler type. */
export class TravelersPanel extends BaseComponent {
  readonly scanScope = 'app-traveler';
  /** The open panel (Adult…Infant steppers, discounts, Done). */
  readonly panel: Locator;
  /** Youth row link to the unaccompanied-minor policy. */
  readonly travelingAloneLink: Locator;
  readonly travelingAloneDialog: Locator;
  readonly toggle: Locator;
  readonly resetButton: Locator;
  readonly doneButton: Locator;

  constructor(page: Page) {
    super(page);
    this.panel = this.visible('#traveler-menu');
    this.travelingAloneLink = this.panel.getByText('Traveling Alone?');
    this.travelingAloneDialog = this.visible('[role="dialog"], .modal.show').filter({ hasText: 'Traveling Alone' });
    this.toggle = this.byTestId('traveler-dropdown-button');
    this.resetButton = this.byTestId('traveler-clear');
    this.doneButton = this.byTestId('traveler-component-discount-done-button');
  }

  increment(type: TravelerType): Locator {
    return this.byTestId(`traveler-component-${TEST_ID_KEY[type]}-incr-button`);
  }

  decrement(type: TravelerType): Locator {
    return this.byTestId(`traveler-component-${TEST_ID_KEY[type]}-dcr-button`);
  }

  /** The number shown between the - and + buttons. */
  countLabel(type: TravelerType): Locator {
    return this.increment(type).locator('xpath=..').locator('[aria-live="polite"]');
  }

  async open(): Promise<void> {
    if (!(await this.doneButton.isVisible())) await this.toggle.click();
    await expect(this.doneButton).toBeVisible();
    await this.waitForAnimations(this.panel);
  }

  async done(): Promise<void> {
    await this.pressPinnedButton(this.doneButton);
    await expect(this.doneButton).toBeHidden();
  }

  async count(type: TravelerType): Promise<number> {
    return Number((await this.countLabel(type).innerText()).trim());
  }

  /** Steps a traveler type up or down to exactly `target`. Panel must be open. */
  async setCount(type: TravelerType, target: number): Promise<void> {
    let current = await this.count(type);
    while (current !== target) {
      const button = current < target ? this.increment(type) : this.decrement(type);
      await button.click();
      const next = current < target ? current + 1 : current - 1;
      await expect(this.countLabel(type)).toHaveText(String(next));
      current = next;
    }
  }

  /** Sets every traveler type; types not given are set to 0. */
  async setTravelers(counts: Partial<TravelerCounts>): Promise<void> {
    const label = Object.entries(counts)
      .filter(([, n]) => n)
      .map(([t, n]) => `${n} ${t}`)
      .join(', ');
    await test.step(`Set travelers: ${label || 'none'}`, () => this.applyCounts(counts));
  }

  private async applyCounts(counts: Partial<TravelerCounts>): Promise<void> {
    await this.open();
    // Order matters because of the "at least one adult" rule. For
    // { senior: 1 } the panel starts at 1 adult: add the senior first, then
    // remove the adult. Removing the adult first would be refused.
    const adults = counts.adult ?? 0;
    if (adults > 0) await this.setCount('adult', adults);
    for (const type of TRAVELER_TYPES.filter((t) => t !== 'adult')) {
      await this.setCount(type, counts[type] ?? 0);
    }
    if (adults === 0) await this.setCount('adult', 0);
    await this.done();
  }
}
