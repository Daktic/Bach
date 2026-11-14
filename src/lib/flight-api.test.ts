import { describe, expect, it } from "vitest";
import { FLIGHT_LOOKUP_FIRST_DAY, FLIGHT_LOOKUP_LAST_DAY } from "./config";
import { isFlightLookupDate, isNoResultsError, normalizeSearchAirlines } from "./flight-api";

describe("normalizeSearchAirlines (FL-6)", () => {
  it("keeps offered codes, upper-cased, de-duplicated and sorted", () => {
    expect(normalizeSearchAirlines(["wn", " AA", "AA", "dl", "WN"])).toEqual(["AA", "DL", "WN"]);
  });

  it("makes repeated codes the same filter (one cache entry, one paid search)", () => {
    expect(normalizeSearchAirlines(Array(500).fill("AA"))).toEqual(["AA"]);
  });

  it("drops codes the form doesn't offer and anything that isn't a string", () => {
    expect(normalizeSearchAirlines(["ZZ", "HA", "B6", 42, null, { code: "AA" }])).toEqual(["B6"]);
    expect(normalizeSearchAirlines("AA")).toEqual([]);
    expect(normalizeSearchAirlines(undefined)).toEqual([]);
  });
});

describe("isNoResultsError", () => {
  it("recognises SerpAPI's empty-search message", () => {
    expect(isNoResultsError("Google Flights hasn't returned any results for this query.")).toBe(true);
    expect(isNoResultsError("Google hasn’t returned any results for this query.")).toBe(true);
  });

  it("treats every other error as a failure", () => {
    expect(isNoResultsError("Your account has run out of searches.")).toBe(false);
    expect(isNoResultsError("Invalid API key. Your API key should be here: https://serpapi.com/manage-api-key")).toBe(false);
    expect(isNoResultsError("")).toBe(false);
  });
});

describe("isFlightLookupDate (FL-1)", () => {
  it("spans a week either side of the trip", () => {
    expect(FLIGHT_LOOKUP_FIRST_DAY).toBe("2027-04-01");
    expect(FLIGHT_LOOKUP_LAST_DAY).toBe("2027-04-19");
  });

  it("accepts dates around the trip", () => {
    for (const ok of ["2027-04-01", "2027-04-08", "2027-04-12", "2027-04-19"]) {
      expect(isFlightLookupDate(ok)).toBe(true);
    }
  });

  it("rejects other dates and malformed input", () => {
    for (const bad of ["2027-03-31", "2027-04-20", "2026-11-13", "2027-4-8", "", null, undefined, 20270408]) {
      expect(isFlightLookupDate(bad)).toBe(false);
    }
  });
});
