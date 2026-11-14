import { formatCalendarDate } from "./zoned-time";

// Activity times are Arizona wall times ("HH:MM", 24h). They're formatted as
// plain strings, never through Date, so every viewer sees the same clock time
// whatever time zone their phone is in.

const HHMM_RE = /^(\d{1,2}):(\d{2})$/;

/** "19:00" or "9:05" → minutes after midnight; null for anything that isn't a valid "HH:MM". */
export function activityTimeMinutes(hhmm: string | undefined): number | null {
  const m = HHMM_RE.exec(hhmm?.trim() ?? "");
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** "19:00" → "7:00 PM". Returns "" for anything that isn't a valid "HH:MM". */
export function formatActivityTime(hhmm: string | undefined): string {
  const minutes = activityTimeMinutes(hhmm);
  if (minutes === null) return "";
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, "0");
  const suffix = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${minute} ${suffix}`;
}

/**
 * Orders a day's activities by clock time, not by comparing strings ("9:30"
 * comes before "14:00"). An activity with only an end time ("Until 10:00 AM")
 * sorts at its end time; one with no valid time goes last. Ties keep their
 * order (Array.prototype.sort is stable).
 */
export function compareActivityTimes(
  a: { startTime?: string; endTime?: string },
  b: { startTime?: string; endTime?: string },
): number {
  const key = (x: { startTime?: string; endTime?: string }) =>
    activityTimeMinutes(x.startTime) ?? activityTimeMinutes(x.endTime) ?? Number.POSITIVE_INFINITY;
  const ka = key(a);
  const kb = key(b);
  return ka === kb ? 0 : ka < kb ? -1 : 1;
}

/**
 * "7:00 PM – 9:30 PM" when both ends are set, "7:00 PM" with only a start,
 * "Until 9:30 PM" with only an end, and "" with neither.
 */
export function formatActivityTimeRange(start?: string, end?: string): string {
  const from = formatActivityTime(start);
  const to = formatActivityTime(end);
  if (from && to && from !== to) return `${from} – ${to}`;
  if (from) return from;
  if (to) return `Until ${to}`;
  return "";
}

/** "2027-04-10" → "Saturday, April 10", with no time zone shift. */
export function formatActivityDate(day: string): string {
  return formatCalendarDate(day, { weekday: "long", month: "long", day: "numeric" });
}
