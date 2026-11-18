import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { rideDebts, ridersIn, ridersOf } from "~/lib/rides";
import type { Db } from "./db";
import {
  addCar,
  autoArrange,
  bookCar,
  createRide,
  deleteRide,
  listRides,
  releaseCar,
  removeCar,
  seatRider,
  setCarKind,
  setFare,
  setSettled,
  unseatRider,
} from "./ride-store";
import * as schema from "./schema";

let db: Db;
beforeEach(async () => {
  db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
});

const crew = ["gberg", "andrew", "avery", "brett", "chris", "jerid", "kyle", "matt", "phil", "scott"];
const at = (s: number) => new Date(Date.UTC(2027, 3, 1, 12, 0, s));
const house = { name: "The House", address: "Somewhere in Scottsdale", lat: 33.5, lng: -111.9 };
const newRide = { destination: house, day: "2027-04-08", time: "15:00" };

/** A ride with one XL and one Standard, all ten seated. */
async function fullRun() {
  const ride = await createRide(db, "gberg", newRide, at(0));
  await setCarKind(db, ride.id, ride.cars[0].id, "xl");
  const withTwo = await addCar(db, ride.id, "standard", at(1));
  const [xl, std] = withTwo.cars;
  for (let i = 0; i < 6; i++) await seatRider(db, ride.id, crew[i], xl.id, i, at(i + 2));
  for (let i = 0; i < 4; i++) await seatRider(db, ride.id, crew[6 + i], std.id, i, at(i + 8));
  return { rideId: ride.id, xl: xl.id, std: std.id };
}

