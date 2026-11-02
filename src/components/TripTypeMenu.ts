import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';
import { step } from '../utils/step';

export enum TripType {
  OneWay = 'One-Way',
  RoundTrip = 'Round-Trip',
  MultiCity = 'Multi-City',
}

const TAB_TEST_ID: Record<TripType, string> = {
  [TripType.OneWay]: 'fare-finder-oneway-trip-tab',
  [TripType.RoundTrip]: 'fare-finder-round-trip-tab',
  [TripType.MultiCity]: 'fare-finder-multi-city-tab',
};

/** The "One-Way ▾" trip type dropdown above the form. */
export class TripTypeMenu extends BaseComponent {
  readonly toggle: Locator;

  constructor(page: Page) {
    super(page);
    this.toggle = this.byTestId('fare-finder-travel-selection');
  }

  async select(type: TripType): Promise<void> {
    await step(`Select trip type: ${type}`, async () => {
      await this.toggle.click();
      await this.byTestId(TAB_TEST_ID[type]).click();
      await this.expectSelected(type);
    });
  }

  async expectSelected(type: TripType): Promise<void> {
    await expect(this.toggle).toHaveAttribute('aria-label', `Trip Type:${type}`);
  }
}
