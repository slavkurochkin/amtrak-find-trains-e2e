import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';
import type { Station } from '../data/stations';
import { step } from '../utils/step';

export type StationFieldKind = 'from' | 'to';

/**
 * The From / To station autocomplete.
 *
 * Behaviour seen on the live site:
 *  - typing shows a listbox of `role=option` items grouped as Stations / Locations
 *  - typing an exact 3-letter station code auto-selects that station
 *  - once a station is selected the text input is hidden and a chip shows
 *    "<CODE> <City, ST> <Station name>"
 *  - a query with no match shows "No stations found." and clears on blur
 */
export class StationField extends BaseComponent {
  readonly root: Locator;
  readonly input: Locator;
  readonly listbox: Locator;
  readonly options: Locator;

  constructor(page: Page, readonly kind: StationFieldKind) {
    super(page);
    this.root = this.byTestId(`fare-finder-${kind}-station-field-page`);
    // Not filtered by visibility: the input is hidden once a station is chosen.
    this.input = this.root.locator('input[role="combobox"]');
    this.listbox = this.root.getByRole('listbox');
    this.options = this.listbox.getByRole('option');
  }

  async focus(): Promise<void> {
    await this.root.click();
  }

  /**
   * Enters the query in one input event. The autocomplete reacts to it just
   * like typing, and there is no window between keystrokes for the page to
   * move focus (seen under load: the tail of a To query landed in From).
   */
  async enter(text: string): Promise<void> {
    await this.input.fill(text);
  }

  /** Types one key at a time, for tests about real keyboard behaviour. */
  async type(text: string, delayMs = 80): Promise<void> {
    await this.focus();
    await this.input.pressSequentially(text, { delay: delayMs });
  }

  /** Enters a query and returns once suggestions (or the empty state) render. */
  async search(text: string): Promise<void> {
    await this.enter(text);
    await expect(this.listbox).toBeVisible();
  }

  async chooseOption(option: string | RegExp): Promise<void> {
    await this.options.filter({ hasText: option }).first().click();
  }

  /** Search by city name and click the matching station option. */
  async select(station: Station): Promise<void> {
    await step(`Select ${this.kind} station: ${station.code} (search "${station.name}")`, async () => {
      await this.search(station.name);
      await this.chooseOption(station.optionText);
      await this.expectSelected(station);
    });
  }

  /** Enter the exact station code, which the site auto-selects. */
  async selectByCode(station: Station): Promise<void> {
    await step(`Select ${this.kind} station by code: ${station.code}`, async () => {
      await this.enter(station.code);
      await this.expectSelected(station);
    });
  }

  /**
   * Picks a station using only the keyboard. Note: the first ArrowDown keeps
   * focus on the input; focus enters the list from the second press on.
   * Pressing Enter while focus is still on the input triggers the "Nearby"
   * (geolocation) lookup instead of picking a station.
   */
  async selectWithKeyboard(station: Station, maxPresses = 6): Promise<void> {
    await this.type(station.name);
    await expect(this.options.first()).toBeVisible();
    const wanted = this.options.filter({ hasText: station.optionText }).first();
    for (let i = 0; i < maxPresses; i++) {
      await this.page.keyboard.press('ArrowDown');
      if (await wanted.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(wanted, `keyboard focus should reach ${station.code}`).toBeFocused();
    await this.page.keyboard.press('Enter');
    await this.expectSelected(station);
  }

  async optionTexts(): Promise<string[]> {
    return (await this.options.allInnerTexts()).map((t) => t.trim());
  }

  async expectSelected(station: Station): Promise<void> {
    await expect(this.root).toContainText(station.code);
    await expect(this.root).toContainText(station.cityLabel);
    await expect(this.input).toBeHidden();
  }

}
