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
  rememberAccountImage,
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
    expect(await getTravel(db, "chris")).toEqual({ inbound: [], outbound: [], driving: false });
  });

  it("saves and replaces a guest's flights and driving flag", async () => {
    await saveTravel(db, "chris", { inbound: [jfk], outbound: [], driving: false });
    expect((await getTravel(db, "chris")).inbound).toEqual([jfk]);

    const back = { ...jfk, flightNumber: "AA 456", origin: "PHX", destination: "JFK" };
    await saveTravel(db, "chris", { inbound: [], outbound: [back], driving: true });
    expect(await getTravel(db, "chris")).toEqual({ inbound: [], outbound: [back], driving: true });
  });

  it("keeps guests separate", async () => {
    await saveTravel(db, "chris", { inbound: [jfk], outbound: [], driving: false });
    await saveTravel(db, "matt", { inbound: [], outbound: [], driving: true });
    expect((await getTravel(db, "matt")).inbound).toEqual([]);
    expect((await allFlights(db)).map((f) => f.guestId)).toEqual(["chris"]);
    expect((await allTravelPlans(db)).get("matt")).toEqual({ driving: true, status: "home" });
  });

  it("rejects a flight without UTC offsets", async () => {
    const bad = { ...jfk, departsAt: "2027-04-08T10:00" };
    await expect(saveTravel(db, "chris", { inbound: [bad], outbound: [], driving: false })).rejects.toThrow();
    expect((await getTravel(db, "chris")).inbound).toEqual([]);
  });

  it("stores connections in departure order, whatever order they arrive in", async () => {
    const toOrd = { ...jfk, flightNumber: "UA 1", destination: "ORD", arrivesAt: "2027-04-08T11:30:00-05:00" };
    const toPhx = { ...jfk, flightNumber: "UA 2", origin: "ORD", departsAt: "2027-04-08T13:00:00-05:00", arrivesAt: "2027-04-08T14:45:00-07:00" };
    await saveTravel(db, "chris", { inbound: [toPhx, toOrd], outbound: [], driving: false });
    expect((await getTravel(db, "chris")).inbound.map((l) => l.flightNumber)).toEqual(["UA 1", "UA 2"]);
    expect((await allFlights(db)).map((f) => f.leg.flightNumber)).toEqual(["UA 1", "UA 2"]);
  });

  it("caps the legs each way and refuses anything that isn't a list", async () => {
    await expect(saveTravel(db, "chris", { inbound: Array(5).fill(jfk), outbound: [], driving: false })).rejects.toThrow();
    await expect(saveTravel(db, "chris", { inbound: jfk as never, outbound: [], driving: false })).rejects.toThrow();
  });

  it("stores the Who's here status without touching the driving flag", async () => {
    await saveTravel(db, "chris", { inbound: [], outbound: [], driving: true });
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

  it("keeps the account photo apart from profile edits", async () => {
    const google = "https://lh3.googleusercontent.com/a/abc=s96-c";
    await rememberAccountImage(db, "chris", google);
    await saveProfile(db, "chris", { name: "Chris W" });
    expect(await getProfile(db, "chris")).toEqual({ name: "Chris W", accountImageUrl: google });
    expect((await allProfiles(db)).get("chris")?.accountImageUrl).toBe(google);

    await rememberAccountImage(db, "chris", "javascript:alert(1)");
    expect((await getProfile(db, "chris")).accountImageUrl).toBeUndefined();
  });
});
