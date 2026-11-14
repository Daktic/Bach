import { describe, expect, it } from "vitest";
import { AIRPORTS, airportTimeZone, findAirport } from "./airports";

describe("AIRPORTS", () => {
  it("has one entry per code, each with a real IANA zone", () => {
    const codes = AIRPORTS.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const airport of AIRPORTS) {
      expect(airport.code).toMatch(/^[A-Z]{3}$/);
      // Intl throws a RangeError for a zone it doesn't know.
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: airport.timeZone })).not.toThrow();
    }
  });

  it("knows the Arizona airports besides PHX, on Arizona time", () => {
    expect(findAirport("aza")).toMatchObject({ name: "Phoenix-Mesa Gateway", city: "Mesa" });
    expect(findAirport("TUS")).toMatchObject({ name: "Tucson Intl", city: "Tucson" });
    expect(airportTimeZone("AZA")).toBe("America/Phoenix");
    expect(airportTimeZone(" tus ")).toBe("America/Phoenix");
    expect(airportTimeZone("XNA")).toBeNull();
  });
});
