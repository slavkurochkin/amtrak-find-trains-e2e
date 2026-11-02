import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { FareFinderForm } from '../components/FareFinderForm';

/** amtrak.com/home. Only the booking form is modelled; other sections can be added as components. */
export class HomePage extends BasePage {
  protected readonly path = '/home';
  readonly fareFinder: FareFinderForm;

  constructor(page: Page) {
    super(page);
    this.fareFinder = new FareFinderForm(page);
  }

  protected async waitUntilReady(): Promise<void> {
    // The form is an Angular app that hydrates after the HTML loads.
    await expect(this.fareFinder.from.input).toBeVisible();
    await expect(this.fareFinder.findTrainsButton).toBeVisible();
  }
}
