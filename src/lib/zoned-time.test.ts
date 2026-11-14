import { describe, expect, it } from "vitest";
import {
  dateInZone,
  formatCalendarDate,
  formatUtcOffset,
  formatWallClock,
  hasUtcOffset,
  parseWallTime,
  stripUtcOffset,
  toInstant,
  utcOffsetMinutes,
  wallDate,
  zonedWallTimeToIso,
} from "./zoned-time";

describe("parseWallTime / offsets", () => {
  it("reads the wall clock and ignores the offset", () => {
    expect(parseWallTime("2027-04-08T09:05:00-04:00")).toEqual({
      year: 2027, month: 4, day: 8, hour: 9, minute: 5, second: 0,
    });
    expect(parseWallTime("2027-04-08 21:45")).toMatchObject({ hour: 21, minute: 45 });
    expect(parseWallTime("nope")).toBeNull();
  });

  it("detects and strips offsets", () => {
    expect(hasUtcOffset("2027-04-08T09:00:00-04:00")).toBe(true);
    expect(hasUtcOffset("2027-04-08T09:00:00Z")).toBe(true);
    expect(hasUtcOffset("2027-04-08T09:00:00+0530")).toBe(true);
    expect(hasUtcOffset("2027-04-08T09:00:00")).toBe(false);
    expect(stripUtcOffset("2027-04-08T09:00:00+00:00")).toBe("2027-04-08T09:00:00");
  });

  it("formats offsets", () => {
    expect(formatUtcOffset(-240)).toBe("-04:00");
    expect(formatUtcOffset(330)).toBe("+05:30");
    expect(formatUtcOffset(0)).toBe("+00:00");
  });
});

describe("zone math", () => {
  it("knows Arizona never observes DST", () => {
    expect(utcOffsetMinutes(Date.UTC(2027, 0, 15), "America/Phoenix")).toBe(-420);
    expect(utcOffsetMinutes(Date.UTC(2027, 6, 15), "America/Phoenix")).toBe(-420);
  });

  it("attaches the airport's offset to a wall time", () => {
    // April: New York on EDT, Chicago on CDT, LA on PDT, Phoenix on MST.
    expect(zonedWallTimeToIso("2027-04-08T09:00", "America/New_York")).toBe("2027-04-08T09:00:00-04:00");
    expect(zonedWallTimeToIso("2027-04-08T09:00", "America/Chicago")).toBe("2027-04-08T09:00:00-05:00");
    expect(zonedWallTimeToIso("2027-04-08T09:00", "America/Los_Angeles")).toBe("2027-04-08T09:00:00-07:00");
    expect(zonedWallTimeToIso("2027-04-08T09:00", "America/Phoenix")).toBe("2027-04-08T09:00:00-07:00");
    // January: New York on EST.
    expect(zonedWallTimeToIso("2027-01-08T09:00", "America/New_York")).toBe("2027-01-08T09:00:00-05:00");
  });

  it("reads offset-less strings in the fallback zone, not the viewer's", () => {
    expect(toInstant("2027-04-08T14:00:00", "America/Phoenix").toISOString()).toBe("2027-04-08T21:00:00.000Z");
    expect(toInstant("2027-04-08T09:00:00-04:00", "America/Phoenix").toISOString()).toBe("2027-04-08T13:00:00.000Z");
  });

  it("gives the calendar date in a zone", () => {
    // 11 PM Arizona on Apr 9 is already Apr 10 in UTC.
    const lateEvening = new Date("2027-04-09T23:00:00-07:00");
    expect(dateInZone(lateEvening, "America/Phoenix")).toBe("2027-04-09");
    expect(dateInZone(lateEvening, "UTC")).toBe("2027-04-10");
  });
});

describe("display", () => {
  it("shows the airport's local time as written", () => {
    expect(formatWallClock("2027-04-08T09:00:00-04:00")).toBe("9:00 AM");
    expect(formatWallClock("2027-04-08T00:15:00-07:00")).toBe("12:15 AM");
    expect(formatWallClock("2027-04-08T12:30:00-07:00")).toBe("12:30 PM");
    expect(formatWallClock("2027-04-08T21:45:00-04:00")).toBe("9:45 PM");
    expect(wallDate("2027-04-08T21:45:00-04:00")).toBe("2027-04-08");
  });

  it("formats calendar dates without shifting the day", () => {
    expect(formatCalendarDate("2027-04-08", { weekday: "long", month: "short", day: "numeric" }))
      .toBe("Thursday, Apr 8");
  });
});
