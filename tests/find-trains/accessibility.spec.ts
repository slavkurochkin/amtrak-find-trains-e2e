import { test, expect } from '@src/fixtures/test';
import { A11Y_BASELINE } from '@src/data/a11yBaseline';
import { scanAccessibility } from '@src/utils/a11y';

/**
 * WCAG 2.1 A/AA checks (axe-core) on each state of the form. Known violations
 * are a documented baseline; these tests fail on anything new.
 */
test.describe('Find trains: accessibility', { tag: '@a11y' }, () => {
  test('the form at rest has no new WCAG violations', { tag: '@A11Y-01' }, async ({ homePage, page }) => {
    const form = homePage.fareFinder;

    const result = await scanAccessibility(page, form.scanScope, A11Y_BASELINE.formAtRest);

    expect(result.newViolations).toEqual([]);
  });

  test('station suggestions have no new WCAG violations', { tag: '@A11Y-02' }, async ({ homePage, page }) => {
    const { from } = homePage.fareFinder;
    await from.search('Boston');

    const result = await scanAccessibility(page, from.scanScope, A11Y_BASELINE.stationSuggestions);

    expect(result.newViolations).toEqual([]);
  });

  test('the calendar has no WCAG violations', { tag: '@A11Y-03' }, async ({ homePage, page }) => {
    const form = homePage.fareFinder;
    await form.openDepartCalendar();

    const result = await scanAccessibility(page, form.calendar.scanScope, A11Y_BASELINE.calendar);

    expect(result.newViolations).toEqual([]);
  });

  test('the travelers panel has no new WCAG violations', { tag: '@A11Y-04' }, async ({ homePage, page }) => {
    const { travelers } = homePage.fareFinder;
    await travelers.open();

    const result = await scanAccessibility(page, travelers.scanScope, A11Y_BASELINE.travelersPanel);

    expect(result.newViolations).toEqual([]);
  });
});
