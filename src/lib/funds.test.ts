import { describe, expect, it } from "vitest";
import { withCardFees } from "./card-fees";
import { balanceDue, chargeFor, isOverdue, isPaidUp, poolTarget, shareFor, toPoolView } from "./funds";
import type { Contribution, Pool } from "./types";

const pool: Pool = {
  id: "bus",
  title: "Party Bus",
  description: "",
  placeholderGradient: "",
  cost: 280,
  dueDate: "2027-03-01",
  shares: { default: 80, overrides: { groom: 0, big: 120 } },
};
const roster = ["a", "b", "c", "groom", "big"];

// Payments are what guests were charged: their share plus the card fee.
const charge80 = withCardFees(80); // $82.70
const contributions: Contribution[] = [
  { id: "1", poolId: "bus", guestId: "a", amount: charge80, paidAt: "2026-12-01T00:00:00Z" },
  { id: "2", poolId: "bus", guestId: "b", amount: 40, paidAt: "2026-12-01T00:00:00Z" },
  { id: "3", poolId: "other", guestId: "a", amount: 999, paidAt: "2026-12-01T00:00:00Z" },
];

describe("shares", () => {
  it("uses the default unless overridden", () => {
    expect(shareFor(pool, "a")).toBe(80);
    expect(shareFor(pool, "groom")).toBe(0);
    expect(shareFor(pool, "big")).toBe(120);
  });

  it("charges each share plus its card fee; a $0 share is charged nothing", () => {
    expect(chargeFor(pool, "a")).toBe(82.7);
    expect(chargeFor(pool, "groom")).toBe(0);
  });

  it("targets the cost plus every guest's card fee", () => {
    const expected = 3 * withCardFees(80) + withCardFees(120);
    expect(poolTarget(pool, roster)).toBeCloseTo(expected, 2);
    expect(poolTarget(pool, roster)).toBeGreaterThan(pool.cost);
  });
});

describe("toPoolView", () => {
  it("totals the pool but only exposes the viewer's own payments", () => {
    const view = toPoolView(pool, contributions, "b", roster);
    expect(view.raisedAmount).toBe(charge80 + 40);
    expect(view.myShare).toBe(charge80);
    expect(view.myCardFee).toBe(2.7);
    expect(view.myPaid).toBe(40);
    expect(view.canPay).toBe(false);
    expect(JSON.stringify(view)).not.toContain('"a"');
  });

  it("computes balance and paid-up status", () => {
    expect(balanceDue(toPoolView(pool, contributions, "b", roster))).toBe(42.7);
    expect(isPaidUp(toPoolView(pool, contributions, "a", roster))).toBe(true);
    expect(isPaidUp(toPoolView(pool, contributions, "groom", roster))).toBe(true); // $0 share
    expect(isPaidUp(toPoolView(pool, contributions, "c", roster))).toBe(false);
  });
});

describe("isOverdue", () => {
  const unpaid = toPoolView(pool, contributions, "c", roster);
  it("is overdue only after the end of the due date, Arizona time", () => {
    expect(isOverdue(unpaid, new Date("2027-03-01T23:59:00-07:00"))).toBe(false);
    expect(isOverdue(unpaid, new Date("2027-03-02T00:00:01-07:00"))).toBe(true);
  });
  it("is never overdue when paid up or without a due date", () => {
    expect(isOverdue(toPoolView(pool, contributions, "a", roster), new Date("2028-01-01"))).toBe(false);
    expect(isOverdue({ ...unpaid, dueDate: undefined }, new Date("2028-01-01"))).toBe(false);
  });
});
