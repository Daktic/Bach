import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { TRIP_DAYS } from "~/lib/config";
import { guestIds } from "~/lib/data/guests";
import { getRidePlace } from "~/lib/ride-places";
import {
  assignCars,
  bestPlan,
  CAR_KINDS,
  carOptions,
  formatPlan,
  isRideProvider,
  MAX_FARE_CENTS,
  MAX_RIDERS,
  parsePlan,
  planFits,
  type CarKind,
  type RideProvider,
  type RideView,
} from "~/lib/rides";
import type { Db } from "./db";
import { rideBookings, rideRiders, rides } from "./schema";

// Reads and writes for shared rides (ADR 0012). There's no admin: any guest
// can add a ride, put anyone in it and sort the cars, as friends would on a
// group text. Money is different: only the guest who booked a car sets its
// fare or gives it up, and only they or the rider mark a share paid back.

/** A problem the guest should see, as opposed to a database failure. */
export class RideError extends Error {}

export const MAX_NOTE_LENGTH = 120;
/** Enough for every trip leg and then some; stops a runaway loop. */
export const MAX_RIDES = 60;

const DAYS: ReadonlySet<string> = new Set(TRIP_DAYS);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const parseIds = (json: string): string[] => {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

function buildView(
  ride: typeof rides.$inferSelect,
  riderRows: (typeof rideRiders.$inferSelect)[],
  bookingRows: (typeof rideBookings.$inferSelect)[],
): RideView {
  const riders = riderRows.map((r) => r.guestId);
  const chosen = parsePlan(ride.plan);
  const customPlan = chosen !== null && planFits(chosen, riders.length);
  const plan = customPlan ? chosen : bestPlan(riders.length);
  const assigned = assignCars(
    plan,
    riderRows.map((r) => ({ guestId: r.guestId, car: r.car })),
  );
  const bookings = new Map(bookingRows.map((b) => [b.car, b]));
  return {
    id: ride.id,
    fromId: ride.fromPlace,
    toId: ride.toPlace,
    departAt: ride.departAt,
    note: ride.note,
    createdBy: ride.createdBy,
    riders,
    plan,
    customPlan,
    options: carOptions(riders.length),
    cars: plan.map((kind, index) => {
      const b = bookings.get(index);
      return {
        index,
        kind,
        seats: CAR_KINDS[kind].seats,
        riders: assigned[index] ?? [],
        booking: b
          ? {
              bookerId: b.bookerId,
              provider: b.provider,
              riders: parseIds(b.riders),
              settled: parseIds(b.settled),
              fareCents: b.fareCents,
              bookedAt: b.bookedAt,
            }
          : null,
      };
    }),
    locked: bookingRows.length > 0,
  };
}

/** Every ride, soonest first. */
export async function listRides(db: Db): Promise<RideView[]> {
  const [rideRows, riderRows, bookingRows] = await Promise.all([
    db.select().from(rides).orderBy(asc(rides.departAt), asc(rides.id)),
    db.select().from(rideRiders).orderBy(asc(rideRiders.joinedAt), asc(rideRiders.guestId)),
    db.select().from(rideBookings),
  ]);
  return rideRows.map((ride) =>
    buildView(
      ride,
      riderRows.filter((r) => r.rideId === ride.id),
      bookingRows.filter((b) => b.rideId === ride.id),
    ),
  );
}

async function loadRide(db: Db, rideId: unknown): Promise<RideView> {
  if (typeof rideId !== "number" || !Number.isSafeInteger(rideId)) throw new RideError("That ride doesn't exist.");
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
  if (!ride) throw new RideError("That ride doesn't exist anymore.");
  const [riderRows, bookingRows] = await Promise.all([
    db
      .select()
      .from(rideRiders)
      .where(eq(rideRiders.rideId, rideId))
      .orderBy(asc(rideRiders.joinedAt), asc(rideRiders.guestId)),
    db.select().from(rideBookings).where(eq(rideBookings.rideId, rideId)),
  ]);
  return buildView(ride, riderRows, bookingRows);
}

function assertUnlocked(ride: RideView): void {
  if (ride.locked) {
    throw new RideError("A car's already booked, so the cars are set. Whoever booked it can give it up to change them.");
  }
}

function carOf(ride: RideView, car: unknown) {
  const found = typeof car === "number" ? ride.cars[car] : undefined;
  if (!found) throw new RideError("That car isn't in this ride anymore.");
  return found;
}

// ─── Rides ───────────────────────────────────────────────────────────────────

export interface NewRide {
  from: unknown;
  to: unknown;
  day: unknown;
  time: unknown;
  note?: unknown;
}

/** Adds a ride, with the guest who made it as its first rider. */
export async function createRide(db: Db, guestId: string, input: NewRide, now = new Date()): Promise<RideView> {
  const from = getRidePlace(typeof input.from === "string" ? input.from : null);
  const to = getRidePlace(typeof input.to === "string" ? input.to : null);
  if (!from || !to) throw new RideError("Pick where the ride starts and ends.");
  if (from.id === to.id) throw new RideError("The ride needs to go somewhere else.");
  if (typeof input.day !== "string" || !DAYS.has(input.day)) throw new RideError("Pick a day of the trip.");
  if (typeof input.time !== "string" || !TIME_RE.test(input.time)) throw new RideError("Pick a time.");
  let note: string | null = null;
  if (input.note !== undefined && input.note !== null) {
    if (typeof input.note !== "string") throw new RideError("That note didn't work.");
    note = input.note.replace(/\s+/g, " ").trim() || null;
    if (note && note.length > MAX_NOTE_LENGTH) throw new RideError(`Keep the note under ${MAX_NOTE_LENGTH} characters.`);
  }
  const existing = await db.$count(rides);
  if (existing >= MAX_RIDES) throw new RideError("That's a lot of rides. Remove an old one first.");

  const at = now.toISOString();
  const [row] = await db
    .insert(rides)
    .values({ fromPlace: from.id, toPlace: to.id, departAt: `${input.day}T${input.time}`, note, createdBy: guestId, createdAt: at })
    .returning({ id: rides.id });
  await db.insert(rideRiders).values({ rideId: row.id, guestId, car: null, joinedAt: at });
  return loadRide(db, row.id);
}

/** Removes a ride nobody has booked a car for. */
export async function deleteRide(db: Db, rideId: unknown): Promise<void> {
  const ride = await loadRide(db, rideId);
  if (ride.locked) throw new RideError("A car's booked for this ride. Whoever booked it has to give it up first.");
  // Children first: SQLite only cascades with foreign keys switched on.
  await db.batch([
    db.delete(rideRiders).where(eq(rideRiders.rideId, ride.id)),
    db.delete(rideBookings).where(eq(rideBookings.rideId, ride.id)),
    db.delete(rides).where(eq(rides.id, ride.id)),
  ]);
}

// ─── Who's in it ─────────────────────────────────────────────────────────────

/** Puts a guest in a ride, or takes them out. */
export async function setRider(
  db: Db,
  rideId: unknown,
  guestId: unknown,
  inRide: boolean,
  now = new Date(),
): Promise<RideView> {
  if (typeof guestId !== "string" || !guestIds.has(guestId)) throw new RideError("That's not someone on the trip.");
  const ride = await loadRide(db, rideId);
  assertUnlocked(ride);
  const already = ride.riders.includes(guestId);
  if (inRide && !already) {
    if (ride.riders.length >= MAX_RIDERS) throw new RideError("That ride's full.");
    await db
      .insert(rideRiders)
      .values({ rideId: ride.id, guestId, car: null, joinedAt: now.toISOString() })
      .onConflictDoNothing();
  } else if (!inRide && already) {
    await db.delete(rideRiders).where(and(eq(rideRiders.rideId, ride.id), eq(rideRiders.guestId, guestId)));
  }
  return loadRide(db, ride.id);
}

/** Moves a rider to another car, swapping with someone if that car is full. */
export async function moveRider(db: Db, rideId: unknown, guestId: unknown, car: unknown): Promise<RideView> {
  const ride = await loadRide(db, rideId);
  assertUnlocked(ride);
  if (typeof guestId !== "string" || !ride.riders.includes(guestId)) throw new RideError("They're not in this ride.");
  const target = carOf(ride, car);
  const from = ride.cars.findIndex((c) => c.riders.includes(guestId));
  if (from === target.index) return ride;

  // Pin everyone where they are now, so moving one person doesn't reshuffle
  // the rest. A full car trades its newest rider for the one moving in.
  const where = new Map<string, number>();
  ride.cars.forEach((c) => c.riders.forEach((r) => where.set(r, c.index)));
  where.set(guestId, target.index);
  if (target.riders.length >= target.seats) {
    const swapped = target.riders[target.riders.length - 1];
    where.set(swapped, from);
  }
  const [first, ...rest] = [...where].map(([g, c]) =>
    db.update(rideRiders).set({ car: c }).where(and(eq(rideRiders.rideId, ride.id), eq(rideRiders.guestId, g))),
  );
  await db.batch([first, ...rest]);
  return loadRide(db, ride.id);
}

/** Picks a mix of cars, or goes back to the cheapest one with null. */
export async function choosePlan(db: Db, rideId: unknown, plan: unknown): Promise<RideView> {
  const ride = await loadRide(db, rideId);
  assertUnlocked(ride);
  let stored: string | null = null;
  if (plan !== null) {
    const kinds = Array.isArray(plan) ? parsePlan(plan.join(",")) : null;
    if (!kinds || !planFits(kinds, ride.riders.length)) throw new RideError("Those cars don't fit this group.");
    const cheapest = bestPlan(ride.riders.length);
    stored = formatPlan(kinds) === formatPlan(cheapest) ? null : formatPlan(kinds);
  }
  // A new set of cars starts everyone afresh.
  await db.batch([
    db.update(rides).set({ plan: stored }).where(eq(rides.id, ride.id)),
    db.update(rideRiders).set({ car: null }).where(eq(rideRiders.rideId, ride.id)),
  ]);
  return loadRide(db, ride.id);
}

// ─── Booking and paying back ─────────────────────────────────────────────────

/** Records that `bookerId` booked a car, with whoever's in it right now. */
export async function bookCar(
  db: Db,
  bookerId: string,
  rideId: unknown,
  car: unknown,
  provider: unknown,
  now = new Date(),
): Promise<RideView> {
  if (!isRideProvider(provider)) throw new RideError("Pick Uber or Lyft.");
  const ride = await loadRide(db, rideId);
  const target = carOf(ride, car);
  if (target.booking) {
    if (target.booking.bookerId === bookerId) return ride;
    throw new RideError("Someone already booked that car.");
  }
  if (target.riders.length === 0) throw new RideError("Nobody's in that car.");
  await db
    .insert(rideBookings)
    .values({
      rideId: ride.id,
      car: target.index,
      kind: target.kind as CarKind,
      bookerId,
      provider: provider as RideProvider,
      riders: JSON.stringify(target.riders),
      settled: "[]",
      fareCents: null,
      bookedAt: now.toISOString(),
    })
    .onConflictDoNothing();
  const after = await loadRide(db, ride.id);
  if (after.cars[target.index]?.booking?.bookerId !== bookerId) throw new RideError("Someone already booked that car.");
  return after;
}

async function ownBooking(db: Db, guestId: string, rideId: unknown, car: unknown) {
  const ride = await loadRide(db, rideId);
  const target = carOf(ride, car);
  if (!target.booking) throw new RideError("That car isn't booked.");
  if (target.booking.bookerId !== guestId) throw new RideError("Only whoever booked the car can change that.");
  return { ride, target, booking: target.booking };
}

/** Gives up a booking (cancelled, or booked by mistake). Only the booker can. */
export async function releaseCar(db: Db, guestId: string, rideId: unknown, car: unknown): Promise<RideView> {
  const { ride, target } = await ownBooking(db, guestId, rideId, car);
  await db.delete(rideBookings).where(and(eq(rideBookings.rideId, ride.id), eq(rideBookings.car, target.index)));
  return loadRide(db, ride.id);
}

/** Sets what the car cost, in cents (null clears it). Only the booker can. */
export async function setFare(
  db: Db,
  guestId: string,
  rideId: unknown,
  car: unknown,
  fareCents: unknown,
): Promise<RideView> {
  if (
    fareCents !== null &&
    (typeof fareCents !== "number" || !Number.isSafeInteger(fareCents) || fareCents <= 0 || fareCents > MAX_FARE_CENTS)
  ) {
    throw new RideError("That fare doesn't look right.");
  }
  const { ride, target } = await ownBooking(db, guestId, rideId, car);
  await db
    .update(rideBookings)
    .set({ fareCents: fareCents as number | null })
    .where(and(eq(rideBookings.rideId, ride.id), eq(rideBookings.car, target.index)));
  return loadRide(db, ride.id);
}

/**
 * Marks a rider's share paid back, or not. The booker can mark anyone; a
 * rider can mark their own share (they paid on Splitwise or Venmo).
 */
export async function setSettled(
  db: Db,
  guestId: string,
  rideId: unknown,
  car: unknown,
  riderId: unknown,
  settled: boolean,
): Promise<RideView> {
  const ride = await loadRide(db, rideId);
  const target = carOf(ride, car);
  const booking = target.booking;
  if (!booking) throw new RideError("That car isn't booked.");
  if (typeof riderId !== "string" || !booking.riders.includes(riderId) || riderId === booking.bookerId) {
    throw new RideError("They don't owe anything for this car.");
  }
  if (guestId !== booking.bookerId && guestId !== riderId) {
    throw new RideError("Only they or whoever booked the car can mark that.");
  }
  const next = new Set(booking.settled);
  if (settled) next.add(riderId);
  else next.delete(riderId);
  await db
    .update(rideBookings)
    .set({ settled: JSON.stringify([...next]) })
    .where(and(eq(rideBookings.rideId, ride.id), eq(rideBookings.car, target.index)));
  return loadRide(db, ride.id);
}
