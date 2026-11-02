import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';
import { type CalendarDate, toAriaLabel, toMonthHeader } from '../utils/dates';

/**
 * The two-month calendar popup (an ng-bootstrap datepicker).
 * Day cells are `role=gridcell` named like "Monday, November 16, 2026" and
 * carry `aria-disabled="true"` when they can't be booked.
 */
export class DatePicker extends BaseComponent {
  readonly root: Locator;
  readonly previousMonth: Locator;
  readonly nextMonth: Locator;
  readonly doneButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = this.visible('[cdktrapfocus]').filter({ has: page.locator('ngb-datepicker') });
    this.previousMonth = this.root.getByRole('button', { name: 'Previous month' });
    this.nextMonth = this.root.getByRole('button', { name: 'Next month' });
    this.doneButton = this.root.getByRole('button', { name: 'Done' });
    this.closeButton = this.root.getByRole('button', { name: 'Close', exact: true });
  }

  /**
   * A day cell. Each month grid also renders hidden, empty cells for days of
   * the neighbouring months, so we keep only cells that show a number.
   */
  day(date: CalendarDate): Locator {
    return this.root.getByRole('gridcell', { name: toAriaLabel(date), exact: true }).filter({ hasText: /\d/ });
  }

  async expectOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  /** Clicks "Next month" until the target month is on screen. */
  async showMonth(date: CalendarDate, maxClicks = 13): Promise<void> {
    const header = toMonthHeader(date);
    for (let i = 0; i < maxClicks; i++) {
      if (await this.day(date).isVisible()) return;
      if (await this.nextMonth.isDisabled()) break;
      await this.nextMonth.click();
    }
    await expect(this.day(date), `calendar should reach ${header}`).toBeVisible();
  }

  /** Accessible name of the last enabled day on screen, e.g. "Saturday, October 2, 2027". */
  async lastEnabledDay(): Promise<string | null> {
    const enabled = this.root.locator('[role="gridcell"][aria-disabled="false"]').filter({ hasText: /\d/ });
    return enabled.last().getAttribute('aria-label');
  }

  async pick(date: CalendarDate): Promise<void> {
    await this.showMonth(date);
    await this.day(date).click();
  }

  async done(): Promise<void> {
    await this.doneButton.click();
    await expect(this.root).toBeHidden();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root).toBeHidden();
  }
}
