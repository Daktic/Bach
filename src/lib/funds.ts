import { cardFeeFor, withCardFees } from "./card-fees";
import { TRIP_UTC_OFFSET } from "./config";
import type { Contribution, Pool, PoolView } from "./types";

// Pure fund calculations, shared by the server functions and the UI.

/** `guestId`'s part of the pool's cost, before card fees (FN-9: per-guest overrides). */
export function shareFor(pool: Pool, guestId: string): number {
  const override = pool.shares.overrides?.[guestId];
  return Math.max(0, override ?? pool.shares.default);
}

/** What `guestId` is charged: their share plus Stripe's card fee. */
export function chargeFor(pool: Pool, guestId: string): number {
  return withCardFees(shareFor(pool, guestId));
}

/** What the pool must raise: every guest's charge, so it nets the full cost. */
export function poolTarget(pool: Pool, guestIds: readonly string[]): number {
  const cents = guestIds.reduce((sum, id) => sum + Math.round(chargeFor(pool, id) * 100), 0);
  return cents / 100;
}

/**
 * One guest's view of a pool. Never includes anyone else's share or payments.
 * `guestIds` is the whole roster, used only for the pool's total target.
 */
export function toPoolView(
  pool: Pool,
  contributions: readonly Contribution[],
  guestId: string,
  guestIds: readonly string[],
  options: { activities?: { id: string; title: string }[]; canPay?: boolean } = {},
): PoolView {
  let raisedCents = 0;
  let myPaidCents = 0;
  for (const c of contributions) {
    if (c.poolId !== pool.id) continue;
    const cents = Math.round(c.amount * 100);
    raisedCents += cents;
    if (c.guestId === guestId) myPaidCents += cents;
  }
  return {
    id: pool.id,
    title: pool.title,
    description: pool.description,
    placeholderGradient: pool.placeholderGradient,
    image: pool.image,
    targetAmount: poolTarget(pool, guestIds),
    raisedAmount: raisedCents / 100,
    dueDate: pool.dueDate,
    myShare: chargeFor(pool, guestId),
    myCardFee: cardFeeFor(shareFor(pool, guestId)),
    myPaid: myPaidCents / 100,
    canPay: options.canPay ?? false,
    activities: options.activities ?? [],
  };
}

/** Unpaid part of the guest's share; 0 when paid up or the share is $0. */
export function balanceDue(view: Pick<PoolView, "myShare" | "myPaid">): number {
  return Math.max(0, Math.round((view.myShare - view.myPaid) * 100) / 100);
}

export function isPaidUp(view: Pick<PoolView, "myShare" | "myPaid">): boolean {
  return balanceDue(view) === 0;
}

/** End of the due date, Arizona time. */
export function dueInstant(dueDate: string): Date {
  return new Date(`${dueDate}T23:59:59${TRIP_UTC_OFFSET}`);
}

/** FN-8: unpaid balance after the due date has passed. */
export function isOverdue(
  view: Pick<PoolView, "myShare" | "myPaid" | "dueDate">,
  now: Date,
): boolean {
  if (!view.dueDate || balanceDue(view) === 0) return false;
  return now.getTime() > dueInstant(view.dueDate).getTime();
}

export function isFullyFunded(view: Pick<PoolView, "raisedAmount" | "targetAmount">): boolean {
  return view.raisedAmount >= view.targetAmount;
}
