import "server-only";
import { eq, gte } from "drizzle-orm";
import { ONLINE_WINDOW_MS } from "~/lib/presence";
import type { Db } from "./db";
import { guestPresence } from "./schema";

// Who has the app open (ADR 0011). Open pages check in every PULSE_MS while
// they're on screen; a guest seen within ONLINE_WINDOW_MS counts as online
// (both in ~/lib/presence).

/** Records that `guestId` has the app open right now. */
export async function touchPresence(db: Db, guestId: string, now: Date = new Date()): Promise<void> {
  const at = now.toISOString();
  await db
    .insert(guestPresence)
    .values({ guestId, lastSeenAt: at })
    .onConflictDoUpdate({ target: guestPresence.guestId, set: { lastSeenAt: at } });
}

/** The app went to the background: show the guest as offline straight away. */
export async function clearPresence(db: Db, guestId: string): Promise<void> {
  await db.delete(guestPresence).where(eq(guestPresence.guestId, guestId));
}

/** Guests seen within the online window. */
export async function onlineGuestIds(db: Db, now: Date = new Date()): Promise<string[]> {
  const since = new Date(now.getTime() - ONLINE_WINDOW_MS).toISOString();
  const rows = await db
    .select({ guestId: guestPresence.guestId })
    .from(guestPresence)
    .where(gte(guestPresence.lastSeenAt, since));
  return rows.map((r) => r.guestId).sort();
}
