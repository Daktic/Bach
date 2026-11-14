"use server";

// Live fare search for /flights/book (FL-6), via SerpAPI's Google Flights engine.

import { AIRPORTS, airportTimeZone } from "~/lib/airports";
import { DEFAULT_INBOUND_DATE, DEFAULT_OUTBOUND_DATE, DESTINATION_AIRPORT } from "~/lib/config";
import { isNoResultsError, normalizeSearchAirlines } from "~/lib/flight-api";
import { createRateLimiter } from "~/lib/server/rate-limit";
import { requireGuest } from "~/lib/server/session";
import { createTtlCache } from "~/lib/server/ttl-cache";
import { zonedWallTimeToIso } from "~/lib/zoned-time";

const SERP_BASE = "https://serpapi.com/search.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NearbyAirport {
  code: string;
  name: string;
  city: string;
  distanceKm: number;
}

export interface FlightOffer {
  id: string;
  price: number;
  airline: string;
  airlineName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  /** Airport-local wall time, with the airport's UTC offset when known. */
  departsAt: string;
  arrivesAt: string;
  stops: number;
  duration: string;
  bookingToken: string;
  bookingUrl: string; // Kayak RT fallback
}

export interface PriceInsights {
  priceLevel: "low" | "typical" | "high" | string;
  typicalRangeLow: number;
  typicalRangeHigh: number;
  lowestPrice: number;
}

export interface FlightSearchResult {
  offers: FlightOffer[];
  insights: PriceInsights | null;
}

// ─── Caching (cost: don't pay for the same search twice) ──────────────────────

const SEARCH_TTL = 30 * 60 * 1000;
const BOOKING_TTL = 6 * 60 * 60 * 1000;
const searchCache = createTtlCache<FlightSearchResult>(100);
const bookingCache = createTtlCache<string | null>(200);

// Paid SerpAPI calls (searches and booking links) per guest per hour. Cache
// hits are free. Plenty for comparing a few airports and airlines.
const serpBudget = createRateLimiter(20, 60 * 60 * 1000);

// Messages guests see. SerpAPI's own error text ("Your account has run out of
// searches.", "Invalid API key…") only goes to the server log.
const SEARCH_UNAVAILABLE = "Flight search isn't available right now. Try the links below.";
const SEARCH_BUDGET_USED = "That's a lot of searches. Try again in a little while, or use the links below.";

