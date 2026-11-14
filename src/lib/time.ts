import { DEPARTURE_DATE, TRIP_END_DATE, TRIP_TIME_ZONE } from "./config";
import type { DayStatus } from "./types";
import { dateInZone, toInstant } from "./zoned-time";

/**
 * "Now" for anything time-dependent.
 *
 * In dev, `?mockDate=` overrides it on the client, read as Arizona time:
 *   ?mockDate=2027-04-10          → noon on Apr 10, Arizona
 *   ?mockDate=2027-04-08T14:00    → 2 PM on Apr 8, Arizona
 */
export function getCurrentDate(): Date {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    const mocked = parseMockDate(new URLSearchParams(window.location.search).get("mockDate"));
    if (mocked) return mocked;
  }
  return new Date();
}

export function parseMockDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const value = raw.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const d = toInstant(iso, TRIP_TIME_ZONE);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Today's date ("YYYY-MM-DD") in Arizona, regardless of the viewer's zone. */
export function getTodayString(now: Date = getCurrentDate()): string {
  return dateInZone(now, TRIP_TIME_ZONE);
}

export function getDayStatus(date: string, now: Date = getCurrentDate()): DayStatus {
  const today = getTodayString(now);
  if (date < today) return "past";
  if (date === today) return "current";
  return "future";
}

export function isBeforeTrip(now: Date = getCurrentDate()): boolean {
  return now < DEPARTURE_DATE;
}

export function isTripOver(now: Date = getCurrentDate()): boolean {
  return now > TRIP_END_DATE;
}
