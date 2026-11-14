import { balanceDue, isPaidUp } from "~/lib/funds";
import type { PoolView } from "~/lib/types";
import { formatCalendarDate } from "~/lib/zoned-time";

// Display helpers for the funds pages. Pure (no clock, no browser APIs), so
// they're safe during SSR. They only ever see the viewer's own share.

/** "$3,200", or "$82.50" when there are cents. */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const digits = Number.isInteger(rounded) ? 0 : 2;
  const text = Math.abs(rounded).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${rounded < 0 ? "-" : ""}$${text}`;
}

/** Share of the goal raised so far, clamped to 0–100. A $0 goal counts as funded. */
export function fundedPercent(view: Pick<PoolView, "raisedAmount" | "targetAmount">): number {
  if (view.targetAmount <= 0) return 100;
  return Math.min(100, Math.max(0, (view.raisedAmount / view.targetAmount) * 100));
}

/** What the pool still needs to reach its goal; 0 once funded. */
export function amountToGo(view: Pick<PoolView, "raisedAmount" | "targetAmount">): number {
  return Math.max(0, view.targetAmount - view.raisedAmount);
}

/** Where the viewer stands in one pool. "none" is a $0 share (FN-9). */
export type ShareState = "none" | "unpaid" | "partial" | "paid";

export function shareState(view: Pick<PoolView, "myShare" | "myPaid">): ShareState {
  if (view.myShare <= 0) return "none";
  if (isPaidUp(view)) return "paid";
  return view.myPaid > 0 ? "partial" : "unpaid";
}

export interface PaidUpSummary {
  /** Pools where the viewer's share is more than $0, in display order. */
  counted: PoolView[];
  /** N in "paid up on N of M". */
  paid: number;
  /** M in "paid up on N of M". */
  total: number;
  /** Sum of the viewer's unpaid balances. */
  outstanding: number;
}

/** FN-2: "paid up on N of M". $0 shares don't count toward either number (FN-9). */
export function paidUpSummary(views: readonly PoolView[]): PaidUpSummary {
  const counted = views.filter((v) => v.myShare > 0);
  return {
    counted,
    paid: counted.filter((v) => isPaidUp(v)).length,
    total: counted.length,
    outstanding: counted.reduce((sum, v) => sum + balanceDue(v), 0),
  };
}

/** "Mar 1", or "Mon, Mar 1, 2027" in the long style. Never shifted by the viewer's time zone. */
export function formatDueDate(dueDate: string, style: "short" | "long" = "short"): string {
  return formatCalendarDate(
    dueDate,
    style === "long"
      ? { weekday: "short", month: "short", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" },
  );
}
