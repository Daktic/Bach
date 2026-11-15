import { describe, expect, it } from "vitest";
import type { FlightLeg } from "~/lib/types";
import {
  airlineFromFlightNumber,
  arrivalDayOffset,
  emptyManualInput,
  ENTRY_TIME_ZONES,
  legDateLabel,
  manualInputFromLeg,
  needsZonePick,
  normalizeFlightNumber,
  offRouteAirport,
  sameLeg,
  sameTravel,
  tripProblems,
  timeZoneOptions,
  toFlightLeg,
  validateManualLeg,
  type ManualLegInput,
} from "./flight-entry";

const jfkToPhx: ManualLegInput = {
  airline: "",
  flightNumber: "aa1105",
  origin: "jfk",
  destination: "PHX",
  originZone: "",
  destinationZone: "",
  departDate: "2027-04-08",
  departTime: "10:00",
  arriveDate: "2027-04-08",
  arriveTime: "12:30",
};

const errorsFor = (input: ManualLegInput) => {
  const result = validateManualLeg(input);
  return result.ok ? {} : result.errors;
};

describe("flight numbers", () => {
  it("normalizes common spellings", () => {
    expect(normalizeFlightNumber("aa1105")).toBe("AA 1105");
    expect(normalizeFlightNumber("  b6   214 ")).toBe("B6 214");
    expect(normalizeFlightNumber("9E3300")).toBe("9E 3300");
    expect(normalizeFlightNumber("AAL123")).toBe("AAL 123");
    expect(normalizeFlightNumber("dl 567a")).toBe("DL 567A");
    expect(normalizeFlightNumber("1105")).toBe("1105");
  });

  it("rejects things that aren't flight numbers", () => {
    expect(normalizeFlightNumber("")).toBeNull();
    expect(normalizeFlightNumber("hello")).toBeNull();
    expect(normalizeFlightNumber("AA")).toBeNull();
    expect(normalizeFlightNumber("AA12345")).toBeNull();
  });

  it("knows common US carriers", () => {
    expect(airlineFromFlightNumber("AA 1105")).toBe("American");
    expect(airlineFromFlightNumber("wn4432")).toBe("Southwest");
    expect(airlineFromFlightNumber("XX 1")).toBeNull();
    expect(airlineFromFlightNumber("1105")).toBeNull();
  });
});

describe("validateManualLeg", () => {
  it("builds offset-aware times from each airport's local time", () => {
    expect(validateManualLeg(jfkToPhx)).toEqual({
      ok: true,
      leg: {
        flightNumber: "AA 1105",
        airline: "American", // filled in from the flight number
        origin: "JFK",
        destination: "PHX",
        departsAt: "2027-04-08T10:00:00-04:00",
        arrivesAt: "2027-04-08T12:30:00-07:00",
      },
    });
  });

  it("compares real instants, not wall clocks, across time zones", () => {
    // 10:00 at JFK (14:00 UTC) → 7:30 at PHX (14:30 UTC) is a valid 30-minute hop.
    expect(validateManualLeg({ ...jfkToPhx, arriveTime: "07:30" }).ok).toBe(true);
    // 6:30 at PHX (13:30 UTC) lands before it took off.
    expect(errorsFor({ ...jfkToPhx, arriveTime: "06:30" }).arriveTime).toMatch(/after departure/);
  });

  it("catches date typos that make a flight over 24 hours", () => {
    expect(errorsFor({ ...jfkToPhx, arriveDate: "2027-04-09" }).arriveDate).toMatch(/24 hours/);
  });

  it("needs a time zone for airports it doesn't know", () => {
    const xna = { ...jfkToPhx, origin: "XNA" };
    expect(needsZonePick("xna")).toBe(true);
    expect(needsZonePick("JFK")).toBe(false);
    expect(needsZonePick("XN")).toBe(false);
    expect(errorsFor(xna).originZone).toMatch(/XNA/);

    const result = validateManualLeg({ ...xna, originZone: "America/Chicago" });
    expect(result.ok && result.leg.departsAt).toBe("2027-04-08T10:00:00-05:00");
    // Only zones from the list are accepted.
    expect(errorsFor({ ...xna, originZone: "Mars/Olympus" }).originZone).toBeDefined();
  });

  it("validates airport codes", () => {
    expect(errorsFor({ ...jfkToPhx, origin: "LA" }).origin).toBeDefined();
    expect(errorsFor({ ...jfkToPhx, origin: "L4X" }).origin).toBeDefined();
    expect(errorsFor({ ...jfkToPhx, destination: "" }).destination).toBeDefined();
    expect(errorsFor({ ...jfkToPhx, origin: "PHX" }).destination).toMatch(/differ/);
  });

  it("requires the basics", () => {
    const errors = errorsFor({
      ...jfkToPhx,
      flightNumber: "",
      departDate: "2027-02-30",
      departTime: "",
      arriveTime: "25:00",
    });
    expect(Object.keys(errors).sort()).toEqual(
      ["airline", "arriveTime", "departDate", "departTime", "flightNumber"].sort(),
    );
    expect(errorsFor({ ...jfkToPhx, flightNumber: "hello" }).flightNumber).toMatch(/like AA 1105/);
  });

  it("asks for the airline when the carrier isn't known", () => {
    expect(errorsFor({ ...jfkToPhx, flightNumber: "XX 123" }).airline).toBeDefined();
    expect(validateManualLeg({ ...jfkToPhx, flightNumber: "XX 123", airline: " Contour " })).toMatchObject({
      ok: true,
      leg: { airline: "Contour", flightNumber: "XX 123" },
    });
  });
});

