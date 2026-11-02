import { test, expect } from '@src/fixtures/test';

test.describe('Find trains: coupons', () => {
  test(
    'the coupon field keeps only letters and digits, up to 14',
    { tag: ['@negative', '@CPN-01'] },
    async ({ homePage }) => {
      const form = homePage.fareFinder;

      await form.enterCoupon('ab-12 3!x');

      await expect(form.couponInput).toHaveValue('ab123x');
      await expect(form.couponInput).toHaveAttribute('maxlength', '14');
    },
  );
});