describe("ride store", () => {
  it("creates a ride with one empty Standard car", async () => {
    const ride = await createRide(db, "kyle", { ...newRide, note: "  dinner  " });
    expect(ride).toMatchObject({ destination: house, departAt: "2027-04-08T15:00", note: "dinner" });
    expect(ride.cars).toHaveLength(1);
    expect(ride.cars[0]).toMatchObject({ kind: "standard", seats: [null, null, null, null], booking: null });
  });

  it("takes a ride with no time, and lists those first", async () => {
    await createRide(db, "kyle", newRide, at(0));
    const whenever = await createRide(db, "kyle", { destination: { ...house, name: "Old Town" } }, at(1));
    expect(whenever.departAt).toBeNull();
    expect((await listRides(db)).map((r) => r.destination.name)).toEqual(["Old Town", "The House"]);
  });

  it("rejects bad rides", async () => {
    await expect(createRide(db, "kyle", { destination: null })).rejects.toThrow("Pick where");
    await expect(createRide(db, "kyle", { destination: { name: "x", lat: "a", lng: 1 } })).rejects.toThrow("Pick where");
    await expect(createRide(db, "kyle", { ...newRide, day: "2027-05-01" })).rejects.toThrow("day of the trip");
    await expect(createRide(db, "kyle", { ...newRide, time: "25:00" })).rejects.toThrow("Pick a time");
    await expect(createRide(db, "kyle", { destination: house, time: "15:00" })).rejects.toThrow("Pick a day");
    await expect(createRide(db, "kyle", { destination: house, note: "x".repeat(121) })).rejects.toThrow("under 120");
  });

  it("seats people, moves them, and swaps them", async () => {
    const ride = await createRide(db, "gberg", newRide);
    const car = ride.cars[0].id;
    let r = await seatRider(db, ride.id, "kyle", car, 0);
    expect(r.cars[0].seats).toEqual(["kyle", null, null, null]);
    // Same person again: they move, they're not in two seats.
    r = await seatRider(db, ride.id, "kyle", car, 2);
    expect(r.cars[0].seats).toEqual([null, null, "kyle", null]);
    // Someone else into Kyle's seat with no seat of their own: Kyle's out.
    r = await seatRider(db, ride.id, "matt", car, 2);
    expect(r.cars[0].seats).toEqual([null, null, "matt", null]);
    // Two seated people swap.
    r = await seatRider(db, ride.id, "kyle", car, 0);
    r = await seatRider(db, ride.id, "kyle", car, 2);
    expect(r.cars[0].seats).toEqual(["matt", null, "kyle", null]);
    r = await unseatRider(db, ride.id, "matt");
    expect(r.cars[0].seats).toEqual([null, null, "kyle", null]);
    await expect(seatRider(db, ride.id, "nobody", car, 0)).rejects.toThrow("not someone on the trip");
    await expect(seatRider(db, ride.id, "kyle", car, 4)).rejects.toThrow("isn't in this car");
  });

  it("swaps across cars too", async () => {
    const { rideId, xl, std } = await fullRun();
    let [ride] = await listRides(db);
    const inXl = ride.cars[0].seats[1]!;
    const inStd = ride.cars[1].seats[3]!;
    ride = await seatRider(db, rideId, inXl, std, 3);
    expect(ride.cars[1].seats[3]).toBe(inXl);
    expect(ride.cars[0].seats[1]).toBe(inStd);
    expect(ridersOf(ride)).toHaveLength(10);
    expect(ride.cars.map((c) => c.id)).toEqual([xl, std]);
  });

  it("downsizing an XL to a Standard kicks out seats 5 and 6", async () => {
    const { rideId, xl } = await fullRun();
    const ride = await setCarKind(db, rideId, xl, "standard");
    expect(ride.cars[0].kind).toBe("standard");
    expect(ride.cars[0].seats).toEqual(crew.slice(0, 4));
    expect(ridersOf(ride)).toHaveLength(8);
    // Going back up doesn't bring them back.
    expect((await setCarKind(db, rideId, xl, "xl")).cars[0].seats).toEqual([...crew.slice(0, 4), null, null]);
  });

  it("removes a car and frees its riders", async () => {
    const { rideId, std } = await fullRun();
    const ride = await removeCar(db, rideId, std);
    expect(ride.cars).toHaveLength(1);
    expect(ridersOf(ride)).toHaveLength(6);
  });

  it("auto-arranges the unbooked cars into the cheapest mix", async () => {
    const ride = await createRide(db, "gberg", newRide);
    const car = ride.cars[0].id;
    await expect(autoArrange(db, ride.id)).rejects.toThrow("Put people in seats first");
    // Three people in one Standard plus an empty XL: auto-arrange gives one Standard.
    for (let i = 0; i < 3; i++) await seatRider(db, ride.id, crew[i], car, i);
    await addCar(db, ride.id, "xl");
    let r = await autoArrange(db, ride.id);
    expect(r.cars.map((c) => c.kind)).toEqual(["standard"]);
    expect(ridersIn(r.cars[0])).toEqual(crew.slice(0, 3));
    // Ten people spread over three Standards: becomes an XL and a Standard.
    const three = await createRide(db, "gberg", newRide);
    await addCar(db, three.id, "standard");
    const { cars } = await addCar(db, three.id, "standard");
    const spread = [cars[0], cars[0], cars[0], cars[0], cars[1], cars[1], cars[1], cars[1], cars[2], cars[2]];
    for (let i = 0; i < 10; i++) await seatRider(db, three.id, crew[i], spread[i].id, i % 4);
    expect(cars.map((c) => c.kind)).toEqual(["standard", "standard", "standard"]);
    r = await autoArrange(db, three.id);
    expect(r.cars.map((c) => c.kind)).toEqual(["xl", "standard"]);
    expect(r.cars.map((c) => ridersIn(c).length)).toEqual([6, 4]);
    expect(new Set(ridersOf(r)).size).toBe(10);
    expect(r.cars.some((c) => cars.some((old) => old.id === c.id))).toBe(false);
  });

  it("works on an in-memory transaction the way it will on Turso", async () => {
    // A change that fails midway leaves nothing behind: the ride is as it was.
    const ride = await createRide(db, "gberg", newRide);
    await expect(seatRider(db, ride.id, "kyle", ride.cars[0].id, 9)).rejects.toThrow("isn't in this car");
    expect((await listRides(db))[0].cars[0].seats).toEqual([null, null, null, null]);
  });

  it("locks a booked car, keeps others open, and tracks paying back", async () => {
    const { rideId, xl, std } = await fullRun();
    let [ride] = await listRides(db);
    const stdRiders = ridersIn(ride.cars[1]);
    const booker = stdRiders[0];
    ride = await bookCar(db, booker, rideId, std, "lyft");
    expect(ride.cars[1].booking).toMatchObject({ bookerId: booker, provider: "lyft", riders: stdRiders });

    // The booked car is fixed; the other car still changes.
    await expect(seatRider(db, rideId, "gberg", std, 1)).rejects.toThrow("booked");
    await expect(unseatRider(db, rideId, booker)).rejects.toThrow("booked");
    await expect(setCarKind(db, rideId, std, "xl")).rejects.toThrow("booked");
    await expect(removeCar(db, rideId, std)).rejects.toThrow("booked");
    await expect(unseatRider(db, rideId, "gberg")).resolves.toBeTruthy();
    await expect(bookCar(db, "gberg", rideId, std, "uber")).rejects.toThrow("already booked");
    await expect(setFare(db, stdRiders[1], rideId, std, 4000)).rejects.toThrow("Only whoever booked");

    // Auto-arrange leaves the booked car alone.
    ride = await autoArrange(db, rideId);
    expect(ride.cars.find((c) => c.id === std)?.booking?.bookerId).toBe(booker);
    expect(ride.cars.filter((c) => !c.booking).map((c) => c.kind)).toEqual(["xl"]);
    expect(ride.cars.some((c) => c.id === xl)).toBe(false);

    await setFare(db, booker, rideId, std, 4000);
    const others = stdRiders.filter((r) => r !== booker);
    await setSettled(db, others[0], rideId, std, others[0], true); // a rider marks their own share
    await expect(setSettled(db, others[0], rideId, std, others[1], true)).rejects.toThrow("Only they");

    const debts = rideDebts(await listRides(db));
    expect(debts).toHaveLength(3);
    expect(debts.every((d) => d.to === booker && d.cents === 1000)).toBe(true);
    expect(debts.filter((d) => d.settled).map((d) => d.from)).toEqual([others[0]]);

    await expect(deleteRide(db, rideId)).rejects.toThrow("give it up");
    await releaseCar(db, booker, rideId, std);
    await deleteRide(db, rideId);
    expect(await listRides(db)).toEqual([]);
  });
});
