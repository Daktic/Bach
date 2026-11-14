"use server";

import { activityData } from "~/lib/data/activities";
import { mockContributions, pools } from "~/lib/data/funds";
import { toPoolView } from "~/lib/funds";
import { requireGuest } from "~/lib/server/session";
import type { PoolView } from "~/lib/types";

// Privacy: each guest only ever receives their own share and payments.
// Totals (raised so far) are shared; per-guest status is not.

function activitiesFor(poolId: string) {
  return activityData
    .filter((a) => a.poolId === poolId)
    .map((a) => ({ id: a.id, title: a.title }));
}

export async function getMyPools(): Promise<PoolView[]> {
  const { guest } = await requireGuest();
  return pools.map((p) => toPoolView(p, mockContributions, guest.id, activitiesFor(p.id)));
}

export async function getMyPool(id: string): Promise<PoolView | null> {
  const { guest } = await requireGuest();
  const pool = pools.find((p) => p.id === id);
  return pool ? toPoolView(pool, mockContributions, guest.id, activitiesFor(pool.id)) : null;
}
