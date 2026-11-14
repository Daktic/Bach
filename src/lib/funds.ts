import { TRIP_UTC_OFFSET } from "./config";
import type { Contribution, Pool, PoolView } from "./types";

// Pure fund calculations, shared by the server functions and the UI.

/** What `guestId` owes toward `pool` (FN-9: per-guest overrides). */
export function shareFor(pool: Pool, guestId: string): number {
  const override = pool.shares.overrides?.[guestId];
  return Math.max(0, override ?? pool.shares.default);
}

/** One guest's view of a pool. Never includes anyone else's share or payments. */
export function toPoolView(
  pool: Pool,
  contributions: readonly Contribution[],
  guestId: string,
  activities: { id: string; title: string }[] = [],
): PoolView {
  let raisedAmount = 0;
  let myPaid = 0;
  for (const c of contributions) {
    if (c.poolId !== pool.id) continue;
    raisedAmount += c.amount;
    if (c.guestId === guestId) myPaid += c.amount;
  }
  return {
    id: pool.id,
    title: pool.title,
    description: pool.description,
    placeholderGradient: pool.placeholderGradient,
    image: pool.image,
    targetAmount: pool.targetAmount,
    raisedAmount,
    dueDate: pool.dueDate,
    myShare: shareFor(pool, guestId),
    myPaid,
    activities,
  };
}

/** Unpaid part of the guest's share; 0 when paid up or the share is $0. */
export function balanceDue(view: Pick<PoolView, "myShare" | "myPaid">): number {
  return Math.max(0, view.myShare - view.myPaid);
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
