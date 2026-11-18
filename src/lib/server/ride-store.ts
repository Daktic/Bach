import "server-only";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { TRIP_DAYS } from "~/lib/config";
import { guestIds } from "~/lib/data/guests";
import { cleanDestination } from "~/lib/ride-places";
import {
  arrange,
  bestPlan,
  CAR_KINDS,
  isCarKind,
  isRideProvider,
  MAX_CARS,
  MAX_FARE_CENTS,
  ridersIn,
  type CarView,
  type RideView,
} from "~/lib/rides";
import type { Db } from "./db";
import { rideBookings, rideCars, rideRiders, rides } from "./schema";

// Reads and writes for shared rides (ADR 0012). There's no admin: any guest
// can add a ride, add cars, and seat anyone, as friends would on a group
// text. A booked car is fixed: nobody gets in or out, and it keeps its size.
// Money is different: only the guest who booked a car sets its fare or gives
// it up, and only they or the rider mark a share paid back.
//
// Every change reads the ride and writes inside one transaction. libsql opens
// it as a write transaction, so two guests tapping at once take turns, and a
// decision ("that seat's free", "that car isn't booked") can't go stale
// between the read and the write.

/** A problem the guest should see, as opposed to a database failure. */
export class RideError extends Error {}

/** A connection to run queries on: the database, or a transaction on it. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Conn = Db | Tx;

const CLASHED = "Someone changed this ride at the same moment. Try again.";

/** Runs `run` in a transaction; a collision with another guest's change is a RideError. */
async function write<T>(db: Db, run: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.transaction(run);
  } catch (err) {
    if (err instanceof RideError) throw err;
    const message = err instanceof Error ? err.message : "";
    if (/SQLITE_BUSY|SQLITE_CONSTRAINT/.test(message)) throw new RideError(CLASHED);
    throw err;
  }
}

export const MAX_NOTE_LENGTH = 120;
/** Enough for every trip leg and then some; stops a runaway loop. */
export const MAX_RIDES = 60;

