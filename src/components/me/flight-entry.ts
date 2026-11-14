import { arrivalDayOffset as daysBetweenLocalDates } from "~/components/flights/flight-format";
import { airportTimeZone, US_TIME_ZONES } from "~/lib/airports";
import type { MyTravel } from "~/lib/client/my-travel";
import { DESTINATION_AIRPORT, TRIP_TIME_ZONE } from "~/lib/config";
import type { FlightLeg } from "~/lib/types";
import {
  formatCalendarDate,
  parseWallTime,
  stripUtcOffset,
  toInstant,
  wallDate,
  zonedWallTimeToIso,
} from "~/lib/zoned-time";

// Pure helpers for entering a flight on /me: flight numbers, manual-entry
// validation and small display bits. No browser APIs, so they're unit-tested.

export type LegDirection = "in" | "out";

const pad = (n: number) => String(n).padStart(2, "0");

// ─── Flight numbers ───────────────────────────────────────────────────────────

/** Carriers guests are likely to fly, to fill in the airline from a flight number. */
const AIRLINE_NAMES: Record<string, string> = {
  AA: "American",
  AS: "Alaska",
  B6: "JetBlue",
  DL: "Delta",
  F9: "Frontier",
  G4: "Allegiant",
  HA: "Hawaiian",
  MX: "Breeze",
  NK: "Spirit",
  SY: "Sun Country",
  UA: "United",
  WN: "Southwest",
};

// Optional airline code (IATA "AA" / "B6" / "9E", or ICAO "AAL"), then 1–4
// digits and an optional suffix letter.
const FLIGHT_NUMBER_RE = /^([A-Z]{3}|[A-Z][A-Z0-9]|[0-9][A-Z])? ?(\d{1,4})([A-Z]?)$/;

/** "aa1105" → "AA 1105"; null when it doesn't look like a flight number. */
export function normalizeFlightNumber(raw: string): string | null {
  const value = raw.trim().toUpperCase().replace(/\s+/g, " ");
  const m = FLIGHT_NUMBER_RE.exec(value);
  if (!m) return null;
  const [, code, digits, suffix] = m;
  return code ? `${code} ${digits}${suffix}` : `${digits}${suffix}`;
}

/** "AA 1105" → "American", when we know the carrier. */
export function airlineFromFlightNumber(raw: string): string | null {
  const normalized = normalizeFlightNumber(raw);
  if (!normalized) return null;
  const [code, number] = normalized.split(" ");
  return number ? (AIRLINE_NAMES[code] ?? null) : null;
}

// ─── Airports ─────────────────────────────────────────────────────────────────

export function normalizeAirportCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isAirportCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

/** True for a well-formed code we don't know, so the guest has to pick its zone. */
export function needsZonePick(raw: string): boolean {
  const code = normalizeAirportCode(raw);
  return isAirportCode(code) && !airportTimeZone(code);
}

// ─── Time zones ───────────────────────────────────────────────────────────────

export interface TimeZoneChoice {
  /** An IANA zone, or a fixed UTC offset like "+09:00" (see timeZoneOptions). */
  id: string;
  label: string;
}

/**
 * Zones to pick from for an airport we don't know: the US ones, then places
 * with direct flights to PHX that a US zone name would put an hour out in
 * April (Mexico and Saskatchewan skip DST), and Europe.
 */
export const ENTRY_TIME_ZONES: readonly TimeZoneChoice[] = [
  ...US_TIME_ZONES,
  { id: "America/Cancun",      label: "Cancún" },
  { id: "America/Mexico_City", label: "Mexico City / Guadalajara" },
  { id: "America/Mazatlan",    label: "Los Cabos / Mazatlán" },
  { id: "America/Regina",      label: "Saskatchewan" },
  { id: "Europe/London",       label: "UK & Ireland" },
  { id: "Europe/Paris",        label: "Central Europe" },
];

const FIXED_OFFSET_RE = /^[+-](\d{2}):(\d{2})$/;

/** "+09:00" / "-03:30": a UTC offset kept from a saved leg whose zone isn't listed. */
function isFixedOffset(zone: string): boolean {
  const m = FIXED_OFFSET_RE.exec(zone);
  return m !== null && Number(m[2]) < 60 && Number(m[1]) * 60 + Number(m[2]) <= 14 * 60;
}

/** The UTC offset written at the end of an ISO string, as "+HH:MM". */
function offsetOf(iso: string): string | null {
  const m = /(?:Z|([+-]\d{2}):?(\d{2}))$/i.exec(iso.trim());
  if (!m) return null;
  const offset = m[1] ? `${m[1]}:${m[2]}` : "+00:00";
  return isFixedOffset(offset) ? offset : null;
}

