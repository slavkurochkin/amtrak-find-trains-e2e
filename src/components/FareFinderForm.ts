import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';
import { StationField } from './StationField';
import { DatePicker } from './DatePicker';
import { TravelersPanel } from './TravelersPanel';
import { TripType, TripTypeMenu } from './TripTypeMenu';
import type { SearchCriteria } from '../builders/SearchCriteriaBuilder';
import { type CalendarDate, toInputFormat } from '../utils/dates';
import { step } from '../utils/step';
import type { TimingOptions } from '../utils/timing';

/** One leg of a Multi-City trip. Leg 0 is also the normal One-Way / Round-Trip leg. */
export interface TripLeg {
  from: StationField;
  to: StationField;
  departInput: Locator;
}

export type FareFinderOptions = Pick<TimingOptions, 'stationSettleMs' | 'typingDelayMs'>;

/**
 * The homepage "Find trains" booking form. It composes one component per
 * widget so each can be reused (for example on the Schedules page, which has a
 * similar station search) and tested on its own.
 */
export class FareFinderForm extends BaseComponent {
  /** CSS scope for accessibility scans (axe takes selectors, not locators). */
  readonly scanScope = '[amt-auto-test-id="fare-finder-cmp"]';
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
  readonly usePointsSwitch: Locator;
  readonly assistanceCheckbox: Locator;
  /** Opens when FIND TRAINS is clicked with "Passenger with Disability or Assistance Needed?" checked. */
  readonly assistanceDialog: Locator;
  readonly couponToggle: Locator;
  readonly couponInput: Locator;
  readonly addTripButton: Locator;

  constructor(
    page: Page,
    private readonly options: FareFinderOptions,
  ) {
    super(page);
    this.root = this.byTestId('fare-finder-cmp');
    this.tripType = new TripTypeMenu(page);
    this.from = new StationField(page, 'from', options);
    this.to = new StationField(page, 'to', options);
    this.calendar = new DatePicker(page);
    this.travelers = new TravelersPanel(page);
    this.swapButton = this.root.getByRole('button', { name: 'Switch departure and arrival stations.' });
    // One-way and round-trip render different inputs; the prefixes match both.
    this.departInput = this.visible('input[data-julie^="departdisplay_booking"]');
    this.returnInput = this.visible('input[data-julie^="returndisplay_booking"]');
    this.findTrainsButton = this.byTestId('fare-finder-findtrains-button');
    this.usePointsSwitch = this.byTestId('fare-finder-redeem-points');
    this.assistanceCheckbox = this.byTestId('assistance-checkbox');
    this.assistanceDialog = this.visible('[role="dialog"], .modal.show').filter({
      hasText: 'Accessible Travel Services',
    });
    this.couponToggle = this.byTestId('fare-finder-coupondropdown-button');
    this.couponInput = this.byTestId('fare-finder-rewards-coupon');
    this.addTripButton = this.byTestId('multi-city-add-trip');
  }

  /**
   * A validation/info message, e.g. "Enter different origin and destination stations."
   * Some messages are rendered twice (an inline copy and a screen-reader
   * alert), so we take the first visible match.
   */
  message(text: string | RegExp): Locator {
    return this.page.getByText(text).filter({ visible: true }).first();
  }

  /** Multi-City leg by position (0-based). */
  leg(index: number): TripLeg {
    return {
      from: new StationField(this.page, 'from', this.options, index),
      to: new StationField(this.page, 'to', this.options, index),
      departInput: this.departInput.nth(index),
    };
  }

  /** Picks the depart date of a Multi-City leg in that leg's calendar. */
  async pickLegDate(index: number, date: CalendarDate): Promise<void> {
    await step(`Pick leg ${index + 1} date ${toInputFormat(date)}`, async () => {
      const input = this.leg(index).departInput;
      await input.click({ force: true }); // floating label covers the input
      await this.calendar.expectOpen();
      await this.calendar.pick(date);
      await this.calendar.done();
      await expect(input).toHaveValue(toInputFormat(date));
    });
  }