const DAYS: ReadonlySet<string> = new Set(TRIP_DAYS);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const BOOKED = "That car's booked, so it's set. Whoever booked it can give it up to change it.";

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
  carRows: (typeof rideCars.$inferSelect)[],
  riderRows: (typeof rideRiders.$inferSelect)[],
  bookingRows: (typeof rideBookings.$inferSelect)[],
): RideView {
  return {
    id: ride.id,
    destination: { name: ride.destName, address: ride.destAddress, lat: ride.destLat, lng: ride.destLng },
    departAt: ride.departAt,
    note: ride.note,
    createdBy: ride.createdBy,
    cars: carRows.map((car) => {
      const seats = Array<string | null>(CAR_KINDS[car.kind].seats).fill(null);
      for (const r of riderRows) {
        if (r.car === car.id && r.seat !== null && r.seat >= 0 && r.seat < seats.length) seats[r.seat] = r.guestId;
      }
      const b = bookingRows.find((x) => x.car === car.id);
      return {
        id: car.id,
        kind: car.kind,
        seats,
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
  };
}

/** Every ride, soonest first. */
export async function listRides(db: Db): Promise<RideView[]> {
  const [rideRows, carRows, riderRows, bookingRows] = await Promise.all([
    db.select().from(rides).orderBy(asc(rides.departAt), desc(rides.id)),
    db.select().from(rideCars).orderBy(asc(rideCars.id)),
    db.select().from(rideRiders),
    db.select().from(rideBookings),
  ]);
  return rideRows.map((ride) =>
    buildView(
      ride,
      carRows.filter((c) => c.rideId === ride.id),
      riderRows.filter((r) => r.rideId === ride.id),
      bookingRows.filter((b) => b.rideId === ride.id),
    ),
  );
}

async function loadRide(db: Conn, rideId: unknown): Promise<RideView> {
  if (typeof rideId !== "number" || !Number.isSafeInteger(rideId)) throw new RideError("That ride doesn't exist.");
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
  if (!ride) throw new RideError("That ride doesn't exist anymore.");
  // One at a time: inside a transaction the statements share a stream.
  const carRows = await db.select().from(rideCars).where(eq(rideCars.rideId, rideId)).orderBy(asc(rideCars.id));
  const riderRows = await db.select().from(rideRiders).where(eq(rideRiders.rideId, rideId));
  const bookingRows = await db.select().from(rideBookings).where(eq(rideBookings.rideId, rideId));
  return buildView(ride, carRows, riderRows, bookingRows);
}

function carOf(ride: RideView, carId: unknown): CarView {
  const car = ride.cars.find((c) => c.id === carId);
  if (!car) throw new RideError("That car isn't in this ride anymore.");
  return car;
}

function openCar(ride: RideView, carId: unknown): CarView {
  const car = carOf(ride, carId);
  if (car.booking) throw new RideError(BOOKED);
  return car;
}

// ─── Rides ───────────────────────────────────────────────────────────────────

export interface NewRide {
  destination: unknown;
  /** Both, or neither: a ride can be "whenever we go". */
  day?: unknown;
  time?: unknown;
  note?: unknown;
}

const blank = (v: unknown) => v === undefined || v === null || v === "";

/** Adds a ride with one empty Standard car to fill. */
export async function createRide(db: Db, guestId: string, input: NewRide, now = new Date()): Promise<RideView> {
  const destination = cleanDestination(input.destination);
  if (!destination) throw new RideError("Pick where the ride's going.");
  let departAt: string | null = null;
  if (!blank(input.day) || !blank(input.time)) {
    if (typeof input.day !== "string" || !DAYS.has(input.day)) throw new RideError("Pick a day of the trip, or leave the time blank.");
    if (typeof input.time !== "string" || !TIME_RE.test(input.time)) throw new RideError("Pick a time, or leave it blank.");
    departAt = `${input.day}T${input.time}`;
  }
  let note: string | null = null;
  if (!blank(input.note)) {
    if (typeof input.note !== "string") throw new RideError("That note didn't work.");
    note = input.note.replace(/\s+/g, " ").trim() || null;
    if (note && note.length > MAX_NOTE_LENGTH) throw new RideError(`Keep the note under ${MAX_NOTE_LENGTH} characters.`);
  }
  const at = now.toISOString();
  return write(db, async (tx) => {
    if ((await tx.$count(rides)) >= MAX_RIDES) throw new RideError("That's a lot of rides. Remove an old one first.");
    const [row] = await tx
      .insert(rides)
      .values({
        destName: destination.name,
        destAddress: destination.address,
        destLat: destination.lat,
        destLng: destination.lng,
        departAt,
        note,
        createdBy: guestId,
        createdAt: at,
      })
      .returning({ id: rides.id });
    await tx.insert(rideCars).values({ rideId: row.id, kind: "standard", createdAt: at });
    return loadRide(tx, row.id);
  });
}

/** Removes a ride nobody has booked a car for. */
export async function deleteRide(db: Db, rideId: unknown): Promise<void> {
  await write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    if (ride.cars.some((c) => c.booking)) {
      throw new RideError("A car's booked for this ride. Whoever booked it has to give it up first.");
    }
    // Children first: SQLite only cascades with foreign keys switched on.
    await tx.delete(rideRiders).where(eq(rideRiders.rideId, ride.id));
    await tx.delete(rideBookings).where(eq(rideBookings.rideId, ride.id));
    await tx.delete(rideCars).where(eq(rideCars.rideId, ride.id));
    await tx.delete(rides).where(eq(rides.id, ride.id));
  });
}

// ─── Cars ────────────────────────────────────────────────────────────────────

export async function addCar(db: Db, rideId: unknown, kind: unknown, now = new Date()): Promise<RideView> {
  if (!isCarKind(kind)) throw new RideError("Pick Standard or XL.");
  return write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    if (ride.cars.length >= MAX_CARS) throw new RideError(`Up to ${MAX_CARS} cars a ride.`);
    await tx.insert(rideCars).values({ rideId: ride.id, kind, createdAt: now.toISOString() });
    return loadRide(tx, ride.id);
  });
}

