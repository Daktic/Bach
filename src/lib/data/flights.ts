import "server-only";
import type { FlightDirection, FlightLeg } from "~/lib/types";

// Flights the organiser knows about, until guests' own entries are stored
// server-side (FL-2). Nobody has booked yet, so it's empty: each guest adds
// their flight on /me (saved on their phone for now).
//
// To add one by hand: times are each airport's local wall time with its UTC
// offset, e.g. departsAt "2027-04-08T10:00:00-04:00" (JFK, EDT) and arrivesAt
// "2027-04-08T10:30:00-07:00" (PHX; Arizona doesn't observe DST).
//   { id: "chris-in", guestId: "chris", direction: "in", flightNumber: "AA 123",
//     airline: "American", origin: "JFK", destination: "PHX", departsAt, arrivesAt }

export interface SeedFlight extends FlightLeg {
  id: string;
  guestId: string;
  direction: FlightDirection;
}

export const seedFlights: SeedFlight[] = [];
