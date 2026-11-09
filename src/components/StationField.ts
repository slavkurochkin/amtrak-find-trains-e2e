import { expect, test, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';
import type { Station } from '../data/stations';
import { STATION_SEARCH_URL, type StationSearchReply } from '../data/stationServices';
import { timing } from '../utils/timing';

export type StationFieldKind = 'from' | 'to';

/** The panel shown instead of query results when the input was wiped. */
const POPULAR_STATIONS_PANEL = /Top (depart stations|destinations)/;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  readonly scanScope: string;
  readonly root: Locator;
  readonly input: Locator;
  readonly listbox: Locator;
  readonly options: Locator;
  /** "Loading" shown while the station lookup is in flight. */
  readonly loading: Locator;

  constructor(
    page: Page,
    readonly kind: StationFieldKind,
    /** Multi-City: which leg (0 = first). Every leg reuses the same test ids. */
    leg = 0,
  ) {
    super(page);
    this.scanScope = `[amt-auto-test-id="fare-finder-${kind}-station-field-page"]`;
    this.root = this.byTestId(`fare-finder-${kind}-station-field-page`).nth(leg);
    // Not filtered by visibility: the input is hidden once a station is chosen.
    this.input = this.root.locator('input[role="combobox"]');
    this.listbox = this.root.getByRole('listbox');
    this.options = this.listbox.getByRole('option');
    this.loading = this.listbox.getByText('Loading', { exact: true });
  }

  async focus(): Promise<void> {
    await this.root.click();
  }

  /**
   * The panel an empty field shows when clicked: a heading ("Top depart stations",
   * or "Top destinations from NYP" for To) and suggested stations. Which stations
   * are listed is Amtrak's editorial choice and changes, so only their presence is checked.
   */
  async expectPopularStations(heading: string, { withNearby }: { withNearby: boolean }): Promise<void> {
    await expect(this.listbox.getByText(heading, { exact: true })).toBeVisible();
    await expect(this.options.filter({ hasText: /\([A-Z]{3}\)/ }).first()).toBeVisible();
    const nearby = this.listbox.getByRole('button', { name: 'Nearby' });
    await (withNearby ? expect(nearby).toBeVisible() : expect(nearby).toBeHidden());
  }

  /**
   * Enters the query in one input event. The autocomplete reacts to it just
   * like typing, and there is no window between keystrokes for the page to
   * move focus (seen under load: the tail of a To query landed in From).
   */
  async enter(text: string): Promise<void> {
    await this.input.fill(text);
  }

  /**
   * Types one key at a time, for tests about real keyboard behaviour.
   * Amtrak quirk: right after a click the app sometimes moves focus to the
   * suggestion panel header, so early keystrokes are lost. We retype (toPass)
   * until every key landed, or the typed code auto-selected a station.
   */
  async type(text: string): Promise<void> {
    await expect(async () => {
      if (await this.input.isVisible()) await this.input.fill('');
      await this.focus();
      await this.input.pressSequentially(text, { delay: timing().typingDelayMs });
      if (await this.input.isVisible()) await expect(this.input).toHaveValue(text);
    }).toPass();
  }

  /**
   * Enters a query and returns once its results (or "No stations found.")
   * render. Under heavy load the app's focus handler can occasionally wipe
   * fresh input and show "Top depart stations" instead; `toPass` (limits in
   * playwright.config.ts `expect.toPass`) re-enters the query when that happens.
   */
  async search(text: string): Promise<void> {
    await expect(async () => {
      await this.enter(text);
      await expect(this.input).toHaveValue(text);
      // Results for this query (or the empty state), not the popular-stations panel.
      await expect(this.listbox).toContainText(new RegExp(`${escapeRegExp(text)}|No stations found`, 'i'));
      await expect(this.listbox).not.toContainText(POPULAR_STATIONS_PANEL);
    }).toPass();
  }

  /**
   * Like search(), and also returns the reply the page got from the station
   * search service for this query, so a test can compare it with the dropdown.
   */
  async searchWithReply(text: string): Promise<StationSearchReply> {
    const reply = this.page.waitForResponse(
      (r) => r.url().includes(STATION_SEARCH_URL) && r.url().includes(encodeURIComponent(text)) && r.ok(),
    );
    await this.search(text);
    return (await (await reply).json()) as StationSearchReply;
  }

  async chooseOption(option: string | RegExp): Promise<void> {
    await this.options.filter({ hasText: option }).first().click();
  }

  /** Search by city name and click the matching station option. */
  async select(station: Station): Promise<void> {
    await test.step(`Select ${this.kind} station: ${station.code} (search "${station.name}")`, async () => {
      await this.search(station.name);
      await this.chooseOption(station.optionText);
      await this.expectSelected(station);
    });
  }

  /** Enter the exact station code, which the site auto-selects. */
  async selectByCode(station: Station): Promise<void> {
    await test.step(`Select ${this.kind} station by code: ${station.code}`, async () => {
      // Retried like search() in case the input gets wiped before it's matched.
      await expect(async () => {
        if (await this.input.isVisible()) await this.enter(station.code);
        await this.expectSelected(station);
      }).toPass();
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
