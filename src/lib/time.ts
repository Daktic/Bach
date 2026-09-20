import { DEPARTURE_DATE, TRIP_END_DATE } from "./config";
import type { DayStatus } from "./types";

export function getCurrentDate(): Date {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    const mock = new URLSearchParams(window.location.search).get("mockDate");
    if (mock) return new Date(`${mock}T12:00:00`);
  }
  return new Date();
}

export function getTodayString(): string {
  return getCurrentDate().toISOString().slice(0, 10);
}

export function getDayStatus(date: string): DayStatus {
  const today = getTodayString();
  if (date < today) return "past";
  if (date === today) return "current";
  return "future";
}

export function isBeforeTrip(): boolean {
  return getCurrentDate() < DEPARTURE_DATE;
}

export function isTripOver(): boolean {
  return getCurrentDate() > TRIP_END_DATE;
}
