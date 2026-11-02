import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';
import { StationField } from './StationField';
import { DatePicker } from './DatePicker';
import { TravelersPanel } from './TravelersPanel';
import { TripType, TripTypeMenu } from './TripTypeMenu';
import type { SearchCriteria } from '../builders/SearchCriteriaBuilder';
import { type CalendarDate, toInputFormat } from '../utils/dates';
import { step } from '../utils/step';

/**
 * The homepage "Find trains" booking form. It composes one component per
 * widget so each can be reused (for example on the Schedules page, which has a
 * similar station search) and tested on its own.
 */
export class FareFinderForm extends BaseComponent {
  readonly root: Locator;
  readonly tripType: TripTypeMenu;
  readonly from: StationField;
  readonly to: StationField;
  readonly calendar: DatePicker;
  readonly travelers: TravelersPanel;
  readonly swapButton: Locator;
  readonly departInput: Locator;
  readonly returnInput: Locator;
  readonly findTrainsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = this.byTestId('fare-finder-cmp');
    this.tripType = new TripTypeMenu(page);
    this.from = new StationField(page, 'from');
    this.to = new StationField(page, 'to');
    this.calendar = new DatePicker(page);
    this.travelers = new TravelersPanel(page);
    this.swapButton = this.root.getByRole('button', { name: 'Switch departure and arrival stations.' });
    // One-way and round-trip render different inputs; the prefixes match both.
    this.departInput = this.visible('input[data-julie^="departdisplay_booking"]');
    this.returnInput = this.visible('input[data-julie^="returndisplay_booking"]');
    this.findTrainsButton = this.byTestId('fare-finder-findtrains-button');
  }

  /**
   * A validation/info message, e.g. "Enter different origin and destination stations."
   * Some messages are rendered twice (an inline copy and a screen-reader
   * alert), so we take the first visible match.
   */
  message(text: string | RegExp): Locator {
    return this.page.getByText(text).filter({ visible: true }).first();
  }

  async openDepartCalendar(): Promise<void> {
    // A floating <label> sits on top of the input, so a normal click is
    // intercepted. A forced click lands on the label, which forwards it.
    await this.departInput.click({ force: true });
    await this.calendar.expectOpen();
  }

  async openReturnCalendar(): Promise<void> {
    await this.returnInput.click({ force: true });
    await this.calendar.expectOpen();
  }

  async pickDepartDate(date: CalendarDate): Promise<void> {
    await step(`Pick depart date ${toInputFormat(date)}`, async () => {
      await this.openDepartCalendar();
      await this.calendar.pick(date);
      await this.calendar.done();
      await expect(this.departInput).toHaveValue(toInputFormat(date));
    });
  }

  /** Round trip: both dates are chosen in one calendar session (depart, then return). */
  async pickDateRange(depart: CalendarDate, ret: CalendarDate): Promise<void> {
    await step(`Pick dates ${toInputFormat(depart)} - ${toInputFormat(ret)}`, () => this.pickDateRangeSteps(depart, ret));
  }

  private async pickDateRangeSteps(depart: CalendarDate, ret: CalendarDate): Promise<void> {
    await this.openDepartCalendar();
    await this.calendar.pick(depart);
    await this.calendar.pick(ret);
    await this.calendar.done();
    await expect(this.departInput).toHaveValue(toInputFormat(depart));
    await expect(this.returnInput).toHaveValue(toInputFormat(ret));
  }

  /** Fills the whole form from a SearchCriteria object (see SearchCriteriaBuilder). */
  async fill(criteria: SearchCriteria): Promise<void> {
    await step(`Fill search form: ${criteria.tripType} ${criteria.from.code} -> ${criteria.to.code}`, () => this.fillSteps(criteria));
  }

  private async fillSteps(criteria: SearchCriteria): Promise<void> {
    if (criteria.tripType !== TripType.OneWay) await this.tripType.select(criteria.tripType);
    await this.from.select(criteria.from);
    await this.to.select(criteria.to);
    if (criteria.tripType === TripType.RoundTrip && criteria.returnDate) {
      await this.pickDateRange(criteria.departDate, criteria.returnDate);
    } else {
      await this.pickDepartDate(criteria.departDate);
    }
    const { travelers } = criteria;
    const isDefault = travelers.adult === 1 &&
      travelers.senior + travelers.youth + travelers.child + travelers.infant === 0;
    if (!isDefault) await this.travelers.setTravelers(travelers);
  }

  async swapStations(): Promise<void> {
    await step('Swap From and To', () => this.swapButton.click());
  }

  /**
   * Known Amtrak bug: clicking Swap within ~300ms of picking the To station
   * leaves both fields showing the old To station, while the search request
   * uses the swapped route. Tests that are not about that bug call this
   * first, like a user pausing for a moment. See stations.spec.ts
   * "KNOWN BUG" test and README "Findings".
   */
  async waitForStationsToSettle(): Promise<void> {
    await this.page.waitForTimeout(1_000);
  }

  async clickFindTrains(): Promise<void> {
    // force: the button is aria-disabled (not HTML-disabled) when the form is
    // invalid, so negative tests also need to be able to click it.
    await step('Click FIND TRAINS', () => this.findTrainsButton.click({ force: true }));
  }

  async expectSearchEnabled(): Promise<void> {
    await expect(this.findTrainsButton).toHaveAttribute('aria-disabled', 'false');
  }

  async expectSearchDisabled(): Promise<void> {
    await expect(this.findTrainsButton).toHaveAttribute('aria-disabled', 'true');
  }
}
