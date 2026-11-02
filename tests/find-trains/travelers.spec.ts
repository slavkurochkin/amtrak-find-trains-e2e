import { test, expect } from '@src/fixtures/test';
import { Messages } from '@src/data/messages';
import { TRAVELER_TYPES } from '@src/components/TravelersPanel';

const MAX_ONLINE_TRAVELERS = 8;

test.describe('Find trains: travelers', () => {
  test('defaults to one adult', async ({ homePage }) => {
    const { travelers } = homePage.fareFinder;

    await expect(travelers.toggle).toHaveText('1 Traveler', { useInnerText: true });
    await travelers.open();
    await expect(travelers.countLabel('adult')).toHaveText('1');
    for (const type of TRAVELER_TYPES.filter((t) => t !== 'adult')) {
      await expect(travelers.countLabel(type), `${type} count`).toHaveText('0');
      await expect(travelers.decrement(type), `${type} "-" at zero`).toBeDisabled();
    }
  });

  test('the summary shows the total across traveler types', async ({ homePage }) => {
    const { travelers } = homePage.fareFinder;

    await travelers.setTravelers({ adult: 2, child: 1, infant: 1 });

    await expect(travelers.toggle).toHaveText('4 Travelers', { useInnerText: true });
  });

  test('Reset returns to one adult', async ({ homePage }) => {
    const { travelers } = homePage.fareFinder;
    await travelers.open();
    await travelers.setCount('adult', 3);
    await travelers.setCount('senior', 2);

    await travelers.resetButton.click();

    await expect(travelers.countLabel('adult')).toHaveText('1');
    await expect(travelers.countLabel('senior')).toHaveText('0');
  });

  test(`up to ${MAX_ONLINE_TRAVELERS} travelers can book online`, async ({ homePage }) => {
    const form = homePage.fareFinder;
    await form.travelers.open();

    await form.travelers.setCount('adult', MAX_ONLINE_TRAVELERS);

    await expect(form.message(Messages.TOO_MANY_TRAVELERS)).toBeHidden();
    await expect(form.travelers.increment('adult')).toBeEnabled();
  });

  test.describe('invalid traveler combinations', { tag: '@negative' }, () => {
    test(`more than ${MAX_ONLINE_TRAVELERS} travelers points to phone booking and blocks adding more`, async ({ homePage }) => {
      const form = homePage.fareFinder;
      await form.travelers.open();

      await form.travelers.setCount('adult', MAX_ONLINE_TRAVELERS + 1);

      await expect(form.message(Messages.TOO_MANY_TRAVELERS)).toBeVisible();
      for (const type of TRAVELER_TYPES) {
        await expect(form.travelers.increment(type), `"+" for ${type}`).toBeDisabled();
      }
    });

    test('removing the only adult asks for at least one adult and disables search', async ({ homePage }) => {
      const form = homePage.fareFinder;
      await form.travelers.open();

      await form.travelers.setCount('adult', 0);

      await expect(form.message(Messages.NEED_ADULT)).toBeVisible();
      await expect(form.travelers.decrement('adult')).toBeDisabled();
      await form.expectSearchDisabled();
    });

    test('children without an adult are not enough to search', async ({ homePage }) => {
      const form = homePage.fareFinder;
      await form.travelers.open();

      await form.travelers.setCount('child', 2);
      await form.travelers.setCount('adult', 0);

      await expect(form.message(Messages.NEED_ADULT)).toBeVisible();
      await form.expectSearchDisabled();
    });

    test('the adult counter cannot go below zero', async ({ homePage }) => {
      const { travelers } = homePage.fareFinder;
      await travelers.open();
      await travelers.setCount('adult', 0);

      await travelers.decrement('adult').click({ force: true });

      await expect(travelers.countLabel('adult')).toHaveText('0');
    });
  });
});
