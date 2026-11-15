import type { FlightLeg } from "~/lib/types";
import { hasUtcOffset, parseWallTime } from "~/lib/zoned-time";

// Shared by the browser (before saving) and the server (before storing).

const MAX_TEXT = 80;

/** Legs allowed each way: plenty for connections, small enough to stay sane. */
export const MAX_LEGS = 4;

/** A complete flight with offset-aware times (see FlightLeg). */
export function isValidLeg(value: unknown): value is FlightLeg {
  if (!value || typeof value !== "object") return false;
  const leg = value as Record<string, unknown>;
  const str = (k: string) => typeof leg[k] === "string" && (leg[k] as string).length > 0 && (leg[k] as string).length <= MAX_TEXT;
  return (
    str("flightNumber") &&
    str("origin") &&
    str("destination") &&
    str("departsAt") &&
    str("arrivesAt") &&
    typeof leg.airline === "string" &&
    (leg.airline as string).length <= MAX_TEXT &&
    // Only offset-aware times: a time without an offset can't be placed on
    // the timeline reliably.
    hasUtcOffset(leg.departsAt as string) &&
    hasUtcOffset(leg.arrivesAt as string) &&
    parseWallTime(leg.departsAt as string) !== null &&
    parseWallTime(leg.arrivesAt as string) !== null
  );
}

/** Just the FlightLeg fields, dropping anything extra. */
export function cleanLeg(leg: FlightLeg): FlightLeg {
  return {
    flightNumber: leg.flightNumber,
    airline: leg.airline,
    origin: leg.origin,
    destination: leg.destination,
    departsAt: leg.departsAt,
    arrivesAt: leg.arrivesAt,
  };
}
