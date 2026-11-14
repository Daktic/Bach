"use server";

import { getDb } from "~/lib/server/db";
import { requireGuest } from "~/lib/server/session";
import { allTravelPlans, getTravel, saveTravel, setStatus, type GuestTravel } from "~/lib/server/store";
import type { TravelStatus } from "~/lib/types";
import { mockTravelStatus } from "~/lib/data/travel-status";
import { guests } from "~/lib/data/guests";

// The signed-in guest's own flights, driving flag and "Who's here" status
// (FL-1, FL-2, FL-8, FL-9). Writes always use the session's guest id.

export async function getMyTravel(): Promise<GuestTravel> {
  const { guest } = await requireGuest();
  return getTravel(getDb(), guest.id);
}

export async function saveMyTravel(travel: GuestTravel): Promise<GuestTravel> {
  const { guest } = await requireGuest();
  if (!travel || typeof travel !== "object") throw new Error("Nothing to save.");
  return saveTravel(getDb(), guest.id, {
    inbound: travel.inbound ?? null,
    outbound: travel.outbound ?? null,
    driving: travel.driving === true,
  });
}

export async function setMyStatus(status: TravelStatus): Promise<void> {
  const { guest } = await requireGuest();
  await setStatus(getDb(), guest.id, status);
}

/** Everyone's "Who's here" status, polled by the bar so phones stay in sync. */
export async function getCrewStatuses(): Promise<Record<string, TravelStatus>> {
  await requireGuest();
  const plans = await allTravelPlans(getDb());
  return Object.fromEntries(
    guests.map((g) => [g.id, plans.get(g.id)?.status ?? mockTravelStatus[g.id] ?? "home"]),
  );
}
