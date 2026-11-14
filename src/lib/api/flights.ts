"use server";

import { guests } from "~/lib/data/guests";
import { seedFlights } from "~/lib/data/flights";
import { requireGuest } from "~/lib/server/session";
import type { FlightBoard, GuestFlight } from "~/lib/types";

/**
 * Everyone's inbound flight, plus who has none and who's driving (FL-3, FL-5,
 * FL-9). Status is computed on the client so `?mockDate` works in dev.
 */
export async function getFlightBoard(): Promise<FlightBoard> {
  await requireGuest();

  const nameOf = new Map(guests.map((g) => [g.id, g.name]));
  const flights: GuestFlight[] = seedFlights
    .filter((f) => f.direction === "in" && nameOf.has(f.guestId))
    .map(({ direction: _direction, ...f }) => ({ ...f, guestName: nameOf.get(f.guestId)! }));

  const withFlight = new Set(flights.map((f) => f.guestId));
  const withoutFlight = guests.filter((g) => !withFlight.has(g.id));

  return {
    flights,
    driving: withoutFlight
      .filter((g) => g.arrivesBy === "drive")
      .map((g) => ({ id: g.id, guestName: g.name })),
    noFlight: withoutFlight
      .filter((g) => g.arrivesBy !== "drive")
      .map((g) => ({ id: g.id, guestName: g.name })),
  };
}