/** Removes an unbooked car; whoever was in it is back to not having a seat. */
export async function removeCar(db: Db, rideId: unknown, carId: unknown): Promise<RideView> {
  return write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    const car = openCar(ride, carId);
    await tx.delete(rideRiders).where(and(eq(rideRiders.rideId, ride.id), eq(rideRiders.car, car.id)));
    await tx.delete(rideCars).where(eq(rideCars.id, car.id));
    return loadRide(tx, ride.id);
  });
}

/**
 * Makes a car Standard or XL. Going down to a Standard leaves seats 5 and 6
 * behind: whoever sat there is back to not having a seat.
 */
export async function setCarKind(db: Db, rideId: unknown, carId: unknown, kind: unknown): Promise<RideView> {
  if (!isCarKind(kind)) throw new RideError("Pick Standard or XL.");
  return write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    const car = openCar(ride, carId);
    if (car.kind === kind) return ride;
    await tx.update(rideCars).set({ kind }).where(eq(rideCars.id, car.id));
    // The seats that no longer exist, whoever's in them.
    await tx
      .delete(rideRiders)
      .where(and(eq(rideRiders.car, car.id), gte(rideRiders.seat, CAR_KINDS[kind].seats)));
    return loadRide(tx, ride.id);
  });
}

/**
 * Re-sorts everyone in the unbooked cars into the cheapest mix of cars,
 * spread evenly. Booked cars stay as they are.
 */
export async function autoArrange(db: Db, rideId: unknown, now = new Date()): Promise<RideView> {
  return write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    const open = ride.cars.filter((c) => !c.booking);
    const riders = open.flatMap(ridersIn);
    if (riders.length === 0) throw new RideError("Put people in seats first.");
    const plan = bestPlan(riders.length);
    if (ride.cars.length - open.length + plan.length > MAX_CARS) throw new RideError(`Up to ${MAX_CARS} cars a ride.`);

    const at = now.toISOString();
    const openIds = open.map((c) => c.id);
    await tx.delete(rideRiders).where(inArray(rideRiders.car, openIds));
    await tx.delete(rideCars).where(inArray(rideCars.id, openIds));
    const created = await tx
      .insert(rideCars)
      .values(plan.map((kind) => ({ rideId: ride.id, kind, createdAt: at })))
      .returning({ id: rideCars.id });
    const seating = arrange(plan, riders);
    const rows = seating.flatMap((seats, c) =>
      seats.flatMap((guestId, seat) => (guestId ? [{ rideId: ride.id, guestId, car: created[c].id, seat, joinedAt: at }] : [])),
    );
    if (rows.length) await tx.insert(rideRiders).values(rows);
    return loadRide(tx, ride.id);
  });
}

// ─── Seats ───────────────────────────────────────────────────────────────────

/**
 * Puts a guest in a seat. If they were in another seat of this ride, they
 * move; if someone was in the seat, the two swap (or that person loses their
 * seat, when the guest didn't have one). Booked cars can't change.
 */
export async function seatRider(
  db: Db,
  rideId: unknown,
  guestId: unknown,
  carId: unknown,
  seat: unknown,
  now = new Date(),
): Promise<RideView> {
  if (typeof guestId !== "string" || !guestIds.has(guestId)) throw new RideError("That's not someone on the trip.");
  return write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    const car = openCar(ride, carId);
    if (typeof seat !== "number" || !Number.isInteger(seat) || seat < 0 || seat >= car.seats.length) {
      throw new RideError("That seat isn't in this car.");
    }
    const occupant = car.seats[seat];
    if (occupant === guestId) return ride;

    const fromCar = ride.cars.find((c) => c.seats.includes(guestId));
    if (fromCar?.booking) throw new RideError(BOOKED);
    const fromSeat = fromCar ? fromCar.seats.indexOf(guestId) : -1;

    const at = now.toISOString();
    const gone = [guestId, ...(occupant ? [occupant] : [])];
    const rows = [{ rideId: ride.id, guestId, car: car.id, seat, joinedAt: at }];
    if (occupant && fromCar) rows.push({ rideId: ride.id, guestId: occupant, car: fromCar.id, seat: fromSeat, joinedAt: at });
    await tx.delete(rideRiders).where(and(eq(rideRiders.rideId, ride.id), inArray(rideRiders.guestId, gone)));
    await tx.insert(rideRiders).values(rows);
    return loadRide(tx, ride.id);
  });
}

