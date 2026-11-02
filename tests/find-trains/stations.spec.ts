import { test, expect } from '@src/fixtures/test';
import { Stations } from '@src/data/stations';
import { Messages } from '@src/data/messages';

test.describe('Find trains: From / To station fields', () => {
  test('typing a city name suggests matching stations', { tag: '@STN-01' }, async ({ homePage }) => {
    const { from } = homePage.fareFinder;

    await from.search('Washington');

    // The best match comes first, and suggestions are grouped (Stations, then Locations).
    await expect(from.options.first()).toContainText('(WAS)');
    await expect(from.listbox).toContainText('Stations');
    const options = await from.optionTexts();
    expect(options.filter((o) => /washington/i.test(o)).length, 'several Washington matches').toBeGreaterThan(1);
  });

  test('typing an exact station code selects it without picking from the list', { tag: '@STN-02' }, async ({ homePage }) => {
    const { to } = homePage.fareFinder;

    await to.type(Stations.BOSTON.code);

    await to.expectSelected(Stations.BOSTON);
  });

  test('station codes are matched case-insensitively', { tag: '@STN-03' }, async ({ homePage }) => {
    const { from } = homePage.fareFinder;

    await from.search('nyp');

    await expect(from.options.first()).toContainText('(NYP)');
  });

  test('a suggestion can be chosen with the keyboard (ArrowDown + Enter)', { tag: '@STN-04' }, async ({ homePage }) => {
    const { from } = homePage.fareFinder;

    await from.selectWithKeyboard(Stations.PHILADELPHIA);

    await from.expectSelected(Stations.PHILADELPHIA);
  });

  test('swap button exchanges the From and To stations', { tag: '@STN-05' }, async ({ homePage }) => {
    const form = homePage.fareFinder;
    await form.from.select(Stations.NEW_YORK);
    await form.to.select(Stations.CHICAGO);
    await form.waitForStationsToSettle();

    await form.swapStations();

    await form.from.expectSelected(Stations.CHICAGO);
    await form.to.expectSelected(Stations.NEW_YORK);
  });

  test('KNOWN BUG: swapping right after picking To shows the same station in both fields', {
    tag: ['@known-bug', '@STN-09'],
    annotation: {
      type: 'issue',
      description: 'Swap clicked <300ms after choosing To: UI shows CHI -> CHI, search sends CHI -> NYP. ' +
        'Evidence: docs/evidence/bug-swap-race-ui-shows-CHI-CHI.png',
    },
  }, async ({ homePage }) => {
    // Asserts the correct behaviour, so it FAILS while the bug exists. It's a
    // timing race, so it can't gate CI either way: excluded from the default
    // run (see playwright.config.ts) and run on demand with `npm run test:known-bugs`.
    const form = homePage.fareFinder;
    await form.from.select(Stations.NEW_YORK);
    await form.to.select(Stations.CHICAGO);

    await form.swapStations(); // no pause

    await form.from.expectSelected(Stations.CHICAGO);
    await expect(form.to.root, 'To should show the old From station').toContainText(Stations.NEW_YORK.code);
  });

  test.describe('invalid input', { tag: '@negative' }, () => {
    test('an unknown station shows "No stations found." and is not accepted', { tag: '@STN-06' }, async ({ homePage }) => {
      const form = homePage.fareFinder;

      await form.from.search('Zzqxj');

      await expect(form.from.listbox).toContainText(Messages.NO_STATIONS_FOUND);
      await expect(form.from.options).toHaveCount(0);

      await form.from.input.press('Tab');
      await expect(form.message(Messages.INVALID_STATION)).toBeVisible();
      await expect(form.from.input, 'free text is not turned into a station').toBeVisible();
      await form.expectSearchDisabled();
    });

    test('HTML/script-like input is not executed or rendered', { tag: '@STN-07' }, async ({ homePage, page }) => {
      const payload = '<img src=x id=injected onerror=alert(1)>';
      const dialogs: string[] = [];
      page.on('dialog', async (d) => {
        dialogs.push(d.message());
        await d.dismiss();
      });
      const form = homePage.fareFinder;

      // Wait for the autocomplete lookup to come back (Amtrak's firewall
      // currently answers it with 403) before checking the result. Retried in
      // case the app wipes the fresh input before the lookup starts.
      await expect(async () => {
        const lookup = page.waitForResponse((r) => r.url().includes('/AutoCompleterArcgis/'));
        await form.from.enter(payload);
        await lookup;
      }).toPass();

      expect(dialogs, 'no script from the input should run').toEqual([]);
      await expect(page.locator('#injected'), 'input must not be rendered as HTML').toHaveCount(0);
      await expect(form.from.input).toHaveValue(payload);
      await expect(form.from.options.filter({ hasText: /\([A-Z]{3}\)/ })).toHaveCount(0);
      await form.expectSearchDisabled();
    });

    test('the same station for From and To is rejected', { tag: '@STN-08' }, async ({ homePage, searchSpy }) => {
      const form = homePage.fareFinder;

      await form.from.selectByCode(Stations.NEW_YORK);
      await form.to.selectByCode(Stations.NEW_YORK);

      await expect(form.message(Messages.SAME_STATIONS)).toBeVisible();
      await form.expectSearchDisabled();
      await form.clickFindTrains();
      await searchSpy.expectNoSearch();
    });
  });
});
