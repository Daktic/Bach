import { TRIP_TIME_ZONE } from "./config";
import { getCurrentDate } from "./time";
import type { FlightLeg, FlightStatus, GuestFlight, GuestFlightWithStatus } from "./types";
import { formatWallClock, toInstant } from "./zoned-time";

// Flight times carry the airport's UTC offset (see FlightLeg in types.ts).
// Strings without one are legacy data; they're read as Arizona time rather
// than in the viewer's zone so nobody's phone shifts them.
export function flightInstant(iso: string): Date {
  return toInstant(iso, TRIP_TIME_ZONE);
}

export function computeFlightStatus(
  departsAt: Date,
  arrivesAt: Date,
  now: Date,
): FlightStatus {
  if (now >= arrivesAt) return "landed";
  if (now >= departsAt) return "in_air";
  // boarding window: 45 min before departure
  if (now >= new Date(departsAt.getTime() - 45 * 60 * 1000)) return "boarding";
  return "upcoming";
}

/** Legs in departure order (a trip's legs can be entered in any order). */
export function sortLegs<L extends FlightLeg>(legs: readonly L[]): L[] {
  return [...legs].sort((a, b) => flightInstant(a.departsAt).getTime() - flightInstant(b.departsAt).getTime());
}

/**
 * A trip for the board from its legs: the last leg's fields on top, and the
 * full list when there's more than one. Null when there are no legs.
 */
export function tripFromLegs(
  legs: readonly FlightLeg[],
  who: { id: string; guestId: string; guestName: string },
): GuestFlight | null {
  const ordered = sortLegs(legs);
  const last = ordered.at(-1);
  if (!last) return null;
  return { ...last, ...who, ...(ordered.length > 1 ? { legs: ordered } : {}) };
}

export function enrichFlight(flight: GuestFlight, now: Date = getCurrentDate()): GuestFlightWithStatus {
  const { legs: _legs, ...lastLeg } = flight;
  const legs: FlightLeg[] = flight.legs && flight.legs.length > 0 ? sortLegs(flight.legs) : [lastLeg];
  const final = legs[legs.length - 1];

  // The first leg that hasn't landed yet; once everything has, the last one.
  const found = legs.findIndex((l) => now < flightInstant(l.arrivesAt));
  const legIndex = found === -1 ? legs.length - 1 : found;
  const leg = legs[legIndex];

  const departsAt = flightInstant(leg.departsAt);
  const arrivesAt = flightInstant(leg.arrivesAt);
  let status = computeFlightStatus(departsAt, arrivesAt, now);
  const layoverAt = status === "upcoming" && legIndex > 0 ? legs[legIndex - 1].destination : undefined;
  if (layoverAt) status = "layover";

  const totalMs = arrivesAt.getTime() - departsAt.getTime();
  const elapsedMs = now.getTime() - departsAt.getTime();
  const progressFraction = totalMs > 0 ? Math.max(0, Math.min(1, elapsedMs / totalMs)) : status === "landed" ? 1 : 0;

  const minutesUntilArrival = Math.round(
    (arrivesAt.getTime() - now.getTime()) / 60_000,
  );

  return {
    ...flight,
    ...leg,
    status,
    progressFraction,
    minutesUntilArrival,
    legIndex,
    legCount: legs.length,
    finalDestination: final.destination,
    finalArrivesAt: final.arrivesAt,
    ...(layoverAt ? { layoverAt } : {}),
  };
}

/**
 * "9:05 AM" in the airport's local time, exactly as the flight data gives it.
 * Never converted to the viewer's time zone.
 */
export function formatTime(iso: string): string {
  return formatWallClock(iso);
}

const STATUS_ORDER: Record<FlightStatus, number> = {
  in_air: 0,
  layover: 1,
  boarding: 2,
  upcoming: 3,
  delayed: 4,
  landed: 5,
};

export function sortFlights(flights: GuestFlightWithStatus[]): GuestFlightWithStatus[] {
  return [...flights].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return flightInstant(a.finalArrivesAt).getTime() - flightInstant(b.finalArrivesAt).getTime();
  });
}
