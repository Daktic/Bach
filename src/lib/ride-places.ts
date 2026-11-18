import type { CarKind } from "~/lib/rides";

// Where a ride goes, and the Uber and Lyft links that take the group there
// (ADR 0012). The pickup is never stored: it's wherever the booker's phone is
// when they tap the button.

/** A destination: a name to show, an address line, and the pin the apps get. */
export interface RideDestination {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/** The booker's phone position, when the page has it. */
export interface PhonePosition {
  lat: number;
  lng: number;
}

export const MAX_PLACE_NAME = 80;
export const MAX_PLACE_ADDRESS = 160;

const inRange = (n: unknown, max: number): n is number => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= max;

/** Tidies a destination from the browser, or returns null if it isn't one. */
export function cleanDestination(input: unknown): RideDestination | null {
  if (!input || typeof input !== "object") return null;
  const d = input as Record<string, unknown>;
  if (typeof d.name !== "string" || !inRange(d.lat, 90) || !inRange(d.lng, 180)) return null;
  const name = d.name.replace(/\s+/g, " ").trim().slice(0, MAX_PLACE_NAME);
  if (!name) return null;
  const address = typeof d.address === "string" ? d.address.replace(/\s+/g, " ").trim().slice(0, MAX_PLACE_ADDRESS) : "";
  return { name, address, lat: Math.round(d.lat * 1e6) / 1e6, lng: Math.round(d.lng * 1e6) / 1e6 };
}

/**
 * Spots from the itinerary, offered before anyone types. Coordinates are from
 * OpenStreetMap; check a pin in Maps before relying on it. The house isn't
 * here: the repo is public, so search for it on the day.
 */
export const suggestedDestinations: RideDestination[] = [
  { name: "PHX Airport", address: "3400 E Sky Harbor Blvd, Phoenix, AZ 85034", lat: 33.4343, lng: -112.0116 },
  { name: "Roka Akor", address: "7299 N Scottsdale Rd, Scottsdale, AZ 85253", lat: 33.544447, lng: -111.92562 },
  { name: "Old Town Scottsdale", address: "Old Town Scottsdale, AZ 85251", lat: 33.4942, lng: -111.9261 },
  { name: "We-Ko-Pa Casino Resort", address: "10438 WeKoPa Way, Fort McDowell, AZ 85264", lat: 33.585168, lng: -111.689166 },
  { name: "We-Ko-Pa Golf Club", address: "18200 E WeKoPa Way, Fort McDowell, AZ 85264", lat: 33.588029, lng: -111.688805 },
  { name: "Desert Canyon Golf Club", address: "10440 N Indian Wells Dr, Fountain Hills, AZ 85268", lat: 33.58496, lng: -111.714016 },
];

/**
 * Opens the Uber app (or m.uber.com without it) with the pickup set to the
 * phone's location and the drop-off filled in. The car type can't be set
 * from a link (Uber's product ids are per city and need its API), so the
 * page tells the booker which type to pick.
 */
export function uberLink(to: RideDestination): string {
  const q = new URLSearchParams({ action: "setPickup", pickup: "my_location" });
  q.set("dropoff[latitude]", String(to.lat));
  q.set("dropoff[longitude]", String(to.lng));
  q.set("dropoff[nickname]", to.name);
  if (to.address) q.set("dropoff[formatted_address]", to.address);
  return `https://m.uber.com/ul/?${q.toString()}`;
}

/**
 * Opens the Lyft app with the ride type and the trip filled in. Lyft only
 * takes a destination together with a pickup, so without the phone's
 * position it opens on the ride type alone. XL is Lyft's "lyft_plus".
 */
export function lyftLink(to: RideDestination, kind: CarKind, pickup: PhonePosition | null): string {
  const q = new URLSearchParams({ id: kind === "xl" ? "lyft_plus" : "lyft" });
  if (pickup) {
    q.set("pickup[latitude]", String(pickup.lat));
    q.set("pickup[longitude]", String(pickup.lng));
    q.set("destination[latitude]", String(to.lat));
    q.set("destination[longitude]", String(to.lng));
  }
  return `https://lyft.com/ride?${q.toString()}`;
}
