"use server";

import { guests } from "~/lib/data/guests";
import { seedFlights } from "~/lib/data/flights";
import { mockTravelStatus } from "~/lib/data/travel-status";
import { getDb } from "~/lib/server/db";
import { requireGuest } from "~/lib/server/session";
import { allFlights, allProfiles, allTravelPlans } from "~/lib/server/store";
import type { CrewMemberView } from "~/lib/types";

/** Everyone on the roster with their travel status and photo, for "Who's here". */
export async function getCrew(): Promise<CrewMemberView[]> {
  await requireGuest();
  const db = getDb();
  const [entered, plans, profiles] = await Promise.all([allFlights(db), allTravelPlans(db), allProfiles(db)]);
  const withInbound = new Set([
    ...seedFlights.filter((f) => f.direction === "in").map((f) => f.guestId),
    ...entered.filter((f) => f.direction === "in").map((f) => f.guestId),
  ]);
  return guests.map((g) => {
    const plan = plans.get(g.id);
    const profile = profiles.get(g.id);
    return {
      id: g.id,
      name: profile?.name ?? g.name,
      initials: g.initials,
      image: profile?.avatarDataUrl,
      arrivesBy: plan ? (plan.driving ? "drive" : "fly") : g.arrivesBy ?? "fly",
      hasInboundFlight: withInbound.has(g.id),
      status: plan?.status ?? mockTravelStatus[g.id] ?? "home",
    };
  });
}
