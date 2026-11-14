import { describe, expect, it } from "vitest";
import { balanceDue, isOverdue, isPaidUp, shareFor, toPoolView } from "./funds";
import type { Contribution, Pool } from "./types";

const pool: Pool = {
  id: "bus",
  title: "Party Bus",
  description: "",
  placeholderGradient: "",
  targetAmount: 800,
  dueDate: "2027-03-01",
  shares: { default: 80, overrides: { groom: 0, big: 120 } },
};

const contributions: Contribution[] = [
  { id: "1", poolId: "bus", guestId: "a", amount: 80, paidAt: "2026-12-01T00:00:00Z" },
  { id: "2", poolId: "bus", guestId: "b", amount: 40, paidAt: "2026-12-01T00:00:00Z" },
  { id: "3", poolId: "other", guestId: "a", amount: 999, paidAt: "2026-12-01T00:00:00Z" },
];

describe("shares", () => {
  it("uses the default unless overridden", () => {
    expect(shareFor(pool, "a")).toBe(80);
    expect(shareFor(pool, "groom")).toBe(0);
    expect(shareFor(pool, "big")).toBe(120);
  });
});

describe("toPoolView", () => {
  it("totals the pool but only exposes the viewer's own payments", () => {
    const view = toPoolView(pool, contributions, "b");
    expect(view.raisedAmount).toBe(120);
    expect(view.myShare).toBe(80);
    expect(view.myPaid).toBe(40);
    expect(JSON.stringify(view)).not.toContain('"a"');
  });

  it("computes balance and paid-up status", () => {
    expect(balanceDue(toPoolView(pool, contributions, "b"))).toBe(40);
    expect(isPaidUp(toPoolView(pool, contributions, "a"))).toBe(true);
    expect(isPaidUp(toPoolView(pool, contributions, "groom"))).toBe(true); // $0 share
    expect(isPaidUp(toPoolView(pool, contributions, "c"))).toBe(false);
  });
});

describe("isOverdue", () => {
  const unpaid = toPoolView(pool, contributions, "c");
  it("is overdue only after the end of the due date, Arizona time", () => {
    expect(isOverdue(unpaid, new Date("2027-03-01T23:59:00-07:00"))).toBe(false);
    expect(isOverdue(unpaid, new Date("2027-03-02T00:00:01-07:00"))).toBe(true);
  });
  it("is never overdue when paid up or without a due date", () => {
    expect(isOverdue(toPoolView(pool, contributions, "a"), new Date("2028-01-01"))).toBe(false);
    expect(isOverdue({ ...unpaid, dueDate: undefined }, new Date("2028-01-01"))).toBe(false);
  });
});
