import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { FareFinderForm } from '../components/FareFinderForm';
import { STATION_LIST_URL, type StationRecord } from '../data/stationServices';

/** amtrak.com/home. Only the booking form is modelled; other sections can be added as components. */
export class HomePage extends BasePage {
  protected readonly path = '/home';
  // Station list (autocomplete, exact-code matching) and "Top depart stations".
  protected readonly requiredData = [STATION_LIST_URL, /\/services\/data\.popularstations\.json/];
  readonly fareFinder: FareFinderForm;

  constructor(page: Page) {
    super(page);
    this.fareFinder = new FareFinderForm(page);
  }

  protected async waitUntilReady(): Promise<void> {
    // The form is an Angular app that hydrates after the HTML loads. While it
    // does, both layouts (desktop and mobile) can briefly be visible (seen in
    // Firefox), so "ready" means exactly one FIND TRAINS button is showing.
    await expect(this.fareFinder.findTrainsButton).toHaveCount(1);
    await expect(this.fareFinder.from.input).toBeVisible();
  }

  /** The station list the page loaded (the reply it already received; no extra request). */
  async stationList(): Promise<StationRecord[]> {
    const reply = this.dataReplies.find((r) => STATION_LIST_URL.test(r.url()));
    if (!reply) throw new Error('The station list was not loaded');
    return (await reply.json()) as StationRecord[];
  }
}
