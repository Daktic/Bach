"use server";

import type { RideView } from "~/lib/rides";
import { getDb, type Db } from "~/lib/server/db";
import {
  addCar,
  autoArrange,
  bookCar,
  createRide,
  deleteRide,
  listRides,
  releaseCar,
  removeCar,
  RideError,
  seatRider,
  setCarKind,
  setFare,
  setSettled,
  unseatRider,
  type NewRide,
} from "~/lib/server/ride-store";
import { requireGuest } from "~/lib/server/session";

// Shared rides (ADR 0012). Each change returns the whole list: it's a handful
// of rides, and the page then shows everyone's latest changes too.

async function guarded(what: string, run: (db: Db) => Promise<unknown>): Promise<RideView[]> {
  try {
    const db = await getDb();
    await run(db);
    return await listRides(db);
  } catch (err) {
    if (err instanceof RideError) throw new Error(err.message);
    console.error(`[rides] ${what} failed`, err);
    throw new Error("Rides aren't reachable right now. Try again in a moment.");
  }
}

export async function getRides(): Promise<RideView[]> {
  await requireGuest();
  return guarded("list", async () => {});
}

export async function addRide(input: NewRide): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("create", (db) => createRide(db, guest.id, input ?? {}));
}

export async function removeRide(rideId: number): Promise<RideView[]> {
  await requireGuest();
  return guarded("delete", (db) => deleteRide(db, rideId));
}

// ─── Cars ────────────────────────────────────────────────────────────────────

export async function addRideCar(rideId: number, kind: string): Promise<RideView[]> {
  await requireGuest();
  return guarded("add car", (db) => addCar(db, rideId, kind));
}

export async function removeRideCar(rideId: number, carId: number): Promise<RideView[]> {
  await requireGuest();
  return guarded("remove car", (db) => removeCar(db, rideId, carId));
}

/** Standard (4 seats) or XL (6). Going down drops whoever sat in seats 5–6. */
export async function setRideCarKind(rideId: number, carId: number, kind: string): Promise<RideView[]> {
  await requireGuest();
  return guarded("car kind", (db) => setCarKind(db, rideId, carId, kind));
}

/** Re-sorts everyone in the unbooked cars into the cheapest mix of cars. */
export async function autoArrangeRide(rideId: number): Promise<RideView[]> {
  await requireGuest();
  return guarded("auto-arrange", (db) => autoArrange(db, rideId));
}

// ─── Seats ───────────────────────────────────────────────────────────────────

/** Puts anyone on the trip in a seat (moving or swapping as needed). */
export async function seatRideRider(rideId: number, guestId: string, carId: number, seat: number): Promise<RideView[]> {
  await requireGuest();
  return guarded("seat", (db) => seatRider(db, rideId, guestId, carId, seat));
}

export async function unseatRideRider(rideId: number, guestId: string): Promise<RideView[]> {
  await requireGuest();
  return guarded("unseat", (db) => unseatRider(db, rideId, guestId));
}

// ─── Booking and paying back ─────────────────────────────────────────────────

export async function bookRideCar(rideId: number, carId: number, provider: string): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("book", (db) => bookCar(db, guest.id, rideId, carId, provider));
}

export async function releaseRideCar(rideId: number, carId: number): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("release", (db) => releaseCar(db, guest.id, rideId, carId));
}

export async function setRideFare(rideId: number, carId: number, fareCents: number | null): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("fare", (db) => setFare(db, guest.id, rideId, carId, fareCents));
}

export async function setRideSettled(
  rideId: number,
  carId: number,
  riderId: string,
  settled: boolean,
): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("settle", (db) => setSettled(db, guest.id, rideId, carId, riderId, settled === true));
}
