import { describe, expect, it } from "vitest";
import { arrivalDayOffset, formatDayOffset, formatDuration, formatFlightDate } from "./flight-format";

describe("formatDuration", () => {
  it("uses minutes under an hour", () => {
    expect(formatDuration(0)).toBe("0 min");
    expect(formatDuration(33)).toBe("33 min");
    expect(formatDuration(59.6)).toBe("1h");
  });

  it("uses hours and minutes from an hour up", () => {
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(105)).toBe("1h 45m");
    expect(formatDuration(-5)).toBe("0 min");
  });
});

describe("arrivalDayOffset", () => {
  it("is 0 for a same-day flight across time zones", () => {
    // 10 AM at JFK → 10:30 AM at PHX the same day.
    expect(arrivalDayOffset("2027-04-08T10:00:00-04:00", "2027-04-08T10:30:00-07:00")).toBe(0);
  });

  it("is 1 for a red-eye that lands the next local day", () => {
    expect(arrivalDayOffset("2027-04-07T23:30:00-07:00", "2027-04-08T05:10:00-04:00")).toBe(1);
    expect(arrivalDayOffset("2027-03-31T23:00:00-07:00", "2027-04-01T06:00:00-04:00")).toBe(1);
  });

  it("is -1 when an eastbound date-line crossing lands on the previous local date", () => {
    // 12:05 AM Apr 9 in Tokyo → 10:10 PM Apr 8 in Phoenix.
    expect(arrivalDayOffset("2027-04-09T00:05:00+09:00", "2027-04-08T22:10:00-07:00")).toBe(-1);
  });

  it("is 0 when a time can't be read", () => {
    expect(arrivalDayOffset("", "2027-04-08T10:30:00-07:00")).toBe(0);
  });
});

describe("formatDayOffset", () => {
  it("is empty for a same-day arrival", () => {
    expect(formatDayOffset(0)).toBe("");
  });

  it("signs later and earlier days", () => {
    expect(formatDayOffset(1)).toBe("+1");
    expect(formatDayOffset(2)).toBe("+2");
    expect(formatDayOffset(-1)).toBe("−1");
  });
});

describe("formatFlightDate", () => {
  it("formats the local calendar date without shifting it", () => {
    // 11:30 PM in LA is already Apr 9 in UTC, but the flight leaves on Apr 8.
    expect(formatFlightDate("2027-04-08T23:30:00-07:00")).toBe("Thu, Apr 8");
    expect(formatFlightDate("not a date")).toBe("");
  });
});
