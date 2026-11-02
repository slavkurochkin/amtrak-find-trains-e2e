# Coupons

The "Add Coupon" dropdown with an eCoupon code field.
Tests: `tests/find-trains/coupons.spec.ts`

### CPN-01 · The coupon field accepts only letters and digits, up to 14
**Status:** automated · **Type:** negative
**When** the user types `ab-12 3!x` **Then** the field shows `ab123x` (other characters are dropped as typed); the field allows at most 14 characters.

### CPN-02 · An invalid coupon is explained to the user
**Status:** gap · **Type:** negative
**Observed:** with coupon `X000` entered, FIND TRAINS stays disabled and no message says why (finding). The valid coupon format isn't public, so the rule can't be pinned down without a real coupon; kept as a gap.