  async enterCoupon(code: string): Promise<void> {
    await step(`Enter coupon "${code}"`, async () => {
      if (!(await this.couponInput.isVisible())) await this.couponToggle.click();
      await this.couponInput.pressSequentially(code, { delay: this.options.typingDelayMs });
    });
  }

  async openDepartCalendar(): Promise<void> {
    // A floating <label> sits on top of the input, so a normal click is
    // intercepted. A forced click lands on the label, which forwards it.
    await this.departInput.click({ force: true });
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

  /**
   * Types a date into Depart Date with the keyboard, then leaves the field so
   * the site validates it. Focus is set without a click: clicking opens the
   * calendar, which takes the keystrokes instead of the input.
   * Right after a station is picked the app can briefly move focus away, so
   * keystrokes may be lost (and even land in the station field, finding STN-11):
   * type dates before picking stations, and we retype (toPass) until every key landed.
   */
  async typeDepartDate(text: string): Promise<void> {
    await step(`Type depart date "${text}"`, async () => {
      await expect(async () => {
        await this.departInput.fill('');
        await this.departInput.focus();
        await this.departInput.pressSequentially(text, { delay: this.options.typingDelayMs });
        await expect(this.departInput).toHaveValue(text);
      }).toPass();
      await this.departInput.blur();
    });
  }

  /** Round trip: both dates are chosen in one calendar session (depart, then return). */
  async pickDateRange(depart: CalendarDate, ret: CalendarDate): Promise<void> {
    await step(`Pick dates ${toInputFormat(depart)} - ${toInputFormat(ret)}`, async () => {
      await this.openDepartCalendar();
      await this.calendar.pick(depart);
      await this.calendar.pick(ret);
      await this.calendar.done();
      await expect(this.departInput).toHaveValue(toInputFormat(depart));
      await expect(this.returnInput).toHaveValue(toInputFormat(ret));
    });
  }

  /** Fills the whole form from a SearchCriteria object (see SearchCriteriaBuilder). */
  async fill(criteria: SearchCriteria): Promise<void> {
    await step(`Fill search form: ${criteria.tripType} ${criteria.from.code} -> ${criteria.to.code}`, async () => {
      if (criteria.tripType !== TripType.OneWay) await this.tripType.select(criteria.tripType);
      await this.from.select(criteria.from);
      await this.to.select(criteria.to);
      if (criteria.returnDate) {
        await this.pickDateRange(criteria.departDate, criteria.returnDate);
      } else {
        await this.pickDepartDate(criteria.departDate);
      }
      const { adult, ...others } = criteria.travelers;
      const isDefault = adult === 1 && Object.values(others).every((n) => n === 0);
      if (!isDefault) await this.travelers.setTravelers(criteria.travelers);
    });
  }

  async swapStations(): Promise<void> {
    await step('Swap From and To', () => this.swapButton.click());
  }

  /**
   * Known Amtrak bug: clicking Swap within ~300ms of picking the To station
   * leaves both fields showing the old To station, while the search request
   * uses the swapped route. There is no DOM signal for "settled", so tests
   * that are not about that bug pause for `stationSettleMs` (config option),
   * like a user would. See the "KNOWN BUG" test and README "Findings".
   */
  async waitForStationsToSettle(): Promise<void> {
    // eslint-disable-next-line playwright/no-wait-for-timeout -- named config option, no DOM signal exists
    await this.page.waitForTimeout(this.options.stationSettleMs);
  }

  async clickFindTrains(): Promise<void> {
    // force: the button is aria-disabled (not HTML-disabled) when the form is
    // invalid, so negative tests also need to be able to click it.
    // On touch devices this taps like a finger (see BaseComponent.pressPinnedButton).
    await step('Click FIND TRAINS', () => this.pressPinnedButton(this.findTrainsButton, { force: true }));
  }

  async expectSearchEnabled(): Promise<void> {
    await expect(this.findTrainsButton).toHaveAttribute('aria-disabled', 'false');
  }

  async expectSearchDisabled(): Promise<void> {
    await expect(this.findTrainsButton).toHaveAttribute('aria-disabled', 'true');
  }
}
