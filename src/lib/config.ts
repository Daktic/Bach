// ─── Trip constants ───────────────────────────────────────────────────────────
// All trip times (itinerary, countdown, day boundaries) are Arizona time.
// Arizona stays on MST all year (no DST), so the offset never changes.

export const TRIP_TIME_ZONE = "America/Phoenix";
export const TRIP_UTC_OFFSET = "-07:00";

export const TRIP_DAYS = [
  "2027-04-08",
  "2027-04-09",
  "2027-04-10",
  "2027-04-11",
  "2027-04-12",
] as const;

export const TRIP_START_DAY = TRIP_DAYS[0];
export const TRIP_END_DAY = TRIP_DAYS[TRIP_DAYS.length - 1];

// Countdown dialog renders while the current instant is before DEPARTURE_DATE:
// midnight at the start of Thursday Apr 8 2027, Arizona time, for every viewer.
export const DEPARTURE_DATE = new Date(`${TRIP_START_DAY}T00:00:00${TRIP_UTC_OFFSET}`);
export const TRIP_END_DATE = new Date(`${TRIP_END_DAY}T23:59:59${TRIP_UTC_OFFSET}`);

// Where everyone flies in to, and the default dates for flight entry/search.
export const DESTINATION_AIRPORT = "PHX";
export const DEFAULT_INBOUND_DATE = TRIP_START_DAY;
export const DEFAULT_OUTBOUND_DATE = TRIP_END_DAY;

/** "2027-04-08" shifted by `days` calendar days. */
function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Dates the paid flight-number lookup (FL-1) accepts: a week either side of
// the trip. Any other date isn't a flight to the party.
export const FLIGHT_LOOKUP_FIRST_DAY = shiftDay(TRIP_START_DAY, -7);
export const FLIGHT_LOOKUP_LAST_DAY = shiftDay(TRIP_END_DAY, 7);
