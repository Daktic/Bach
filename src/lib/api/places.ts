"use server";

import type { RideDestination } from "~/lib/ride-places";
import { PlaceSearchError, searchPlaces } from "~/lib/server/places";
import { requireGuest } from "~/lib/server/session";

/** Places matching what a guest typed, for a ride's destination (ADR 0012). */
export async function findPlaces(query: string): Promise<RideDestination[]> {
  const { guest } = await requireGuest();
  try {
    return await searchPlaces(guest.id, query);
  } catch (err) {
    if (err instanceof PlaceSearchError) throw new Error(err.message);
    console.error("[places] search failed", err);
    throw new Error("Search isn't reachable right now. Try again in a moment.");
  }
}
