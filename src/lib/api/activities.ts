"use server";

import { activityData } from "~/lib/data/activities";

const TRIP_DAYS = [
  "2027-04-08",
  "2027-04-09",
  "2027-04-10",
  "2027-04-11",
  "2027-04-12",
] as const;

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export async function getActivityDays() {
  return TRIP_DAYS.map((date) => ({
    date,
    label: formatDayLabel(date),
    activities: activityData.filter((a) => a.day === date),
  }));
}
