import { describe, expect, it } from "vitest";
import { enrichFlight, formatTime, sortFlights } from "./flights";
import { seedFlights } from "./data/flights";
import type { GuestFlight } from "./types";

const asGuestFlights = (): GuestFlight[] =>
  seedFlights.map(({ direction: _d, ...f }) => ({ ...f, guestName: f.guestId }));

describe("flight status uses real instants", () => {
  const twoPmArizona = new Date("2027-04-08T14:00:00-07:00");

  it("matches the documented mock spread at 2 PM Arizona", () => {
    const byGuest = Object.fromEntries(
      asGuestFlights().map((f) => [f.guestId, enrichFlight(f, twoPmArizona).status]),
    );
    expect(byGuest).toEqual({
      chris: "landed",
      sarah: "landed",
      gberg: "in_air",
      jake: "in_air",
      mike: "boarding",
      ryan: "upcoming",
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
