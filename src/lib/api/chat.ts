"use server";

import type { ChatMessage, ChatPage } from "~/lib/chat";
import { ChatError, listMessages, markRead, sendMessage } from "~/lib/server/chat-store";
import { getDb } from "~/lib/server/db";
import { requireGuest } from "~/lib/server/session";

// The crew chat (ADR 0011). Every signed-in guest can read and post; the
// sender is always the session's guest, never something the browser says.

/**
 * Runs a chat operation. Problems the guest should see (too long, too fast)
 * pass through; anything else is logged here and replaced with a plain
 * message, so database details never reach the browser.
 */
async function guarded<T>(what: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ChatError) throw new Error(err.message);
    console.error(`[chat] ${what} failed`, err);
    throw new Error("The chat isn't reachable right now. Try again in a moment.");
  }
}

/** The latest page, a page before `before`, or everything after `after`. */
export async function getChatMessages(cursor?: { after?: number; before?: number }): Promise<ChatPage> {
  await requireGuest();
  return guarded("list", async () =>
    listMessages(await getDb(), { after: cursor?.after, before: cursor?.before }),
  );
}

export async function sendChatMessage(input: { clientId: string; body: string }): Promise<ChatMessage> {
  const { guest } = await requireGuest();
  return guarded("send", async () =>
    sendMessage(await getDb(), guest.id, { clientId: input?.clientId, body: input?.body }),
  );
}

/** Marks everything up to `lastId` as read for the signed-in guest. */
export async function markChatRead(lastId: number): Promise<void> {
  const { guest } = await requireGuest();
  await guarded("mark read", async () => markRead(await getDb(), guest.id, lastId));
}
