import { describe, expect, it } from "vitest";
import { CARD_FEE_FIXED, CARD_FEE_RATE, cardFeeFor, dollarsToCents, withCardFees } from "./card-fees";

/** Cents the pool actually receives from a charge (in cents), after Stripe's fee. */
const netCents = (cents: number) => cents - Math.round(cents * CARD_FEE_RATE) - dollarsToCents(CARD_FEE_FIXED);
const netOf = (charge: number) => netCents(dollarsToCents(charge)) / 100;

describe("withCardFees", () => {
  it("grosses a share up so the pool nets the full amount", () => {
    expect(withCardFees(320)).toBe(329.87);
    expect(cardFeeFor(320)).toBe(9.87);
    expect(netOf(329.87)).toBeGreaterThanOrEqual(320);
  });

  it("never leaves the pool short, and overshoots by at most a cent", () => {
    for (let cents = 1; cents <= 100_000; cents += 37) {
      const amount = cents / 100;
      const charge = dollarsToCents(withCardFees(amount));
      expect(netCents(charge)).toBeGreaterThanOrEqual(cents);
      expect(netCents(charge - 1)).toBeLessThan(cents);
    }
  });

  it("charges nothing for a $0 share", () => {
    expect(withCardFees(0)).toBe(0);
    expect(cardFeeFor(0)).toBe(0);
    expect(withCardFees(-5)).toBe(0);
  });
});
