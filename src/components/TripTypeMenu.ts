import { expect, test, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';

export enum TripType {
  OneWay = 'One-Way',
  RoundTrip = 'Round-Trip',
  MultiCity = 'Multi-City',
  GroupTravel = 'Group Travel',
}

const TAB_TEST_ID: Record<TripType, string> = {
  [TripType.OneWay]: 'fare-finder-oneway-trip-tab',
  [TripType.RoundTrip]: 'fare-finder-round-trip-tab',
  [TripType.MultiCity]: 'fare-finder-multi-city-tab',
  [TripType.GroupTravel]: 'fare-finder-group-travel-tab',
};

/** The "One-Way ▾" trip type dropdown above the form. */
export class TripTypeMenu extends BaseComponent {
  readonly toggle: Locator;

  constructor(page: Page) {
    super(page);
    this.toggle = this.byTestId('fare-finder-travel-selection');
  }

  async select(type: TripType): Promise<void> {
    await test.step(`Select trip type: ${type}`, async () => {
      await this.toggle.click();
      await this.byTestId(TAB_TEST_ID[type]).click();
      await this.expectSelected(type);
    });
  }

  /** Group Travel isn't a form mode: it opens the group request page. */
  async openGroupTravel(): Promise<void> {
    await test.step('Open Group Travel', async () => {
      await this.toggle.click();
      await this.byTestId(TAB_TEST_ID[TripType.GroupTravel]).click();
    });
  }

  async expectSelected(type: TripType): Promise<void> {
    await expect(this.toggle).toHaveAttribute('aria-label', `Trip Type:${type}`);
  }
}
