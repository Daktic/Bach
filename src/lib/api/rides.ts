"use server";

import type { RideView } from "~/lib/rides";
import { getDb, type Db } from "~/lib/server/db";
import {
  bookCar,
  choosePlan,
  createRide,
  deleteRide,
  listRides,
  moveRider,
  releaseCar,
  RideError,
  setFare,
  setRider,
  setSettled,
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

/** Puts anyone on the trip in a ride, or takes them out. */
export async function setRideRider(rideId: number, guestId: string, inRide: boolean): Promise<RideView[]> {
  await requireGuest();
  return guarded("set rider", (db) => setRider(db, rideId, guestId, inRide === true));
}

export async function moveRideRider(rideId: number, guestId: string, car: number): Promise<RideView[]> {
  await requireGuest();
  return guarded("move rider", (db) => moveRider(db, rideId, guestId, car));
}

/** A mix of cars, e.g. ["xl", "standard"], or null for the cheapest. */
export async function chooseRidePlan(rideId: number, plan: string[] | null): Promise<RideView[]> {
  await requireGuest();
  return guarded("choose plan", (db) => choosePlan(db, rideId, plan));
}

export async function bookRideCar(rideId: number, car: number, provider: string): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("book", (db) => bookCar(db, guest.id, rideId, car, provider));
}

export async function releaseRideCar(rideId: number, car: number): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("release", (db) => releaseCar(db, guest.id, rideId, car));
}

export async function setRideFare(rideId: number, car: number, fareCents: number | null): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("fare", (db) => setFare(db, guest.id, rideId, car, fareCents));
}

export async function setRideSettled(
  rideId: number,
  car: number,
  riderId: string,
  settled: boolean,
): Promise<RideView[]> {
  const { guest } = await requireGuest();
  return guarded("settle", (db) => setSettled(db, guest.id, rideId, car, riderId, settled === true));
}
