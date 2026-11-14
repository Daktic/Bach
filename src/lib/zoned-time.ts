// Pure time zone helpers. No dependencies, no Date-in-viewer-zone parsing.
//
// Two kinds of time live in this app:
//   • Trip times are Arizona wall times (see config.ts).
//   • Flight times are the airport's local wall time plus that airport's UTC
//     offset, e.g. "2027-04-08T09:00:00-04:00" for a 9 AM departure from JFK.
//
// Display always uses the wall time written in the string, so it never shifts
// with the viewer's phone. Math (status, progress) always uses real instants.

const WALL_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;
const OFFSET_RE = /(Z|[+-]\d{2}:?\d{2})$/i;

export interface WallTime {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Parses the wall-clock part of an ISO-ish string, ignoring any offset. */
export function parseWallTime(iso: string): WallTime | null {
  const m = WALL_TIME_RE.exec(iso.trim());
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
    second: Number(m[6] ?? 0),
  };
}

/** True when the string ends in an explicit UTC offset ("Z", "+05:30", "-0400"). */
export function hasUtcOffset(iso: string): boolean {
  return OFFSET_RE.test(iso.trim());
}

/** Strips any trailing UTC offset, leaving "YYYY-MM-DDTHH:MM[:SS]". */
export function stripUtcOffset(iso: string): string {
  return iso.trim().replace(OFFSET_RE, "");
}

const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, "0");

/** Formats an offset in minutes east of UTC as "+HH:MM" / "-HH:MM". */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

/** The wall time an instant shows in a given IANA time zone. */
export function wallTimeInZone(instant: Date | number, timeZone: string): WallTime {
  const parts = partsFormatter(timeZone).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Minutes east of UTC that `timeZone` observes at `instant`. */
export function utcOffsetMinutes(instant: Date | number, timeZone: string): number {
  const ms = new Date(instant).getTime();
  const w = wallTimeInZone(ms, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  // Drop sub-second precision so the difference is a whole number of minutes.
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

/**
 * Converts a wall time in `timeZone` to an ISO string carrying that zone's
 * offset: zonedWallTimeToIso("2027-04-08T09:00", "America/New_York")
 *   → "2027-04-08T09:00:00-04:00".
 * Wall times that don't exist (inside a DST gap) resolve to a nearby valid
 * instant; flights aren't scheduled there in practice.
 */
export function zonedWallTimeToIso(wall: string, timeZone: string): string | null {
  const w = parseWallTime(wall);
  if (!w) return null;
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  // First guess: the offset at the naive instant. Re-check once at the
  // corrected instant to land on the right side of a DST transition.
  let offset = utcOffsetMinutes(asUtc, timeZone);
  const second = utcOffsetMinutes(asUtc - offset * 60_000, timeZone);
  if (second !== offset) offset = second;
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}${formatUtcOffset(offset)}`;
}

/**
 * The real instant an ISO string refers to. Strings without an offset are
 * read as wall time in `fallbackTimeZone` (never in the viewer's zone).
 */
export function toInstant(iso: string, fallbackTimeZone: string): Date {
  if (hasUtcOffset(iso)) return new Date(iso.trim());
  const withOffset = zonedWallTimeToIso(iso, fallbackTimeZone);
  return withOffset ? new Date(withOffset) : new Date(NaN);
}

/** "9:05 AM" from the wall time written in the string. */
export function formatWallClock(iso: string): string {
  const w = parseWallTime(iso);
  if (!w) return "";
  const suffix = w.hour < 12 ? "AM" : "PM";
  const h12 = w.hour % 12 === 0 ? 12 : w.hour % 12;
  return `${h12}:${pad(w.minute)} ${suffix}`;
}

/** "YYYY-MM-DD" from the wall time written in the string. */
export function wallDate(iso: string): string {
  const w = parseWallTime(iso);
  return w ? `${w.year}-${pad(w.month)}-${pad(w.day)}` : "";
}

/** "YYYY-MM-DD" for an instant as seen in `timeZone`. */
export function dateInZone(instant: Date | number, timeZone: string): string {
  const w = wallTimeInZone(instant, timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/**
 * Formats a calendar date ("YYYY-MM-DD") without any time zone shift,
 * e.g. formatCalendarDate("2027-04-08", { weekday: "long" }) → "Thursday".
 */
export function formatCalendarDate(
  date: string,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const utcNoon = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return utcNoon.toLocaleDateString(locale, { ...options, timeZone: "UTC" });
}
