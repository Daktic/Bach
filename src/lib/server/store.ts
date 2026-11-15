import "server-only";
import { asc, eq } from "drizzle-orm";
import { cleanLeg, isValidLeg, MAX_LEGS } from "~/lib/flight-leg";
import { sortLegs } from "~/lib/flights";
import type { FlightLeg, TravelStatus } from "~/lib/types";
import type { Db } from "./db";
import { flights, guestProfiles, guestTravel } from "./schema";

// Reads and writes for what guests enter (ADR 0007). Every write is for one
// guest id, which callers take from the session, never from the browser.

/** A guest's trip: each direction's legs in departure order (connections are extra legs). */
export interface GuestTravel {
  inbound: FlightLeg[];
  outbound: FlightLeg[];
  driving: boolean;
}

export interface GuestProfile {
  name?: string;
  avatarDataUrl?: string;
}

const STATUSES: ReadonlySet<string> = new Set<TravelStatus>(["home", "car", "plane", "arrived"]);
export const isTravelStatus = (s: unknown): s is TravelStatus => typeof s === "string" && STATUSES.has(s);

const now = () => new Date().toISOString();
const toLeg = (row: typeof flights.$inferSelect): FlightLeg => ({
  flightNumber: row.flightNumber,
  airline: row.airline,
  origin: row.origin,
  destination: row.destination,
  departsAt: row.departsAt,
  arrivesAt: row.arrivesAt,
});

// ─── Travel (flights + driving) ───────────────────────────────────────────────

export async function getTravel(db: Db, guestId: string): Promise<GuestTravel> {
  const [legs, plan] = await Promise.all([
    db.select().from(flights).where(eq(flights.guestId, guestId)).orderBy(asc(flights.leg)),
    db.select().from(guestTravel).where(eq(guestTravel.guestId, guestId)),
  ]);
  return {
    inbound: legs.filter((l) => l.direction === "in").map(toLeg),
    outbound: legs.filter((l) => l.direction === "out").map(toLeg),
    driving: plan[0]?.driving ?? false,
  };
}

/** Replaces the guest's flights and driving flag. Invalid legs are rejected. */
export async function saveTravel(db: Db, guestId: string, travel: GuestTravel): Promise<GuestTravel> {
  const directions = [
    ["in", travel.inbound],
    ["out", travel.outbound],
  ] as const;
  for (const [, legs] of directions) {
    if (!Array.isArray(legs)) throw new Error("That trip isn't complete.");
    if (legs.length > MAX_LEGS) throw new Error(`Up to ${MAX_LEGS} flights each way.`);
    if (!legs.every(isValidLeg)) throw new Error("That flight isn't complete.");
  }
  const at = now();
  const rows = directions.flatMap(([direction, legs]) =>
    sortLegs(legs.map(cleanLeg)).map((leg, i) => ({ guestId, direction, leg: i, ...leg, updatedAt: at })),
  );
  await db.batch([
    db.delete(flights).where(eq(flights.guestId, guestId)),
    ...rows.map((row) => db.insert(flights).values(row)),
    db
      .insert(guestTravel)
      .values({ guestId, driving: travel.driving === true, updatedAt: at })
      .onConflictDoUpdate({ target: guestTravel.guestId, set: { driving: travel.driving === true, updatedAt: at } }),
  ]);
  return getTravel(db, guestId);
}

/** Everyone's flights, for the board. */
export async function allFlights(db: Db): Promise<{ guestId: string; direction: "in" | "out"; leg: FlightLeg }[]> {
  const rows = await db.select().from(flights).orderBy(asc(flights.guestId), asc(flights.direction), asc(flights.leg));
  return rows.map((r) => ({ guestId: r.guestId, direction: r.direction, leg: toLeg(r) }));
}

/** Everyone's driving flag and status. */
export async function allTravelPlans(db: Db): Promise<Map<string, { driving: boolean; status: TravelStatus }>> {
  const rows = await db.select().from(guestTravel);
  return new Map(rows.map((r) => [r.guestId, { driving: r.driving, status: r.status }]));
}

export async function setStatus(db: Db, guestId: string, status: TravelStatus): Promise<void> {
  if (!isTravelStatus(status)) throw new Error("Unknown status.");
  const at = now();
  await db
    .insert(guestTravel)
    .values({ guestId, status, updatedAt: at })
    .onConflictDoUpdate({ target: guestTravel.guestId, set: { status, updatedAt: at } });
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export const MAX_NAME_LENGTH = 40;
// A 256px JPEG data URL is about 20–40 KB; leave room, but refuse anything huge.
export const MAX_AVATAR_LENGTH = 300_000;
const AVATAR_PREFIX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export async function getProfile(db: Db, guestId: string): Promise<GuestProfile> {
  const [row] = await db.select().from(guestProfiles).where(eq(guestProfiles.guestId, guestId));
  return { name: row?.displayName ?? undefined, avatarDataUrl: row?.avatarDataUrl ?? undefined };
}

export async function allProfiles(db: Db): Promise<Map<string, GuestProfile>> {
  const rows = await db.select().from(guestProfiles);
  return new Map(rows.map((r) => [r.guestId, { name: r.displayName ?? undefined, avatarDataUrl: r.avatarDataUrl ?? undefined }]));
}

export async function saveProfile(db: Db, guestId: string, profile: GuestProfile): Promise<GuestProfile> {
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  if (name.length > MAX_NAME_LENGTH) throw new Error(`Keep your name under ${MAX_NAME_LENGTH} characters.`);
  const avatar = profile.avatarDataUrl;
  if (avatar !== undefined && (typeof avatar !== "string" || avatar.length > MAX_AVATAR_LENGTH || !AVATAR_PREFIX.test(avatar))) {
    throw new Error("That photo couldn't be saved. Try a smaller image.");
  }
  const values = { displayName: name || null, avatarDataUrl: avatar ?? null, updatedAt: now() };
  await db
    .insert(guestProfiles)
    .values({ guestId, ...values })
    .onConflictDoUpdate({ target: guestProfiles.guestId, set: values });
  return getProfile(db, guestId);
}