describe("pre-filling from a saved leg", () => {
  const leg: FlightLeg = {
    flightNumber: "AA 1105",
    airline: "American",
    origin: "JFK",
    destination: "PHX",
    departsAt: "2027-04-08T10:00:00-04:00",
    arrivesAt: "2027-04-08T10:30:00-07:00",
  };

  it("round-trips through the form", () => {
    const input = manualInputFromLeg(leg);
    expect(input).toMatchObject({ departDate: "2027-04-08", departTime: "10:00", arriveTime: "10:30" });
    expect(validateManualLeg(input)).toEqual({ ok: true, leg });
  });

  it("guesses the zone of an unlisted airport from its offset", () => {
    const xna = { ...leg, origin: "XNA", departsAt: "2027-04-08T09:00:00-05:00" };
    expect(manualInputFromLeg(xna).originZone).toBe("America/Chicago");
    expect(manualInputFromLeg(leg).originZone).toBe(""); // JFK is listed
  });

  it("starts blank forms at PHX", () => {
    expect(emptyManualInput("in", "2027-04-08")).toMatchObject({ origin: "", destination: "PHX" });
    expect(emptyManualInput("out", "2027-04-12")).toMatchObject({ origin: "PHX", destination: "" });
  });
});

describe("time zones for airports we don't know", () => {
  // Looked up with the origin's own zone (Europe/London is UTC+1 in April).
  const fromLondon: FlightLeg = {
    flightNumber: "XX 289",
    airline: "Test Air",
    origin: "LHR",
    destination: "PHX",
    departsAt: "2027-04-08T14:00:00+01:00",
    arrivesAt: "2027-04-08T17:05:00-07:00",
  };

  it("keeps a looked-up leg's time when it's re-saved from the form", () => {
    const input = manualInputFromLeg(fromLondon);
    expect(input.originZone).toBe("Europe/London");
    expect(validateManualLeg(input)).toEqual({ ok: true, leg: fromLondon });
  });

  it("falls back to the leg's own offset when no listed zone matches", () => {
    const fromTokyo = { ...fromLondon, origin: "NRT", departsAt: "2027-04-08T17:00:00+09:00", arrivesAt: "2027-04-08T11:00:00-07:00" };
    const input = manualInputFromLeg(fromTokyo);
    expect(input.originZone).toBe("+09:00");
    expect(validateManualLeg(input)).toEqual({ ok: true, leg: fromTokyo });
    // A different time keeps that offset too.
    const later = validateManualLeg({ ...input, departTime: "18:30", arriveTime: "12:30" });
    expect(later.ok && later.leg.departsAt).toBe("2027-04-08T18:30:00+09:00");

    const fromAccra = { ...fromLondon, origin: "ACC", departsAt: "2027-04-08T10:00:00Z" };
    expect(manualInputFromLeg(fromAccra).originZone).toBe("+00:00");
  });

  it("offers a kept offset in the picker, ahead of the listed zones", () => {
    expect(timeZoneOptions()).toEqual([...ENTRY_TIME_ZONES]);
    expect(timeZoneOptions("America/Chicago")).toEqual([...ENTRY_TIME_ZONES]);
    expect(timeZoneOptions("+09:00")[0]).toEqual({ id: "+09:00", label: "UTC+09:00 (as saved)" });
    expect(timeZoneOptions("-03:00")[0]).toEqual({ id: "-03:00", label: "UTC−03:00 (as saved)" });
    expect(timeZoneOptions("-03:00")).toHaveLength(ENTRY_TIME_ZONES.length + 1);
  });

  it("lists zones that skip DST, so a Cancún departure isn't an hour out", () => {
    const fromCancun = { ...jfkToPhx, origin: "CUN", originZone: "America/Cancun" };
    const result = validateManualLeg(fromCancun);
    expect(result.ok && result.leg.departsAt).toBe("2027-04-08T10:00:00-05:00");
    const fromGuadalajara = validateManualLeg({ ...fromCancun, origin: "GDL", originZone: "America/Mexico_City" });
    expect(fromGuadalajara.ok && fromGuadalajara.leg.departsAt).toBe("2027-04-08T10:00:00-06:00");
  });

  it("rejects offsets that can't exist", () => {
    const xna = { ...jfkToPhx, origin: "XNA" };
    expect(errorsFor({ ...xna, originZone: "+25:00" }).originZone).toBeDefined();
    expect(errorsFor({ ...xna, originZone: "+05:75" }).originZone).toBeDefined();
    expect(errorsFor({ ...xna, originZone: "0500" }).originZone).toBeDefined();
    const halfHour = validateManualLeg({ ...xna, originZone: "-03:30" });
    expect(halfHour.ok && halfHour.leg.departsAt).toBe("2027-04-08T10:00:00-03:30");
  });
});

