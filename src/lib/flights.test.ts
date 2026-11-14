import { describe, expect, it } from "vitest";
import { enrichFlight, formatTime, sortFlights } from "./flights";
import type { FlightDirection, FlightLeg, GuestFlight } from "./types";

// Sample flights for these tests (the real list in data/flights.ts starts
// empty). At 2 PM Arizona on Apr 8: chris and andrew landed, gberg and avery
// in the air, brett boarding, jerid upcoming.
interface SampleFlight extends FlightLeg {
  id: string;
  guestId: string;
  direction: FlightDirection;
}

const sampleFlights: SampleFlight[] = [
  {
    id: "f1",
    guestId: "chris",
    direction: "in",
    flightNumber: "AA 1105",
    airline: "American",
    origin: "JFK",
    destination: "PHX",
    departsAt: "2027-04-08T10:00:00-04:00",
    arrivesAt: "2027-04-08T10:30:00-07:00",
  },
  {
    id: "f2",
    guestId: "andrew",
    direction: "in",
    flightNumber: "WN 4432",
    airline: "Southwest",
    origin: "MDW",
    destination: "PHX",
    departsAt: "2027-04-08T11:15:00-05:00",
    arrivesAt: "2027-04-08T11:50:00-07:00",
  },
  {
    id: "f3",
    guestId: "gberg",
    direction: "in",
    flightNumber: "AA 321",
    airline: "American",
    origin: "LAX",
    destination: "PHX",
    departsAt: "2027-04-08T13:30:00-07:00",
    arrivesAt: "2027-04-08T15:45:00-07:00",
  },
  {
    id: "f4",
    guestId: "avery",
    direction: "in",
    flightNumber: "DL 567",
    airline: "Delta",
    origin: "ATL",
    destination: "PHX",
    departsAt: "2027-04-08T15:30:00-04:00",
    arrivesAt: "2027-04-08T16:00:00-07:00",
  },
  {
    id: "f5",
    guestId: "brett",
    direction: "in",
    flightNumber: "UA 892",
    airline: "United",
    origin: "ORD",
    destination: "PHX",
    departsAt: "2027-04-08T16:25:00-05:00",
    arrivesAt: "2027-04-08T17:10:00-07:00",
  },
  {
    id: "f6",
    guestId: "jerid",
    direction: "in",
    flightNumber: "B6 214",
    airline: "JetBlue",
    origin: "BOS",
    destination: "PHX",
    departsAt: "2027-04-08T21:45:00-04:00",
    arrivesAt: "2027-04-08T22:30:00-07:00",
  },
];

const asGuestFlights = (): GuestFlight[] =>
  sampleFlights.map(({ direction: _d, ...f }) => ({ ...f, guestName: f.guestId }));

describe("flight status uses real instants", () => {
  const twoPmArizona = new Date("2027-04-08T14:00:00-07:00");

  it("matches the documented mock spread at 2 PM Arizona", () => {
    const byGuest = Object.fromEntries(
      asGuestFlights().map((f) => [f.guestId, enrichFlight(f, twoPmArizona).status]),
    );
    expect(byGuest).toEqual({
      chris: "landed",
      andrew: "landed",
      gberg: "in_air",
      avery: "in_air",
      brett: "boarding",
      jerid: "upcoming",
    });
  });

  it("computes progress across time zones", () => {
    const garrett = asGuestFlights().find((f) => f.guestId === "gberg")!;
    const enriched = enrichFlight(garrett, twoPmArizona);
    expect(enriched.progressFraction).toBeCloseTo(30 / 135, 5);
    expect(enriched.minutesUntilArrival).toBe(105);
  });

  it("sorts in the air, boarding, upcoming, landed", () => {
    const sorted = sortFlights(asGuestFlights().map((f) => enrichFlight(f, twoPmArizona)));
    expect(sorted.map((f) => f.status)).toEqual([
      "in_air", "in_air", "boarding", "upcoming", "landed", "landed",
    ]);
  });

  it("displays departure in the origin's local time", () => {
    const chris = asGuestFlights().find((f) => f.guestId === "chris")!;
    expect(formatTime(chris.departsAt)).toBe("10:00 AM"); // JFK, EDT
    expect(formatTime(chris.arrivesAt)).toBe("10:30 AM"); // PHX, MST
  });
});
