import "server-only";
import { MAX_PLACE_ADDRESS, MAX_PLACE_NAME, type RideDestination } from "~/lib/ride-places";
import { createRateLimiter } from "./rate-limit";
import { createTtlCache } from "./ttl-cache";

// Destination search for rides (ADR 0012), through OpenStreetMap's Nominatim.
// It's free and needs no key, in return for being gentle: it asks for a
// User-Agent naming the app, at most one request a second overall, and no
// bulk use. Results are cached by query, each guest gets a search budget,
// and calls upstream are spaced out, so ten people typing at once stay
// inside that.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
/** Nominatim wants to know which app is calling; nothing about who is using it. */
const USER_AGENT = "Bach-rides/1.0 (private trip site)";
// Greater Phoenix, as a hint: results in it come first, others still show.
const VIEWBOX = "-112.75,33.95,-111.35,33.15";

export const MAX_QUERY_LENGTH = 100;
export const SEARCH_LIMIT = 6;
const CACHE_MS = 60 * 60_000;
/** Searches a guest may run per minute (each keystroke pause is one). */
const PER_GUEST_PER_MINUTE = 30;
const MIN_GAP_MS = 1100;

const cache = createTtlCache<RideDestination[]>(500);
const perGuest = createRateLimiter(PER_GUEST_PER_MINUTE, 60_000);

/** A problem the guest should see, as opposed to an upstream failure. */
export class PlaceSearchError extends Error {}

/** Calls upstream one at a time, at least MIN_GAP_MS apart. */
let gate: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;
function spaced<T>(run: () => Promise<T>): Promise<T> {
  const next = gate.then(async () => {
    const wait = lastCallAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return run();
  });
  gate = next.catch(() => {});
  return next;
}

interface NominatimRow {
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: Record<string, string>;
}

/** A short address line: "7299 N Scottsdale Rd, Scottsdale, AZ 85253". */
function addressLine(a: Record<string, string> | undefined, fallback: string): string {
  if (!a) return fallback;
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const town = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.county;
  const state = a["ISO3166-2-lvl4"]?.replace(/^US-/, "") ?? a.state;
  const line = [street, town, [state, a.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return line || fallback;
}

/** The place's own name, or its street address when it has none. */
function nameOf(row: NominatimRow, address: string): string {
  const own = row.name?.trim();
  if (own) return own;
  const street = address.split(",")[0]?.trim();
  if (street) return street;
  return row.display_name?.split(",")[0]?.trim() || "Pin";
}

function toDestination(row: NominatimRow): RideDestination | null {
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const fallback = row.display_name?.split(",").slice(0, 3).join(",").trim() ?? "";
  const address = addressLine(row.address, fallback).slice(0, MAX_PLACE_ADDRESS);
  return { name: nameOf(row, address).slice(0, MAX_PLACE_NAME), address, lat, lng };
}

export const normalizeQuery = (q: unknown): string =>
  typeof q === "string" ? q.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH) : "";

/** Places matching `query`, Phoenix-area first. Empty for a short query. */
export async function searchPlaces(
  guestId: string,
  query: unknown,
  fetchFn: typeof fetch = fetch,
): Promise<RideDestination[]> {
  const q = normalizeQuery(query);
  if (q.length < 3) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  if (!perGuest.take(guestId)) throw new PlaceSearchError("That's a lot of searching. Give it a minute.");

  const url = new URL(NOMINATIM);
  url.search = new URLSearchParams({
    q,
    format: "jsonv2",
    limit: String(SEARCH_LIMIT),
    addressdetails: "1",
    countrycodes: "us",
    viewbox: VIEWBOX,
    bounded: "0",
    dedupe: "1",
  }).toString();

  const rows = await spaced(async () => {
    const res = await fetchFn(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en-US" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    return (await res.json()) as NominatimRow[];
  });
  const places = (Array.isArray(rows) ? rows : []).map(toDestination).filter((p): p is RideDestination => p !== null);
  cache.set(key, places, CACHE_MS);
  return places;
}
