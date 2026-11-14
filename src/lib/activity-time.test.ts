import { describe, expect, it } from "vitest";
import {
  activityTimeMinutes,
  compareActivityTimes,
  formatActivityDate,
  formatActivityTime,
  formatActivityTimeRange,
} from "./activity-time";

describe("activityTimeMinutes", () => {
  it("reads padded and unpadded hours", () => {
    expect(activityTimeMinutes("00:00")).toBe(0);
    expect(activityTimeMinutes("09:30")).toBe(570);
    expect(activityTimeMinutes("9:30")).toBe(570);
    expect(activityTimeMinutes(" 14:00 ")).toBe(840);
    expect(activityTimeMinutes("23:59")).toBe(1439);
  });

  it("returns null for missing or invalid times", () => {
    expect(activityTimeMinutes(undefined)).toBeNull();
    expect(activityTimeMinutes("")).toBeNull();
    expect(activityTimeMinutes("24:00")).toBeNull();
    expect(activityTimeMinutes("19:60")).toBeNull();
    expect(activityTimeMinutes("7pm")).toBeNull();
  });
});

describe("compareActivityTimes (TL-1: activities in time order)", () => {
  const sortTitles = (items: { title: string; startTime?: string; endTime?: string }[]) =>
    [...items].sort(compareActivityTimes).map((a) => a.title);

  it("sorts by clock time, not by string", () => {
    expect(
      sortTitles([
        { title: "golf", startTime: "14:00" },
        { title: "breakfast", startTime: "9:30" },
        { title: "dinner", startTime: "19:00" },
      ]),
    ).toEqual(["breakfast", "golf", "dinner"]);
  });

  it("places an end-time-only activity at its end time and untimed ones last", () => {
    expect(
      sortTitles([
        { title: "untimed" },
        { title: "dinner", startTime: "19:00" },
        { title: "checkout", endTime: "10:00" },
        { title: "breakfast", startTime: "08:00" },
        { title: "bad", startTime: "late" },
      ]),
    ).toEqual(["breakfast", "checkout", "dinner", "untimed", "bad"]);
  });

  it("keeps the data's order for ties", () => {
    expect(
      sortTitles([
        { title: "a", startTime: "19:00" },
        { title: "b", startTime: "19:00" },
        { title: "c" },
        { title: "d" },
      ]),
    ).toEqual(["a", "b", "c", "d"]);
  });
});

describe("formatActivityTime", () => {
  it("formats Arizona wall times as 12-hour clock times", () => {
    expect(formatActivityTime("19:00")).toBe("7:00 PM");
    expect(formatActivityTime("21:30")).toBe("9:30 PM");
    expect(formatActivityTime("09:05")).toBe("9:05 AM");
    expect(formatActivityTime("9:05")).toBe("9:05 AM");
    expect(formatActivityTime(" 15:00 ")).toBe("3:00 PM");
  });

  it("handles midnight and noon", () => {
    expect(formatActivityTime("00:00")).toBe("12:00 AM");
    expect(formatActivityTime("00:15")).toBe("12:15 AM");
    expect(formatActivityTime("12:00")).toBe("12:00 PM");
    expect(formatActivityTime("23:59")).toBe("11:59 PM");
  });

  it("returns an empty string for missing or invalid times", () => {
    expect(formatActivityTime(undefined)).toBe("");
    expect(formatActivityTime("")).toBe("");
    expect(formatActivityTime("24:00")).toBe("");
    expect(formatActivityTime("19:60")).toBe("");
    expect(formatActivityTime("7pm")).toBe("");
    expect(formatActivityTime("2027-04-10T19:00")).toBe("");
  });
});

describe("formatActivityTimeRange", () => {
  it("shows start – end when both are set", () => {
    expect(formatActivityTimeRange("19:00", "21:30")).toBe("7:00 PM – 9:30 PM");
    expect(formatActivityTimeRange("11:00", "13:00")).toBe("11:00 AM – 1:00 PM");
  });

  it("keeps a range that runs past midnight as written", () => {
    expect(formatActivityTimeRange("21:00", "01:30")).toBe("9:00 PM – 1:30 AM");
  });

  it("falls back to whichever end exists", () => {
    expect(formatActivityTimeRange("19:00")).toBe("7:00 PM");
    expect(formatActivityTimeRange("19:00", "nonsense")).toBe("7:00 PM");
    expect(formatActivityTimeRange("19:00", "19:00")).toBe("7:00 PM");
    expect(formatActivityTimeRange(undefined, "21:30")).toBe("Until 9:30 PM");
    expect(formatActivityTimeRange()).toBe("");
  });
});

describe("formatActivityDate", () => {
  it("formats the calendar day without shifting it", () => {
    expect(formatActivityDate("2027-04-08")).toBe("Thursday, April 8");
    expect(formatActivityDate("2027-04-10")).toBe("Saturday, April 10");
    expect(formatActivityDate("2027-04-12")).toBe("Monday, April 12");
  });
});
