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
  let myChoice: string | null = null;
  const playersByChoice = new Map<string, Set<string>>();
  for (const c of contributions) {
    if (c.poolId !== pool.id) continue;
    const cents = Math.round(c.amount * 100);
    raisedCents += cents;
    if (c.guestId === guestId) {
      myPaidCents += cents;
      if (c.choiceId) myChoice = c.choiceId;
    }
    if (c.choiceId) {
      if (!playersByChoice.has(c.choiceId)) playersByChoice.set(c.choiceId, new Set());
      playersByChoice.get(c.choiceId)!.add(c.guestId);
    }
  }
  const choices = pool.choices?.map((choice) => ({
    ...choice,
    charge: withCardFees(choice.price),
    players: playersByChoice.get(choice.id)?.size ?? 0,
  })) ?? null;
  const picked = choices?.find((c) => c.id === myChoice) ?? null;
  // A pick-your-group pool: the viewer owes their group's price once picked.
  const myBase = choices ? (picked?.price ?? 0) : shareFor(pool, guestId);
  return {
    id: pool.id,
    title: pool.title,
    description: pool.description,
    placeholderGradient: pool.placeholderGradient,
    photos: (pool.photos ?? []).map((p) => ({ ...p })),
    // A pick-your-group pool has no fixed goal: group sizes aren't known
    // until everyone picks. Its page shows players per group instead.
    targetAmount: choices ? 0 : poolTarget(pool, guestIds),
    raisedAmount: raisedCents / 100,
    dueDate: pool.dueDate,
    myShare: withCardFees(myBase),
    myCardFee: cardFeeFor(myBase),
    myPaid: myPaidCents / 100,
    canPay: options.canPay ?? false,
    open: pool.open ? { presets: [...pool.open.presets] } : null,
    choices,
    myChoice: picked?.id ?? null,
    needsChoice: choices !== null && picked === null,
    undecided: choices
      ? guestIds.filter((id) => ![...playersByChoice.values()].some((players) => players.has(id))).length
      : 0,
    activities: options.activities ?? [],
  };
}

/** Unpaid part of the guest's share; 0 when paid up or the share is $0. */
export function balanceDue(view: Pick<PoolView, "myShare" | "myPaid">): number {
  return Math.max(0, Math.round((view.myShare - view.myPaid) * 100) / 100);
}

export function isPaidUp(view: Pick<PoolView, "myShare" | "myPaid"> & { needsChoice?: boolean }): boolean {
  return !view.needsChoice && balanceDue(view) === 0;
}

/** End of the due date, Arizona time. */
export function dueInstant(dueDate: string): Date {
  return new Date(`${dueDate}T23:59:59${TRIP_UTC_OFFSET}`);
}

/** FN-8: unpaid balance after the due date has passed. */
export function isOverdue(
  view: Pick<PoolView, "myShare" | "myPaid" | "dueDate"> & { needsChoice?: boolean },
  now: Date,
): boolean {
  // Not having picked a group yet counts as owing.
  if (!view.dueDate || (!view.needsChoice && balanceDue(view) === 0)) return false;
  return now.getTime() > dueInstant(view.dueDate).getTime();
}

export function isFullyFunded(view: Pick<PoolView, "raisedAmount" | "targetAmount">): boolean {
  return view.raisedAmount >= view.targetAmount;
}

/** Limits on a chosen amount in an open pool (whole dollars). */
export const OPEN_AMOUNT_MIN = 1;
export const OPEN_AMOUNT_MAX = 500;

/** A valid chosen amount: whole dollars within the limits. */
export function isValidOpenAmount(amount: unknown): amount is number {
  return (
    typeof amount === "number" &&
    Number.isInteger(amount) &&
    amount >= OPEN_AMOUNT_MIN &&
    amount <= OPEN_AMOUNT_MAX
  );
}
