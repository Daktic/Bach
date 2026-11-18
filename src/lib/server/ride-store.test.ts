import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { rideDebts } from "~/lib/rides";
import type { Db } from "./db";
import {
  bookCar,
  choosePlan,
  createRide,
  deleteRide,
  listRides,
  moveRider,
  releaseCar,
  setFare,
  setRider,
  setSettled,
} from "./ride-store";
import * as schema from "./schema";

let db: Db;
beforeEach(async () => {
  db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
});

const crew = ["gberg", "andrew", "avery", "brett", "chris", "jerid", "kyle", "matt", "phil", "scott"];
const at = (s: number) => new Date(Date.UTC(2027, 3, 1, 12, 0, s));

async function airportRun(riders = crew) {
  const ride = await createRide(db, riders[0], { from: "phx", to: "house", day: "2027-04-08", time: "15:00" }, at(0));
  for (const [i, g] of riders.slice(1).entries()) await setRider(db, ride.id, g, true, at(i + 1));
  return ride.id;
}

describe("ride store", () => {
  it("creates a ride with its maker in it", async () => {
    const ride = await createRide(db, "kyle", { from: "phx", to: "roka", day: "2027-04-09", time: "18:30", note: "  dinner  " });
    expect(ride).toMatchObject({ departAt: "2027-04-09T18:30", note: "dinner", riders: ["kyle"], plan: ["standard"] });
  });

  it("rejects bad rides", async () => {
    const base = { from: "phx", to: "roka", day: "2027-04-09", time: "18:30" };
    await expect(createRide(db, "kyle", { ...base, to: "phx" })).rejects.toThrow("somewhere else");
    await expect(createRide(db, "kyle", { ...base, from: "mars" })).rejects.toThrow("Pick where");
    await expect(createRide(db, "kyle", { ...base, day: "2027-05-01" })).rejects.toThrow("day of the trip");
    await expect(createRide(db, "kyle", { ...base, time: "25:00" })).rejects.toThrow("Pick a time");
  });

  it("sorts ten into an XL and a Standard, and lets people move", async () => {
    const id = await airportRun();
    let [ride] = await listRides(db);
    expect(ride.plan).toEqual(["xl", "standard"]);
    expect(ride.cars.map((c) => c.riders.length)).toEqual([6, 4]);

    // Moving someone into a full car swaps them with its newest rider.
    const mover = ride.cars[1].riders[0];
    const bumped = ride.cars[0].riders.at(-1)!;
    ride = await moveRider(db, id, mover, 0);
    expect(ride.cars[0].riders).toContain(mover);
    expect(ride.cars[1].riders).toContain(bumped);
    expect(ride.cars.map((c) => c.riders.length)).toEqual([6, 4]);
  });

  it("lets the group pick a different mix, and drops it once it stops fitting", async () => {
    const id = await airportRun(crew.slice(0, 6));
    let ride = await choosePlan(db, id, ["standard", "standard"]);
    expect(ride).toMatchObject({ plan: ["standard", "standard"], customPlan: true });
    await expect(choosePlan(db, id, ["standard"])).rejects.toThrow("don't fit");
    ride = await setRider(db, id, "kyle", true);
    ride = await setRider(db, id, "matt", true);
    ride = await setRider(db, id, "phil", true); // 9: two Standards no longer fit
    expect(ride).toMatchObject({ plan: ["xl", "standard"], customPlan: false });
  });

  it("locks the cars once one is booked, and tracks paying back", async () => {
    const id = await airportRun();
    let [ride] = await listRides(db);
    const car = ride.cars[1];
    ride = await bookCar(db, car.riders[0], id, 1, "lyft");
    const booker = car.riders[0];
    expect(ride.locked).toBe(true);
    expect(ride.cars[1].booking).toMatchObject({ bookerId: booker, provider: "lyft", riders: car.riders });

    await expect(setRider(db, id, "gberg", false)).rejects.toThrow("cars are set");
    await expect(bookCar(db, "gberg", id, 1, "uber")).rejects.toThrow("already booked");
    await expect(setFare(db, car.riders[1], id, 1, 4000)).rejects.toThrow("Only whoever booked");

    await setFare(db, booker, id, 1, 4000);
    const others = car.riders.filter((r) => r !== booker);
    await setSettled(db, others[0], id, 1, others[0], true); // a rider marks their own share
    await expect(setSettled(db, others[0], id, 1, others[1], true)).rejects.toThrow("Only they");

    const debts = rideDebts(await listRides(db));
    expect(debts).toHaveLength(3);
    expect(debts.every((d) => d.to === booker && d.cents === 1000)).toBe(true);
    expect(debts.filter((d) => d.settled).map((d) => d.from)).toEqual([others[0]]);

    await expect(deleteRide(db, id)).rejects.toThrow("give it up");
    await releaseCar(db, booker, id, 1);
    await deleteRide(db, id);
    expect(await listRides(db)).toEqual([]);
  });
});