describe("leg helpers", () => {
  const leg: FlightLeg = {
    flightNumber: "AA 2",
    airline: "American",
    origin: "LAX",
    destination: "JFK",
    departsAt: "2027-04-07T23:00:00-07:00",
    arrivesAt: "2027-04-08T07:20:00-04:00",
  };

  it("labels dates and red-eyes from the wall time", () => {
    expect(legDateLabel(leg)).toBe("Wed, Apr 7");
    expect(arrivalDayOffset(leg)).toBe(1);
    expect(arrivalDayOffset({ ...leg, arrivesAt: "2027-04-07T23:59:00-04:00" })).toBe(0);
  });

  it("flags legs that miss PHX", () => {
    expect(offRouteAirport("in", leg)).toBe("JFK");
    expect(offRouteAirport("in", { ...leg, destination: "PHX" })).toBeNull();
    expect(offRouteAirport("out", { ...leg, origin: "PHX" })).toBeNull();
  });

  it("compares legs and travel by value", () => {
    const tracker = { ...leg, id: "f1", guestId: "gberg", guestName: "Garrett" };
    expect(toFlightLeg(tracker)).toEqual(leg);
    expect(sameLeg(leg, { ...leg })).toBe(true);
    expect(sameLeg(leg, { ...leg, arrivesAt: "2027-04-08T07:25:00-04:00" })).toBe(false);
    expect(sameLeg(null, null)).toBe(true);
    expect(sameLeg(leg, null)).toBe(false);
    expect(sameTravel({ inbound: [leg], outbound: [], driving: false }, { inbound: [{ ...leg }], outbound: [], driving: false })).toBe(true);
    expect(sameTravel({ inbound: [], outbound: [], driving: true }, { inbound: [], outbound: [], driving: false })).toBe(false);
    expect(sameTravel({ inbound: [leg], outbound: [], driving: false }, { inbound: [leg, leg], outbound: [], driving: false })).toBe(false);
  });

  it("points out gaps between connections and trips that miss PHX", () => {
    const toDen = { ...leg, flightNumber: "UA 1", origin: "EWR", destination: "DEN" };
    const toPhx = { ...leg, flightNumber: "UA 2", origin: "DEN", destination: "PHX" };
    expect(tripProblems("in", [toDen, toPhx])).toEqual([]);
    expect(tripProblems("in", [toDen])).toEqual(["Your last flight lands at DEN. Add your connection to PHX."]);
    expect(tripProblems("in", [toDen, { ...toPhx, origin: "ORD" }])).toEqual([
      "UA 1 lands at DEN, but UA 2 leaves from ORD.",
    ]);
    expect(tripProblems("out", [{ ...leg, origin: "PHX", destination: "DEN" }])).toEqual([]);
    expect(tripProblems("out", [toDen])).toHaveLength(1);
  });
});