function serpKey(): string {
  const key = process.env.SERP_API_KEY;
  if (!key) throw new Error("Flight search isn't set up yet. Try the links below.");
  return key;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function fmtDuration(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ");
}

// "2027-04-08 07:00", also accepted without the hour's leading zero.
const SERP_TIME_RE = /^(\d{4}-\d{2}-\d{2})[ T]([01]?\d|2[0-3]):([0-5]\d)/;

/**
 * SerpAPI gives "2027-04-08 07:00" in the airport's local time. Adds the
 * airport's UTC offset when we know its zone; null when it isn't a time.
 */
function airportLocal(time: unknown, iata: string): string | null {
  const m = typeof time === "string" ? SERP_TIME_RE.exec(time.trim()) : null;
  if (!m) return null;
  const wall = `${m[1]}T${m[2].padStart(2, "0")}:${m[3]}`;
  const zone = airportTimeZone(iata);
  return (zone && zonedWallTimeToIso(wall, zone)) || wall;
}

const IATA_RE = /^[A-Z]{3}$/;

// Airports this close to PHX (Mesa Gateway, Tucson) are a drive, not a
// flight. "Locate me" leaves them out and the search refuses them, so nobody
// pays for an AZA→PHX query. They stay in AIRPORTS for their time zone.
const DRIVE_RADIUS_KM = 200;

function isDrivingDistance(code: string): boolean {
  const destination = AIRPORTS.find(ap => ap.code === DESTINATION_AIRPORT);
  const airport = AIRPORTS.find(ap => ap.code === code);
  if (!destination || !airport) return false;
  return distanceKm(destination.lat, destination.lng, airport.lat, airport.lng) < DRIVE_RADIUS_KM;
}

const isAmount = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * One SerpAPI offer as a result card, or null when it lacks something the
 * card needs: the first departure and last arrival (airport and time), the
 * airline, a price, or the total duration.
 */
function toFlightOffer(offer: any): Omit<FlightOffer, "id"> | null {
  const flights: any[] = Array.isArray(offer?.flights) ? offer.flights : [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  const origin = text(first?.departure_airport?.id);
  const destination = text(last?.arrival_airport?.id);
  const airline = text(first?.airline);
  if (!IATA_RE.test(origin) || !IATA_RE.test(destination) || !airline) return null;
  const departsAt = airportLocal(first.departure_airport.time, origin);
  const arrivesAt = airportLocal(last.arrival_airport.time, destination);
  if (!departsAt || !arrivesAt || !isAmount(offer.price) || !isAmount(offer.total_duration)) return null;

  return {
    price:        offer.price,
    airline,
    airlineName:  airline,
    flightNumber: text(first.flight_number) || `${airline} flight`,
    origin,
    destination,
    departsAt,
    arrivesAt,
    // SerpAPI lists layovers for connecting flights; else count the connections.
    stops:        Array.isArray(offer.layovers) ? offer.layovers.length : flights.length - 1,
    duration:     fmtDuration(offer.total_duration),
    bookingToken: text(offer.departure_token) || text(offer.booking_token),
    bookingUrl:   `https://www.kayak.com/flights/${origin}-${DESTINATION_AIRPORT}/${DEFAULT_INBOUND_DATE}/${DEFAULT_OUTBOUND_DATE}`,
  };
}

/** Google's price read-out for the route, when the body has one. */
function toPriceInsights(pi: any): PriceInsights | null {
  if (!pi || typeof pi !== "object") return null;
  const amount = (n: unknown) => (isAmount(n) ? n : 0);
  const range: unknown[] = Array.isArray(pi.typical_price_range) ? pi.typical_price_range : [pi.typical_price_range];
  const low = amount(range[0]);
  return {
    // The page lower-cases this, so it has to be a string.
    priceLevel:       typeof pi.price_level === "string" ? pi.price_level : "typical",
    typicalRangeLow:  low,
    typicalRangeHigh: Math.max(low, amount(range[1])),
    lowestPrice:      amount(pi.lowest_price),
  };
}

/**
 * The guest's results from a SerpAPI success body: the 8 cheapest of the
 * first 10 usable offers. Offers missing something are skipped and counted in
 * the log. Throws when there were offers but none could be read, so a changed
 * response shape isn't cached as "no flights".
 */
function toSearchResult(data: any): FlightSearchResult {
  const all: unknown[] = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
  const usable = all.map(toFlightOffer).filter((offer) => offer !== null);
  const skipped = all.length - usable.length;
  if (skipped > 0 && usable.length === 0) throw new Error(`none of the ${all.length} offers could be read`);
  if (skipped > 0) console.warn(`[serpapi] skipped ${skipped} of ${all.length} offers with missing or malformed fields`);

  const offers: FlightOffer[] = usable
    .slice(0, 10)
    .map((offer, i) => ({ id: String(i), ...offer }))
    .sort((a, b) => a.price - b.price)
    .slice(0, 8);
  return { offers, insights: toPriceInsights(data.price_insights) };
}

// ─── Server functions ─────────────────────────────────────────────────────────

export async function findNearbyAirports(
  lat: number,
  lng: number,
): Promise<NearbyAirport[]> {
  await requireGuest();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  return AIRPORTS
    .filter(ap => !isDrivingDistance(ap.code))
    .map(ap => ({ ...ap, distanceKm: distanceKm(lat, lng, ap.lat, ap.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5)
    .map(({ code, name, city, distanceKm: d }) => ({ code, name, city, distanceKm: d }));
}

/**
 * Round-trip fares from `origin` to PHX for the trip dates (FL-6), optionally
 * limited to some of SEARCH_AIRLINES. The destination and dates are fixed on
 * the server: every distinct search is a paid call, so the client only picks
 * the origin and airlines.
 */
export async function searchFlightOffers(
  origin: string,
  airlines: string[] = [],
): Promise<FlightSearchResult> {
  const { guest } = await requireGuest();

  const from = (typeof origin === "string" ? origin : "").trim().toUpperCase();
  const to = DESTINATION_AIRPORT;
  const date = DEFAULT_INBOUND_DATE;
  const returnDate = DEFAULT_OUTBOUND_DATE;
  const carriers = normalizeSearchAirlines(airlines);
  if (!IATA_RE.test(from)) {
    throw new Error("Enter a 3-letter airport code, like JFK.");
  }
  if (from === to) {
    throw new Error(`Enter the airport you're flying from, not ${to}.`);
  }
  if (isDrivingDistance(from)) {
    throw new Error(`${from} is close enough to drive to ${to}, no flight needed.`);
  }

  const cacheKey = [from, carriers.join(",")].join("|");
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const apiKey = serpKey();
  if (!serpBudget.take(guest.id)) throw new Error(SEARCH_BUDGET_USED);

  const url = new URL(SERP_BASE);
  url.searchParams.set("engine",        "google_flights");
  url.searchParams.set("departure_id",  from);
  url.searchParams.set("arrival_id",    to);
  url.searchParams.set("outbound_date", date);
  url.searchParams.set("return_date",   returnDate);
  url.searchParams.set("currency",      "USD");
  url.searchParams.set("hl",            "en");
  url.searchParams.set("type",          "1"); // round trip
  url.searchParams.set("api_key",       apiKey);
  if (carriers.length > 0) {
    url.searchParams.set("include_airlines", carriers.join(","));
  }

  let data: any = null;
  let error: string | null = null;
  try {
    const res = await fetch(url.toString());
    data = await res.json().catch(() => null);
    if (data?.error) error = String(data.error);
    else if (!res.ok || !data || typeof data !== "object") error = `HTTP ${res.status}`;
  } catch (err) {
    error = err instanceof Error ? err.message : "request failed";
  }

  if (error !== null) {
    if (isNoResultsError(error)) {
      // A search with no flights is an answer, not a failure: show the empty
      // state and don't pay for the same search again.
      const empty: FlightSearchResult = { offers: [], insights: null };
      searchCache.set(cacheKey, empty, SEARCH_TTL);
      return empty;
    }
    console.warn("[serpapi] flight search failed:", error);
    throw new Error(SEARCH_UNAVAILABLE);
  }

  let result: FlightSearchResult;
  try {
    result = toSearchResult(data);
  } catch (err) {
    // A body we can't read: the guest gets the usual message, the log gets why.
    // Not cached, so the next search tries again.
    console.warn("[serpapi] couldn't read flight search results:", err);
    throw new Error(SEARCH_UNAVAILABLE);
  }
  searchCache.set(cacheKey, result, SEARCH_TTL);
  return result;
}

// ─── Resolve a booking token → direct airline URL ─────────────────────────────

export async function resolveBookingUrl(token: string): Promise<string | null> {
  const { guest } = await requireGuest();
  if (!token || typeof token !== "string") return null;

  const cached = bookingCache.get(token);
  if (cached !== undefined) return cached;
  // Out of budget: the guest still gets the fallback search link.
  if (!serpBudget.take(guest.id)) return null;

  try {
    const url = new URL(SERP_BASE);
    url.searchParams.set("engine",          "google_flights_booking");
    url.searchParams.set("departure_token", token);
    url.searchParams.set("api_key",         serpKey());

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();

    const options: any[] = data.booking_options ?? [];
    // Prefer the airline's own site over aggregators
    const direct = options.find(o =>
      o.url &&
      !o.book_with?.toLowerCase().includes("google") &&
      !o.book_with?.toLowerCase().includes("kayak") &&
      !o.book_with?.toLowerCase().includes("expedia"),
    );
    const found: string | null = direct?.url ?? options[0]?.url ?? null;
    // Only hand back http(s) links; anything else is ignored.
    const safe = found && /^https?:\/\//i.test(found) ? found : null;
    bookingCache.set(token, safe, BOOKING_TTL);
    return safe;
  } catch {
    return null;
  }
}
