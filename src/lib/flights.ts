import { TRIP_TIME_ZONE } from "./config";
import { getCurrentDate } from "./time";
import type { FlightStatus, GuestFlight, GuestFlightWithStatus } from "./types";
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

export function enrichFlight(flight: GuestFlight, now: Date = getCurrentDate()): GuestFlightWithStatus {
  const departsAt = flightInstant(flight.departsAt);
  const arrivesAt = flightInstant(flight.arrivesAt);
  const status = computeFlightStatus(departsAt, arrivesAt, now);

  const totalMs = arrivesAt.getTime() - departsAt.getTime();
  const elapsedMs = now.getTime() - departsAt.getTime();
  const progressFraction = totalMs > 0 ? Math.max(0, Math.min(1, elapsedMs / totalMs)) : status === "landed" ? 1 : 0;

  const minutesUntilArrival = Math.round(
    (arrivesAt.getTime() - now.getTime()) / 60_000,
  );

  return { ...flight, status, progressFraction, minutesUntilArrival };
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
  boarding: 1,
  upcoming: 2,
  delayed: 3,
  landed: 4,
};

export function sortFlights(flights: GuestFlightWithStatus[]): GuestFlightWithStatus[] {
  return [...flights].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return flightInstant(a.arrivesAt).getTime() - flightInstant(b.arrivesAt).getTime();
  });
}
