"use server";

import { airportTimeZone } from "~/lib/airports";
import { isFlightLookupDate } from "~/lib/flight-api";
import { createRateLimiter } from "~/lib/server/rate-limit";
import { requireGuest } from "~/lib/server/session";
import { createTtlCache } from "~/lib/server/ttl-cache";
import type { FlightLeg } from "~/lib/types";
import { stripUtcOffset, zonedWallTimeToIso } from "~/lib/zoned-time";

// Free tier is HTTP only — the call is server-to-server so the key never
// reaches the browser, but it does cross the network unencrypted.
const BASE = "http://api.aviationstack.com/v1";

/**
 * Outcome of a flight lookup by number + date (FL-1).
 * - "found": the flight, with times carrying each airport's UTC offset.
 * - "not_found": the service answered, and it has no such flight that day.
 * - "unavailable": the service couldn't be asked or refused (no key, quota or
 *   plan limits, network). Says nothing about whether the flight exists.
 */
export type FlightLookupResult =
  | { status: "found"; leg: FlightLeg }
  | { status: "not_found" }
  | { status: "unavailable" };

const NOT_FOUND: FlightLookupResult = { status: "not_found" };
const UNAVAILABLE: FlightLookupResult = { status: "unavailable" };

const HIT_TTL = 12 * 60 * 60 * 1000;  // schedules rarely change
const MISS_TTL = 15 * 60 * 1000;      // retry unknown flights sooner
// Only answers are cached ("found" / "not_found"), never "unavailable".
const cache = createTtlCache<FlightLookupResult>();

// Paid lookups per guest per hour (cache hits are free). A guest needs two:
// in and out, plus a few typos.
const lookupBudget = createRateLimiter(10, 60 * 60 * 1000);

function apiKey(): string | undefined {
  // .env uses AVIATION_STACK_API_KEY; accept both spellings.
  return process.env.AVIATIONSTACK_API_KEY ?? process.env.AVIATION_STACK_API_KEY;
}

/**
 * Aviationstack reports schedules in the airport's local time but labels them
 * "+00:00". Read the wall clock as local to the airport and attach the
 * airport's real offset: "2027-04-08T09:00:00+00:00" at JFK
 *   → "2027-04-08T09:00:00-04:00".
 */
function toAirportLocal(
  scheduled: string | undefined,
  timeZone: string | undefined,
  iata: string | undefined,
): string | null {
  if (!scheduled) return null;
  const zone = timeZone || airportTimeZone(iata);
  if (!zone) return null;
  try {
    return zonedWallTimeToIso(stripUtcOffset(scheduled), zone);
  } catch {
    return null; // unknown time zone name
  }
}

export async function lookupFlight(rawInput: string, date: string): Promise<FlightLookupResult> {
  const { guest } = await requireGuest();

  const normalized = (typeof rawInput === "string" ? rawInput : "").replace(/\s+/g, "").toUpperCase();
  if (!/^([A-Z0-9]{2,3})?\d{1,4}[A-Z]?$/.test(normalized)) return NOT_FOUND;
  // Only dates around the trip: each distinct date is another paid call.
  if (!isFlightLookupDate(date)) return NOT_FOUND;

  const cacheKey = `${normalized}|${date}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const key = apiKey();
  if (!key) {
    console.warn("[aviationstack] no API key set; flight lookup unavailable");
    return UNAVAILABLE;
  }
  if (!lookupBudget.take(guest.id)) {
    console.warn("[aviationstack] a guest used up their lookup budget");
    return UNAVAILABLE;
  }

  const hasPrefix = /^[A-Z]/.test(normalized) || /^\d[A-Z]/.test(normalized);
  const url = new URL(`${BASE}/flights`);
  url.searchParams.set("access_key", key);
  url.searchParams.set("flight_date", date);
  url.searchParams.set("limit", "1");
  url.searchParams.set(hasPrefix ? "flight_iata" : "flight_number", normalized);

  // Failures return "unavailable" and aren't cached: they may be transient.
  try {
    const res = await fetch(url.toString());
    const data = await res.json().catch(() => null);
    if (data?.error) {
      // e.g. usage_limit_reached, function_access_restricted (plan), invalid_access_key
      console.warn("[aviationstack]", res.status, data.error.code ?? "error", data.error.info ?? "");
      return UNAVAILABLE;
    }
    if (!res.ok || !data || typeof data !== "object") {
      console.warn("[aviationstack] HTTP", res.status);
      return UNAVAILABLE;
    }

    const f = (Array.isArray(data.data) ? data.data : [])[0];
    let leg: FlightLeg | null = null;
    if (f) {
      const departsAt = toAirportLocal(f.departure?.scheduled, f.departure?.timezone, f.departure?.iata);
      const arrivesAt = toAirportLocal(f.arrival?.scheduled, f.arrival?.timezone, f.arrival?.iata);
      if (departsAt && arrivesAt && f.departure?.iata && f.arrival?.iata) {
        leg = {
          flightNumber: f.flight?.iata ?? normalized,
          airline: f.airline?.name ?? f.airline?.iata ?? "",
          origin: f.departure.iata,
          destination: f.arrival.iata,
          departsAt,
          arrivesAt,
        };
      }
    }

    const result: FlightLookupResult = leg ? { status: "found", leg } : NOT_FOUND;
    cache.set(cacheKey, result, leg ? HIT_TTL : MISS_TTL);
    return result;
  } catch (err) {
    console.warn("[aviationstack] lookup failed", err);
    return UNAVAILABLE;
  }
}
