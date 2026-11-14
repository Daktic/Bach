import { describe, expect, it } from "vitest";
import { getDayStatus, getTodayString, isBeforeTrip, isTripOver, parseMockDate } from "./time";
import { DEPARTURE_DATE } from "./config";

describe("trip time is Arizona time", () => {
  it("departs at midnight Arizona for every viewer", () => {
    expect(DEPARTURE_DATE.toISOString()).toBe("2027-04-08T07:00:00.000Z");
  });

  it("parses ?mockDate as Arizona time", () => {
    expect(parseMockDate("2027-04-10")?.toISOString()).toBe("2027-04-10T19:00:00.000Z");
    expect(parseMockDate("2027-04-08T14:00")?.toISOString()).toBe("2027-04-08T21:00:00.000Z");
    expect(parseMockDate("garbage")).toBeNull();
    expect(parseMockDate(null)).toBeNull();
  });

  it("rolls the day over at Arizona midnight, not UTC midnight", () => {
    const lateFriday = new Date("2027-04-09T23:30:00-07:00"); // already Saturday in UTC
    expect(getTodayString(lateFriday)).toBe("2027-04-09");
    expect(getDayStatus("2027-04-09", lateFriday)).toBe("current");
    expect(getDayStatus("2027-04-08", lateFriday)).toBe("past");
    expect(getDayStatus("2027-04-10", lateFriday)).toBe("future");
  });

  it("knows when the trip starts and ends", () => {
    expect(isBeforeTrip(new Date("2027-04-07T23:59:00-07:00"))).toBe(true);
    expect(isBeforeTrip(new Date("2027-04-08T00:00:00-07:00"))).toBe(false);
    expect(isTripOver(new Date("2027-04-12T23:00:00-07:00"))).toBe(false);
    expect(isTripOver(new Date("2027-04-13T00:00:00-07:00"))).toBe(true);
  });
});
