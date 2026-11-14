// Stripe's standard US card pricing: 2.9% + 30¢ per successful payment.
// The organiser decided pools absorb the fees: each guest's share is grossed
// up so that, after Stripe takes its cut, the pool still nets the full cost.

export const CARD_FEE_RATE = 0.029;
export const CARD_FEE_FIXED = 0.3;

const toCents = (dollars: number) => Math.round(dollars * 100);

/**
 * What to charge so that `amount` (dollars) is left after Stripe's fee,
 * rounded up to the cent. $320 → $329.87 (fee $9.87). $0 stays $0: there's
 * no payment, so no fee.
 *
 * Solves charge − (charge × 2.9% + 30¢) ≥ amount. Simply adding 2.9% of
 * the amount plus 30¢ would leave the pool a few cents short each time,
 * because the 2.9% is also taken from the fee itself.
 */
export function withCardFees(amount: number): number {
  if (!(amount > 0)) return 0;
  const target = toCents(amount);
  const net = (c: number) => c - Math.round(c * CARD_FEE_RATE) - toCents(CARD_FEE_FIXED);
  let cents = Math.ceil((target + toCents(CARD_FEE_FIXED)) / (1 - CARD_FEE_RATE));
  // Stripe rounds its fee to the cent, so settle on the smallest charge whose
  // net still covers the amount.
  while (net(cents) < target) cents++;
  while (net(cents - 1) >= target) cents--;
  return cents / 100;
}

/** The card-fee part of `withCardFees(amount)`. */
export function cardFeeFor(amount: number): number {
  return (toCents(withCardFees(amount)) - toCents(Math.max(0, amount))) / 100;
}

/** Dollars → integer cents for the Stripe API. */
export function dollarsToCents(dollars: number): number {
  return toCents(dollars);
}
