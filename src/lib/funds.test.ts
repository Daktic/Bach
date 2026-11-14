import { describe, expect, it } from "vitest";
import { withCardFees } from "./card-fees";
import { balanceDue, chargeFor, isOverdue, isPaidUp, isValidOpenAmount, poolTarget, shareFor, toPoolView } from "./funds";
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

describe("open (choose-your-own-amount) pools", () => {
  const drinks: Pool = {
    id: "drinks",
    title: "Drink Fund",
    description: "",
    placeholderGradient: "",
    cost: 0,
    shares: { default: 0 },
    open: { presets: [10, 20, 50, 100] },
  };
  const paidIn: Contribution[] = [
    { id: "d1", poolId: "drinks", guestId: "a", amount: withCardFees(20), paidAt: "2026-12-01T00:00:00Z" },
    { id: "d2", poolId: "drinks", guestId: "a", amount: withCardFees(10), paidAt: "2026-12-02T00:00:00Z" },
    { id: "d3", poolId: "drinks", guestId: "b", amount: withCardFees(50), paidAt: "2026-12-03T00:00:00Z" },
  ];

  it("has no share or goal, and adds up repeat contributions", () => {
    const view = toPoolView(drinks, paidIn, "a", roster);
    expect(view.open).toEqual({ presets: [10, 20, 50, 100] });
    expect(view.myShare).toBe(0);
    expect(view.targetAmount).toBe(0);
    expect(view.myPaid).toBeCloseTo(withCardFees(20) + withCardFees(10), 2);
    expect(isPaidUp(view)).toBe(true);
    expect(isOverdue(view, new Date("2030-01-01"))).toBe(false);
  });

  it("is null on a pool with shares", () => {
    expect(toPoolView(pool, contributions, "a", roster).open).toBeNull();
  });
});

describe("isValidOpenAmount", () => {
  it("accepts whole dollars from $1 to $500", () => {
    for (const ok of [1, 10, 37, 500]) expect(isValidOpenAmount(ok)).toBe(true);
  });
  it("rejects everything else", () => {
    for (const bad of [0, -5, 2.5, 501, Number.NaN, "20", null, undefined]) expect(isValidOpenAmount(bad)).toBe(false);
  });
});

describe("pick-your-group pools", () => {
  const golf: Pool = {
    id: "golf",
    title: "Golf Day",
    description: "",
    placeholderGradient: "",
    cost: 0,
    dueDate: "2027-02-15",
    shares: { default: 0 },
    choices: [
      { id: "cholla", title: "Cholla at We-Ko-Pa", shortTitle: "Cholla", price: 310 },
      { id: "desert-canyon", title: "Desert Canyon Golf Club", shortTitle: "Desert Canyon", price: 110 },
    ],
  };
  const paidGolf: Contribution[] = [
    { id: "g1", poolId: "golf", guestId: "a", amount: withCardFees(310), paidAt: "2026-12-01T00:00:00Z", choiceId: "cholla" },
    { id: "g2", poolId: "golf", guestId: "b", amount: withCardFees(310), paidAt: "2026-12-01T00:00:00Z", choiceId: "cholla" },
    { id: "g3", poolId: "golf", guestId: "c", amount: withCardFees(110), paidAt: "2026-12-01T00:00:00Z", choiceId: "desert-canyon" },
  ];

  it("counts players per group and who still has to pick, without names", () => {
    const view = toPoolView(golf, paidGolf, "groom", roster);
    expect(view.choices?.map((c) => [c.id, c.players, c.charge])).toEqual([
      ["cholla", 2, withCardFees(310)],
      ["desert-canyon", 1, withCardFees(110)],
    ]);
    expect(view.undecided).toBe(2); // groom and big
    expect(JSON.stringify(view)).not.toContain('"guestId"');
  });

  it("charges the viewer for the group they paid for", () => {
    const view = toPoolView(golf, paidGolf, "c", roster);
    expect(view.myChoice).toBe("desert-canyon");
    expect(view.needsChoice).toBe(false);
    expect(view.myShare).toBe(withCardFees(110));
    expect(isPaidUp(view)).toBe(true);
  });

  it("treats a guest who hasn't picked as owing, and overdue after the due date", () => {
    const view = toPoolView(golf, paidGolf, "big", roster);
    expect(view.needsChoice).toBe(true);
    expect(view.myChoice).toBeNull();
    expect(isPaidUp(view)).toBe(false);
    expect(isOverdue(view, new Date("2027-02-15T23:00:00-07:00"))).toBe(false);
    expect(isOverdue(view, new Date("2027-02-16T00:00:01-07:00"))).toBe(true);
  });
});

describe("payments made outside Stripe", () => {
  const offlinePaid: Contribution[] = [
    ...contributions,
    { id: "o1", poolId: "bus", guestId: "c", amount: 80, paidAt: "2026-11-14", offline: true },
  ];

  it("settles the plain share, with no card fee", () => {
    const view = toPoolView(pool, offlinePaid, "c", roster);
    expect(view.myShare).toBe(80);
    expect(view.myCardFee).toBe(0);
    expect(view.myPaid).toBe(80);
    expect(isPaidUp(view)).toBe(true);
  });

  it("counts toward the raised total and lowers the target by the fee not charged", () => {
    const before = toPoolView(pool, contributions, "a", roster);
    const after = toPoolView(pool, offlinePaid, "a", roster);
    expect(after.raisedAmount).toBeCloseTo(before.raisedAmount + 80, 2);
    expect(after.targetAmount).toBeCloseTo(before.targetAmount - (withCardFees(80) - 80), 2);
  });

  it("leaves other guests' card fees alone", () => {
    expect(toPoolView(pool, offlinePaid, "a", roster).myShare).toBe(withCardFees(80));
  });
});
