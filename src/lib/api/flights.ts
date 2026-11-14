"use server";

import { guests } from "~/lib/data/guests";
import { seedFlights } from "~/lib/data/flights";
import { getDb } from "~/lib/server/db";
import { requireGuest } from "~/lib/server/session";
import { allFlights, allProfiles, allTravelPlans } from "~/lib/server/store";
import type { FlightBoard, GuestFlight } from "~/lib/types";

/**
 * Everyone's inbound flight, plus who has none and who's driving (FL-3, FL-5,
 * FL-9). Guests' own entries come from the database; any flight the organiser
 * adds in src/lib/data/flights.ts is used when a guest hasn't entered one.
 * Status is computed on the client so `?mockDate` works in dev.
 */
export async function getFlightBoard(): Promise<FlightBoard> {
  await requireGuest();
  const db = getDb();
  const [entered, plans, profiles] = await Promise.all([allFlights(db), allTravelPlans(db), allProfiles(db)]);

  const nameOf = (id: string) => profiles.get(id)?.name ?? guests.find((g) => g.id === id)?.name ?? id;
  const driving = (id: string) =>
    plans.get(id)?.driving === true || (!plans.has(id) && guests.find((g) => g.id === id)?.arrivesBy === "drive");

  const inbound = new Map<string, GuestFlight>();
  for (const f of seedFlights) {
    if (f.direction !== "in") continue;
    const { direction: _d, ...leg } = f;
    inbound.set(f.guestId, { ...leg, guestName: nameOf(f.guestId) });
  }
  for (const f of entered) {
    if (f.direction !== "in") continue;
    inbound.set(f.guestId, { ...f.leg, id: `${f.guestId}-in`, guestId: f.guestId, guestName: nameOf(f.guestId) });
  }

  const onRoster = new Set(guests.map((g) => g.id));
  // Driving wins over a saved flight (the flight is kept in case they switch back).
  const flights = [...inbound.values()].filter((f) => onRoster.has(f.guestId) && !driving(f.guestId));
  const withFlight = new Set(flights.map((f) => f.guestId));
  const rest = guests.filter((g) => !withFlight.has(g.id));

  return {
    flights,
    driving: rest.filter((g) => driving(g.id)).map((g) => ({ id: g.id, guestName: nameOf(g.id) })),
    noFlight: rest.filter((g) => !driving(g.id)).map((g) => ({ id: g.id, guestName: nameOf(g.id) })),
  };
}
