import { FLIGHT_LOOKUP_FIRST_DAY, FLIGHT_LOOKUP_LAST_DAY } from "./config";

// Input rules for the paid flight APIs: fare search (FL-6, SerpAPI) and
// flight-number lookup (FL-1, Aviationstack). Shared by the forms and the
// server functions, and pure so they're unit tested. The server never trusts
// the client to have applied them.

/** Airlines the fare search can be filtered by. The server forwards no others. */
export const SEARCH_AIRLINES = [
  { code: "AA", name: "American" },
  { code: "AS", name: "Alaska" },
  { code: "B6", name: "JetBlue" },
  { code: "DL", name: "Delta" },
  { code: "F9", name: "Frontier" },
  { code: "G4", name: "Allegiant" },
  { code: "NK", name: "Spirit" },
  { code: "UA", name: "United" },
  { code: "WN", name: "Southwest" },
] as const;

const SEARCH_AIRLINE_CODES: ReadonlySet<string> = new Set(SEARCH_AIRLINES.map((a) => a.code));

/**
 * The airline filter as the server sends it: only codes the form offers,
 * upper-cased, de-duplicated and sorted, so equivalent filters share one
 * cache entry (and one paid search).
 */
export function normalizeSearchAirlines(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const codes = input
    .filter((a): a is string => typeof a === "string")
    .map((a) => a.trim().toUpperCase())
    .filter((a) => SEARCH_AIRLINE_CODES.has(a));
  return [...new Set(codes)].sort();
}

/**
 * SerpAPI reports a search that simply found no flights through its `error`
 * field ("Google Flights hasn't returned any results for this query."). That's
 * an empty result, not a failure.
 */
export function isNoResultsError(error: string): boolean {
  return /hasn['’]t returned any results/i.test(error);
}

/** A "YYYY-MM-DD" date the flight-number lookup will spend a paid call on. */
export function isFlightLookupDate(date: unknown): date is string {
  return (
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date >= FLIGHT_LOOKUP_FIRST_DAY &&
    date <= FLIGHT_LOOKUP_LAST_DAY
  );
}
