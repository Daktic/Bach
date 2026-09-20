import type { FlightStatus, GuestFlight, GuestFlightWithStatus } from "./types";
import { getCurrentDate } from "./time";

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

export function enrichFlight(flight: GuestFlight): GuestFlightWithStatus {
  const now = getCurrentDate();
  const departsAt = new Date(flight.departsAt);
  const arrivesAt = new Date(flight.arrivesAt);
  const status = computeFlightStatus(departsAt, arrivesAt, now);

  const totalMs = arrivesAt.getTime() - departsAt.getTime();
  const elapsedMs = now.getTime() - departsAt.getTime();
  const progressFraction = Math.max(0, Math.min(1, elapsedMs / totalMs));

  const minutesUntilArrival = Math.round(
    (arrivesAt.getTime() - now.getTime()) / 60_000,
  );

  return { ...flight, status, progressFraction, minutesUntilArrival };
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
    return new Date(a.arrivesAt).getTime() - new Date(b.arrivesAt).getTime();
  });
}
