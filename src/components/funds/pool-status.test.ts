import { describe, expect, it } from "vitest";
import type { PoolView } from "~/lib/types";
import {
  amountToGo,
  formatDueDate,
  formatMoney,
  fundedPercent,
  paidUpSummary,
  shareState,
} from "./pool-status";

function view(overrides: Partial<PoolView> = {}): PoolView {
  return {
    id: "bus",
    title: "Party Bus",
    description: "",
    placeholderGradient: "",
    targetAmount: 800,
    raisedAmount: 320,
    dueDate: "2027-03-01",
    myShare: 80,
    myPaid: 0,
    activities: [],
    ...overrides,
  };
}

describe("formatMoney", () => {
  it("formats whole dollars with thousands separators", () => {
    expect(formatMoney(3200)).toBe("$3,200");
    expect(formatMoney(0)).toBe("$0");
    expect(formatMoney(1234567)).toBe("$1,234,567");
  });

  it("shows cents only when there are some", () => {
    expect(formatMoney(82.5)).toBe("$82.50");
    expect(formatMoney(0.1 + 0.2)).toBe("$0.30");
    expect(formatMoney(159.999999)).toBe("$160");
  });

  it("puts a minus sign before the dollar sign", () => {
    expect(formatMoney(-5)).toBe("-$5");
  });
});

describe("fundedPercent", () => {
  it("clamps to 0–100", () => {
    expect(fundedPercent({ raisedAmount: 320, targetAmount: 800 })).toBe(40);
    expect(fundedPercent({ raisedAmount: 900, targetAmount: 800 })).toBe(100);
    expect(fundedPercent({ raisedAmount: 0, targetAmount: 800 })).toBe(0);
  });

  it("treats a $0 goal as funded instead of dividing by zero", () => {
    expect(fundedPercent({ raisedAmount: 0, targetAmount: 0 })).toBe(100);
  });
});

describe("amountToGo", () => {
  it("is what's left of the goal, never negative", () => {
    expect(amountToGo({ raisedAmount: 320, targetAmount: 800 })).toBe(480);
    expect(amountToGo({ raisedAmount: 900, targetAmount: 800 })).toBe(0);
  });
});

describe("shareState", () => {
  it("is none for a $0 share, even if something was paid", () => {
    expect(shareState(view({ myShare: 0 }))).toBe("none");
    expect(shareState(view({ myShare: 0, myPaid: 20 }))).toBe("none");
  });

  it("tells unpaid, partial and paid apart", () => {
    expect(shareState(view({ myPaid: 0 }))).toBe("unpaid");
    expect(shareState(view({ myPaid: 40 }))).toBe("partial");
    expect(shareState(view({ myPaid: 80 }))).toBe("paid");
    expect(shareState(view({ myPaid: 120 }))).toBe("paid");
  });
});

describe("paidUpSummary", () => {
  it("counts only pools where the viewer has a share", () => {
    const summary = paidUpSummary([
      view({ id: "paid", myPaid: 80 }),
      view({ id: "partial", myPaid: 40 }),
      view({ id: "unpaid" }),
      view({ id: "groom", myShare: 0 }),
    ]);
    expect(summary.counted.map((v) => v.id)).toEqual(["paid", "partial", "unpaid"]);
    expect(summary.paid).toBe(1);
    expect(summary.total).toBe(3);
    expect(summary.outstanding).toBe(120);
  });

  it("is 0 of 0 when the viewer has no shares", () => {
    expect(paidUpSummary([view({ myShare: 0 })])).toMatchObject({ paid: 0, total: 0, outstanding: 0 });
    expect(paidUpSummary([])).toMatchObject({ paid: 0, total: 0, outstanding: 0 });
  });
});

describe("formatDueDate", () => {
  it("formats the calendar date as written", () => {
    expect(formatDueDate("2027-03-01")).toBe("Mar 1");
    expect(formatDueDate("2027-03-01", "long")).toBe("Mon, Mar 1, 2027");
  });
});
