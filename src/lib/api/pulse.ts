"use server";

import { unreadCount } from "~/lib/server/chat-store";
import { getDb } from "~/lib/server/db";
import { clearPresence, onlineGuestIds, touchPresence } from "~/lib/server/presence-store";
import { requireGuest } from "~/lib/server/session";

// The app's check-in (ADR 0011), sent every 20 seconds by any open page while
// it's on screen. One request does three things: marks the signed-in guest as
// having the app open, and returns who else does (the chat's circles) and how
// many chat messages they haven't read (the nav badge).

export interface Pulse {
  /** Guest ids with the app open, the signed-in guest included. */
  online: string[];
  unreadChat: number;
}

export async function pulse(): Promise<Pulse> {
  const { guest } = await requireGuest();
  try {
    const db = await getDb();
    await touchPresence(db, guest.id);
    const [online, unreadChat] = await Promise.all([onlineGuestIds(db), unreadCount(db, guest.id)]);
    return { online, unreadChat };
  } catch (err) {
    console.error("[pulse] failed", err);
    throw new Error("Couldn't reach the server.");
  }
}

/** The app went to the background: show the guest as offline now, not in 50 seconds. */
export async function leave(): Promise<void> {
  const { guest } = await requireGuest();
  try {
    await clearPresence(await getDb(), guest.id);
  } catch (err) {
    console.error("[pulse] leave failed", err);
  }
}
