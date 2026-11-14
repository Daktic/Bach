import { formatCalendarDate, wallDate } from "~/lib/zoned-time";

// Display helpers for flight cards and search results. Like formatTime, they
// read the wall time written in the string and never use the viewer's zone.

/** "45 min", "1h", "2h 15m". */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const dayNumber = (date: string) =>
  Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86_400_000;

/**
 * Calendar days between the local departure date and the local arrival date,
 * e.g. 1 for a red-eye that lands the next morning (shown as "+1"), or -1 for
 * an eastbound date-line crossing that lands on the previous local date.
 */
export function arrivalDayOffset(departsAt: string, arrivesAt: string): number {
  const from = wallDate(departsAt);
  const to = wallDate(arrivesAt);
  if (!from || !to) return 0;
  return Math.round(dayNumber(to) - dayNumber(from));
}

/** The marker after an arrival time: "+1", "−1" (a real minus sign), or "" for the same day. */
export function formatDayOffset(days: number): string {
  if (!days) return "";
  return days > 0 ? `+${days}` : `−${-days}`;
}

/** "Thu, Apr 8": the flight's local calendar date. */
export function formatFlightDate(iso: string): string {
  const date = wallDate(iso);
  return date ? formatCalendarDate(date, { weekday: "short", month: "short", day: "numeric" }) : "";
}
