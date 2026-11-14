"use server";

import { compareActivityTimes } from "~/lib/activity-time";
import { TRIP_DAYS } from "~/lib/config";
import { activityData } from "~/lib/data/activities";
import { pools } from "~/lib/data/funds";
import { requireGuest } from "~/lib/server/session";
import type { Activity, ActivityView } from "~/lib/types";
import { formatCalendarDate } from "~/lib/zoned-time";

// The single swap point for itinerary data (ADR 0006). Day status is computed
// on the client so the dev `?mockDate` param flows through.

export interface ActivityDay {
  date: string;
  label: string;
  activities: ActivityView[];
}

function formatDayLabel(date: string): string {
  return formatCalendarDate(date, { weekday: "long", month: "short", day: "numeric" });
}

function toView(a: Activity): ActivityView {
  const pool = a.poolId ? pools.find((p) => p.id === a.poolId) : undefined;
  return pool ? { ...a, pool: { id: pool.id, title: pool.title } } : { ...a };
}

export async function getActivityDays(): Promise<ActivityDay[]> {
  await requireGuest();
  return TRIP_DAYS.map((date) => ({
    date,
    label: formatDayLabel(date),
    activities: activityData.filter((a) => a.day === date).sort(compareActivityTimes).map(toView),
  }));
}

/** One activity for its shareable page (TL-7), or null if the id is unknown. */
export async function getActivity(id: string): Promise<{ activity: ActivityView; dayLabel: string } | null> {
  await requireGuest();
  const activity = activityData.find((a) => a.id === id);
  if (!activity) return null;
  return { activity: toView(activity), dayLabel: formatDayLabel(activity.day) };
}