/** Takes a guest out of their seat. */
export async function unseatRider(db: Db, rideId: unknown, guestId: unknown): Promise<RideView> {
  if (typeof guestId !== "string") throw new RideError("That's not someone on the trip.");
  return write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    const car = ride.cars.find((c) => c.seats.includes(guestId));
    if (!car) return ride;
    if (car.booking) throw new RideError(BOOKED);
    await tx.delete(rideRiders).where(and(eq(rideRiders.rideId, ride.id), eq(rideRiders.guestId, guestId)));
    return loadRide(tx, ride.id);
  });
}

// ─── Booking and paying back ─────────────────────────────────────────────────

/** Records that `bookerId` booked a car, with whoever's in it right now. */
export async function bookCar(
  db: Db,
  bookerId: string,
  rideId: unknown,
  carId: unknown,
  provider: unknown,
  now = new Date(),
): Promise<RideView> {
  if (!isRideProvider(provider)) throw new RideError("Pick Uber or Lyft.");
  return write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    const car = carOf(ride, carId);
    if (car.booking) {
      if (car.booking.bookerId === bookerId) return ride;
      throw new RideError("Someone already booked that car.");
    }
    const riders = ridersIn(car);
    if (riders.length === 0) throw new RideError("Nobody's in that car yet.");
    await tx.insert(rideBookings).values({
      rideId: ride.id,
      car: car.id,
      kind: car.kind,
      bookerId,
      provider,
      riders: JSON.stringify(riders),
      settled: "[]",
      fareCents: null,
      bookedAt: now.toISOString(),
    });
    return loadRide(tx, ride.id);
  });
}

async function ownBooking(tx: Tx, guestId: string, rideId: unknown, carId: unknown) {
  const ride = await loadRide(tx, rideId);
  const car = carOf(ride, carId);
  if (!car.booking) throw new RideError("That car isn't booked.");
  if (car.booking.bookerId !== guestId) throw new RideError("Only whoever booked the car can change that.");
  return { ride, car };
}

const bookingOf = (rideId: number, carId: number) =>
  and(eq(rideBookings.rideId, rideId), eq(rideBookings.car, carId));

/** Gives up a booking (cancelled, or booked by mistake). Only the booker can. */
export async function releaseCar(db: Db, guestId: string, rideId: unknown, carId: unknown): Promise<RideView> {
  return write(db, async (tx) => {
    const { ride, car } = await ownBooking(tx, guestId, rideId, carId);
    await tx.delete(rideBookings).where(bookingOf(ride.id, car.id));
    return loadRide(tx, ride.id);
  });
}

/** Sets what the car cost, in cents (null clears it). Only the booker can. */
export async function setFare(
  db: Db,
  guestId: string,
  rideId: unknown,
  carId: unknown,
  fareCents: unknown,
): Promise<RideView> {
  if (
    fareCents !== null &&
    (typeof fareCents !== "number" || !Number.isSafeInteger(fareCents) || fareCents <= 0 || fareCents > MAX_FARE_CENTS)
  ) {
    throw new RideError("That fare doesn't look right.");
  }
  return write(db, async (tx) => {
    const { ride, car } = await ownBooking(tx, guestId, rideId, carId);
    await tx.update(rideBookings).set({ fareCents: fareCents as number | null }).where(bookingOf(ride.id, car.id));
    return loadRide(tx, ride.id);
  });
}

/**
 * Marks a rider's share paid back, or not. The booker can mark anyone; a
 * rider can mark their own share (they paid on Splitwise or Venmo).
 */
export async function setSettled(
  db: Db,
  guestId: string,
  rideId: unknown,
  carId: unknown,
  riderId: unknown,
  settled: boolean,
): Promise<RideView> {
  return write(db, async (tx) => {
    const ride = await loadRide(tx, rideId);
    const car = carOf(ride, carId);
    const booking = car.booking;
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
    await tx
      .update(rideBookings)
      .set({ settled: JSON.stringify([...next]) })
      .where(bookingOf(ride.id, car.id));
    return loadRide(tx, ride.id);
  });
}