/**
 * The zone picker's options. When the form was filled in from a saved leg
 * with an offset no listed zone matches, that offset is offered first, so
 * saving without changes keeps the flight's time.
 */
export function timeZoneOptions(initialZone = ""): TimeZoneChoice[] {
  if (!isFixedOffset(initialZone)) return [...ENTRY_TIME_ZONES];
  return [{ id: initialZone, label: `UTC${initialZone.replace("-", "−")} (as saved)` }, ...ENTRY_TIME_ZONES];
}

/** The airport's own zone when we know it, else the zone the guest picked. */
function resolveZone(code: string, picked: string): string | null {
  const pickedOk = isFixedOffset(picked) || ENTRY_TIME_ZONES.some((z) => z.id === picked);
  return airportTimeZone(code) ?? (pickedOk ? picked : null);
}

// ─── Manual entry ─────────────────────────────────────────────────────────────

/** The manual-entry form. Dates and times are local at each airport. */
export interface ManualLegInput {
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  /** Only used when the origin isn't a known airport: a TimeZoneChoice id. */
  originZone: string;
  /** Only used when the destination isn't a known airport. */
  destinationZone: string;
  departDate: string; // "YYYY-MM-DD"
  departTime: string; // "HH:MM", 24h, from <input type="time">
  arriveDate: string;
  arriveTime: string;
}

export type ManualLegField = keyof ManualLegInput;
export type ManualLegErrors = Partial<Record<ManualLegField, string>>;
export type ManualLegResult =
  | { ok: true; leg: FlightLeg }
  | { ok: false; errors: ManualLegErrors };

/** Blank form; inbound flights land at PHX, flights home leave from it. */
export function emptyManualInput(direction: LegDirection, date: string): ManualLegInput {
  return {
    airline: "",
    flightNumber: "",
    origin: direction === "out" ? DESTINATION_AIRPORT : "",
    destination: direction === "in" ? DESTINATION_AIRPORT : "",
    originZone: "",
    destinationZone: "",
    departDate: date,
    departTime: "",
    arriveDate: date,
    arriveTime: "",
  };
}

/** Pre-fills the form from a saved leg, using the wall times written in it. */
export function manualInputFromLeg(leg: FlightLeg): ManualLegInput {
  return {
    airline: leg.airline,
    flightNumber: leg.flightNumber,
    origin: leg.origin,
    destination: leg.destination,
    originZone: airportTimeZone(leg.origin) ? "" : zoneMatching(leg.departsAt),
    destinationZone: airportTimeZone(leg.destination) ? "" : zoneMatching(leg.arrivesAt),
    departDate: wallDate(leg.departsAt),
    departTime: wallClock24(leg.departsAt),
    arriveDate: wallDate(leg.arrivesAt),
    arriveTime: wallClock24(leg.arrivesAt),
  };
}

function wallClock24(iso: string): string {
  const w = parseWallTime(iso);
  return w ? `${pad(w.hour)}:${pad(w.minute)}` : "";
}

/**
 * The zone to pre-fill for an airport we don't know: the first listed zone
 * that puts this wall time at the same instant, else the time's own UTC
 * offset. Either way, saving the form unchanged keeps the exact time.
 */
function zoneMatching(iso: string): string {
  const target = toInstant(iso, TRIP_TIME_ZONE).getTime();
  const wall = stripUtcOffset(iso);
  const match = ENTRY_TIME_ZONES.find((z) => {
    const candidate = zonedWallTimeToIso(wall, z.id);
    return candidate !== null && toInstant(candidate, TRIP_TIME_ZONE).getTime() === target;
  });
  return match?.id ?? offsetOf(iso) ?? "";
}

function isCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// No single flight is in the air this long; it's almost always a date typo.
const MAX_FLIGHT_MINUTES = 24 * 60;

function zonedIso(date: string, time: string, zone: string): string | null {
  if (isFixedOffset(zone)) {
    const w = parseWallTime(`${date}T${time}`);
    return w ? `${date}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}${zone}` : null;
  }
  try {
    return zonedWallTimeToIso(`${date}T${time}`, zone);
  } catch {
    return null; // unknown zone name
  }
}

/**
 * Checks the manual-entry form and builds a leg whose times carry each
 * airport's UTC offset. Arrival-after-departure compares real instants, so a
 * 10:00 AM JFK departure landing at 12:30 PM in PHX is fine.
 */
