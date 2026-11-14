import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./db";
import * as schema from "./schema";
import {
  allFlights,
  allProfiles,
  allTravelPlans,
  getProfile,
  getTravel,
  saveProfile,
  saveTravel,
  setStatus,
} from "./store";

// A fresh in-memory SQLite database per test, built from the real migrations.
let db: Db;
beforeEach(async () => {
  db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
});

const jfk = {
  flightNumber: "AA 123",
  airline: "American",
  origin: "JFK",
  destination: "PHX",
  departsAt: "2027-04-08T10:00:00-04:00",
  arrivesAt: "2027-04-08T10:30:00-07:00",
};

describe("travel", () => {
  it("starts empty", async () => {
    expect(await getTravel(db, "chris")).toEqual({ inbound: null, outbound: null, driving: false });
  });

  it("saves and replaces a guest's flights and driving flag", async () => {
    await saveTravel(db, "chris", { inbound: jfk, outbound: null, driving: false });
    expect((await getTravel(db, "chris")).inbound).toEqual(jfk);

    const back = { ...jfk, flightNumber: "AA 456", origin: "PHX", destination: "JFK" };
    await saveTravel(db, "chris", { inbound: null, outbound: back, driving: true });
    expect(await getTravel(db, "chris")).toEqual({ inbound: null, outbound: back, driving: true });
  });

  it("keeps guests separate", async () => {
    await saveTravel(db, "chris", { inbound: jfk, outbound: null, driving: false });
    await saveTravel(db, "matt", { inbound: null, outbound: null, driving: true });
    expect((await getTravel(db, "matt")).inbound).toBeNull();
    expect((await allFlights(db)).map((f) => f.guestId)).toEqual(["chris"]);
    expect((await allTravelPlans(db)).get("matt")).toEqual({ driving: true, status: "home" });
  });

  it("rejects a flight without UTC offsets", async () => {
    const bad = { ...jfk, departsAt: "2027-04-08T10:00" };
    await expect(saveTravel(db, "chris", { inbound: bad, outbound: null, driving: false })).rejects.toThrow();
    expect((await getTravel(db, "chris")).inbound).toBeNull();
  });

  it("stores the Who's here status without touching the driving flag", async () => {
    await saveTravel(db, "chris", { inbound: null, outbound: null, driving: true });
    await setStatus(db, "chris", "plane");
    expect((await allTravelPlans(db)).get("chris")).toEqual({ driving: true, status: "plane" });
    await expect(setStatus(db, "chris", "teleporting" as never)).rejects.toThrow();
  });
});

describe("profiles", () => {
  const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

  it("saves a display name and photo, and clears them", async () => {
    await saveProfile(db, "gberg", { name: "  G  ", avatarDataUrl: photo });
    expect(await getProfile(db, "gberg")).toEqual({ name: "G", avatarDataUrl: photo });
    expect((await allProfiles(db)).get("gberg")?.name).toBe("G");

    await saveProfile(db, "gberg", {});
    expect(await getProfile(db, "gberg")).toEqual({ name: undefined, avatarDataUrl: undefined });
  });

  it("refuses long names and anything that isn't an image data URL", async () => {
    await expect(saveProfile(db, "gberg", { name: "x".repeat(41) })).rejects.toThrow();
    await expect(saveProfile(db, "gberg", { avatarDataUrl: "https://evil.example/x.png" })).rejects.toThrow();
    await expect(saveProfile(db, "gberg", { avatarDataUrl: "data:text/html;base64,PGgxPg==" })).rejects.toThrow();
  });
});
