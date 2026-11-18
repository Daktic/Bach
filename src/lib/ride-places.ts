import type { CarKind } from "~/lib/rides";

// Where rides start and end (ADR 0012), hand-maintained like the itinerary.
// Rides pick from this list instead of free text, so every "Open in Uber" and
// "Open in Lyft" link has a real pin. Coordinates are from OpenStreetMap;
// check a pin in Maps before relying on it.
//
// The repo is public: the house gets its address and pin only once it's
// shared, and the organiser may prefer to leave it out. Without a pin, a ride
// from the house uses the phone's current location as the pickup.

export interface RidePlace {
  id: string;
  /** "PHX Airport". */
  name: string;
  /** For Uber's address line. */
  address?: string;
  lat?: number;
  lng?: number;
}

export const ridePlaces: RidePlace[] = [
  {
    id: "phx",
    name: "PHX Airport",
    address: "3400 E Sky Harbor Blvd, Phoenix, AZ 85034",
    lat: 33.4343,
    lng: -112.0116,
  },
  { id: "house", name: "The House" },
  {
    id: "roka",
    name: "Roka Akor",
    address: "7299 N Scottsdale Rd, Scottsdale, AZ 85253",
    lat: 33.544447,
    lng: -111.92562,
  },
  {
    id: "old-town",
    name: "Old Town Scottsdale",
    address: "Old Town Scottsdale, AZ 85251",
    lat: 33.4942,
    lng: -111.9261,
  },
  {
    id: "wekopa-casino",
    name: "We-Ko-Pa Casino Resort",
    address: "10438 WeKoPa Way, Fort McDowell, AZ 85264",
    lat: 33.585168,
    lng: -111.689166,
  },
  {
    id: "wekopa-golf",
    name: "We-Ko-Pa Golf Club",
    address: "18200 E WeKoPa Way, Fort McDowell, AZ 85264",
    lat: 33.588029,
    lng: -111.688805,
  },
  {
    id: "desert-canyon",
    name: "Desert Canyon Golf Club",
    address: "10440 N Indian Wells Dr, Fountain Hills, AZ 85268",
    lat: 33.58496,
    lng: -111.714016,
  },
];

export const getRidePlace = (id: string | null | undefined): RidePlace | undefined =>
  ridePlaces.find((p) => p.id === id);

const hasPin = (p: RidePlace): p is RidePlace & { lat: number; lng: number } =>
  typeof p.lat === "number" && typeof p.lng === "number";

/**
 * Opens the Uber app (or m.uber.com without it) with the trip filled in. The
 * car type can't be set from a link (Uber's product ids are per city and need
 * its API), so the page tells the booker which type to pick.
 */
export function uberLink(from: RidePlace, to: RidePlace): string {
  const q = new URLSearchParams({ action: "setPickup" });
  if (hasPin(from)) {
    q.set("pickup[latitude]", String(from.lat));
    q.set("pickup[longitude]", String(from.lng));
    q.set("pickup[nickname]", from.name);
    if (from.address) q.set("pickup[formatted_address]", from.address);
  } else {
    q.set("pickup", "my_location");
  }
  if (hasPin(to)) {
    q.set("dropoff[latitude]", String(to.lat));
    q.set("dropoff[longitude]", String(to.lng));
    q.set("dropoff[nickname]", to.name);
    if (to.address) q.set("dropoff[formatted_address]", to.address);
  }
  return `https://m.uber.com/ul/?${q.toString()}`;
}

/**
 * Opens the Lyft app with the ride type and trip filled in. Lyft needs a
 * pickup pin before it takes a destination, so without one it opens on the
 * ride type alone. XL is Lyft's "lyft_plus".
 */
export function lyftLink(from: RidePlace, to: RidePlace, kind: CarKind): string {
  const q = new URLSearchParams({ id: kind === "xl" ? "lyft_plus" : "lyft" });
  if (hasPin(from)) {
    q.set("pickup[latitude]", String(from.lat));
    q.set("pickup[longitude]", String(from.lng));
    if (hasPin(to)) {
      q.set("destination[latitude]", String(to.lat));
      q.set("destination[longitude]", String(to.lng));
    }
  }
  return `https://lyft.com/ride?${q.toString()}`;
}