export function validateManualLeg(input: ManualLegInput): ManualLegResult {
  const errors: ManualLegErrors = {};

  const flightNumber = normalizeFlightNumber(input.flightNumber);
  if (!input.flightNumber.trim()) errors.flightNumber = "Enter the flight number.";
  else if (!flightNumber) errors.flightNumber = "Use a flight number like AA 1105.";

  const airline =
    input.airline.trim().replace(/\s+/g, " ") ||
    (flightNumber ? airlineFromFlightNumber(flightNumber) : null) ||
    "";
  if (!airline) errors.airline = "Enter the airline.";

  const origin = normalizeAirportCode(input.origin);
  const destination = normalizeAirportCode(input.destination);
  const originOk = isAirportCode(origin);
  const destinationOk = isAirportCode(destination);
  if (!originOk) errors.origin = "Use the 3-letter code, e.g. LAX.";
  if (!destinationOk) errors.destination = "Use the 3-letter code, e.g. PHX.";
  else if (destination === origin) errors.destination = "Must differ from the departure airport.";

  const originZone = originOk ? resolveZone(origin, input.originZone) : null;
  const destinationZone = destinationOk ? resolveZone(destination, input.destinationZone) : null;
  if (originOk && !originZone) errors.originZone = `Pick the time zone for ${origin}.`;
  if (destinationOk && !destinationZone) errors.destinationZone = `Pick the time zone for ${destination}.`;

  if (!isCalendarDate(input.departDate)) errors.departDate = "Pick the departure date.";
  if (!TIME_RE.test(input.departTime)) errors.departTime = "Pick the departure time.";
  if (!isCalendarDate(input.arriveDate)) errors.arriveDate = "Pick the arrival date.";
  if (!TIME_RE.test(input.arriveTime)) errors.arriveTime = "Pick the arrival time.";

  let departsAt: string | null = null;
  if (originZone && !errors.departDate && !errors.departTime) {
    departsAt = zonedIso(input.departDate, input.departTime, originZone);
    if (!departsAt) errors.departTime = "Check the departure time.";
  }
  let arrivesAt: string | null = null;
  if (destinationZone && !errors.arriveDate && !errors.arriveTime) {
    arrivesAt = zonedIso(input.arriveDate, input.arriveTime, destinationZone);
    if (!arrivesAt) errors.arriveTime = "Check the arrival time.";
  }

  if (departsAt && arrivesAt) {
    const minutes =
      (toInstant(arrivesAt, TRIP_TIME_ZONE).getTime() - toInstant(departsAt, TRIP_TIME_ZONE).getTime()) /
      60_000;
    if (minutes <= 0) errors.arriveTime = "Arrival must be after departure (local time at each airport).";
    else if (minutes > MAX_FLIGHT_MINUTES) errors.arriveDate = "That's over 24 hours in the air. Check the dates.";
  }

  if (Object.keys(errors).length > 0 || !flightNumber || !departsAt || !arrivesAt) {
    return { ok: false, errors };
  }
  return { ok: true, leg: { flightNumber, airline, origin, destination, departsAt, arrivesAt } };
}

// ─── Legs ─────────────────────────────────────────────────────────────────────

/** Just the FlightLeg fields (drops ids and names from tracker records). */
export function toFlightLeg(leg: FlightLeg): FlightLeg {
  return {
    flightNumber: leg.flightNumber,
    airline: leg.airline,
    origin: leg.origin,
    destination: leg.destination,
    departsAt: leg.departsAt,
    arrivesAt: leg.arrivesAt,
  };
}

export function sameLeg(a: FlightLeg | null, b: FlightLeg | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.flightNumber === b.flightNumber &&
    a.airline === b.airline &&
    a.origin === b.origin &&
    a.destination === b.destination &&
    a.departsAt === b.departsAt &&
    a.arrivesAt === b.arrivesAt
  );
}

export function sameTravel(a: MyTravel, b: MyTravel): boolean {
  return a.driving === b.driving && sameLeg(a.inbound, b.inbound) && sameLeg(a.outbound, b.outbound);
}

/** The airport that isn't PHX where it should be: an inbound leg's arrival, or a flight home's departure. */
export function offRouteAirport(direction: LegDirection, leg: FlightLeg): string | null {
  const code = direction === "in" ? leg.destination : leg.origin;
  return code === DESTINATION_AIRPORT ? null : code;
}

/** "Thu, Apr 8" for a "YYYY-MM-DD" date, without any time zone shift. */
export function shortDateLabel(date: string): string {
  return formatCalendarDate(date, { weekday: "short", month: "short", day: "numeric" });
}

/** The departure's local date, e.g. "Thu, Apr 8". */
export function legDateLabel(leg: FlightLeg): string {
  return shortDateLabel(wallDate(leg.departsAt));
}

/** Days between the departure's and arrival's local dates (+1 for a red-eye). */
export function arrivalDayOffset(leg: FlightLeg): number {
  return daysBetweenLocalDates(leg.departsAt, leg.arrivesAt);
}
