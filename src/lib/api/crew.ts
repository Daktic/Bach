"use server";

import { guests } from "~/lib/data/guests";
import { seedFlights } from "~/lib/data/flights";
import { mockTravelStatus } from "~/lib/data/travel-status";
import { requireGuest } from "~/lib/server/session";
import type { CrewMemberView } from "~/lib/types";

/** Everyone on the roster with their (mock) travel status, for "Who's here". */
export async function getCrew(): Promise<CrewMemberView[]> {
  await requireGuest();
  const withInbound = new Set(seedFlights.filter((f) => f.direction === "in").map((f) => f.guestId));
  return guests.map((g) => ({
    id: g.id,
    name: g.name,
    initials: g.initials,
    arrivesBy: g.arrivesBy ?? "fly",
    hasInboundFlight: withInbound.has(g.id),
    status: mockTravelStatus[g.id] ?? "home",
  }));
}
