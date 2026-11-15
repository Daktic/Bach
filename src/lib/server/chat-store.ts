import "server-only";
import { and, asc, count, desc, eq, gt, gte, lt, max, ne, sql } from "drizzle-orm";
import {
  CHAT_CATCH_UP_LIMIT,
  CHAT_PAGE_SIZE,
  isValidClientId,
  MAX_MESSAGE_LENGTH,
  normalizeMessage,
  type ChatMessage,
  type ChatPage,
} from "~/lib/chat";
import type { Db } from "./db";
import { chatMessages, chatReads } from "./schema";

// Reads and writes for the crew chat (ADR 0011). Every write is for one guest
// id, which callers take from the session, never from the browser.

/** A problem the guest can fix or should see, as opposed to a database failure. */
export class ChatError extends Error {}

/** Messages one guest may send per minute: plenty for a chat, stops a runaway loop. */
export const SEND_LIMIT_PER_MINUTE = 20;

const toMessage = (row: typeof chatMessages.$inferSelect): ChatMessage => ({
  id: row.id,
  clientId: row.clientId,
  guestId: row.guestId,
  body: row.body,
  createdAt: row.createdAt,
});

const isCursor = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;

/**
 * A page of the chat, oldest first.
 * - No cursor: the latest page.
 * - `before`: the page just older than that id (scrolling back).
 * - `after`: everything newer than that id, up to the catch-up limit (polling).
 */
export async function listMessages(db: Db, cursor: { after?: number; before?: number } = {}): Promise<ChatPage> {
  if (cursor.after !== undefined) {
    if (!isCursor(cursor.after)) throw new ChatError("Bad cursor.");
    const rows = await db
      .select()
      .from(chatMessages)
      .where(gt(chatMessages.id, cursor.after))
      .orderBy(asc(chatMessages.id))
      .limit(CHAT_CATCH_UP_LIMIT);
    return { messages: rows.map(toMessage), hasOlder: false };
  }
  if (cursor.before !== undefined && !isCursor(cursor.before)) throw new ChatError("Bad cursor.");
  // One extra row says whether anything older is left.
  const rows = await db
    .select()
    .from(chatMessages)
    .where(cursor.before !== undefined ? lt(chatMessages.id, cursor.before) : undefined)
    .orderBy(desc(chatMessages.id))
    .limit(CHAT_PAGE_SIZE + 1);
  return {
    messages: rows.slice(0, CHAT_PAGE_SIZE).reverse().map(toMessage),
    hasOlder: rows.length > CHAT_PAGE_SIZE,
  };
}

/**
 * Stores a message from `guestId`. Sending the same `clientId` again returns
 * the stored message instead of posting it twice, so a retry after a dropped
 * connection is safe.
 */
export async function sendMessage(
  db: Db,
  guestId: string,
  input: { clientId: unknown; body: unknown },
  now: Date = new Date(),
): Promise<ChatMessage> {
  if (!isValidClientId(input.clientId)) throw new ChatError("That message couldn't be sent.");
  const body = normalizeMessage(input.body);
  if (body === null) {
    throw new ChatError(
      typeof input.body === "string" && input.body.trim().length > 0
        ? `Keep it under ${MAX_MESSAGE_LENGTH.toLocaleString("en-US")} characters.`
        : "Type a message first.",
    );
  }

  const existing = await findByClientId(db, input.clientId);
  if (existing) {
    if (existing.guestId !== guestId) throw new ChatError("That message couldn't be sent.");
    return existing;
  }

  const minuteAgo = new Date(now.getTime() - 60_000).toISOString();
  const [recent] = await db
    .select({ n: count() })
    .from(chatMessages)
    .where(and(eq(chatMessages.guestId, guestId), gte(chatMessages.createdAt, minuteAgo)));
  if ((recent?.n ?? 0) >= SEND_LIMIT_PER_MINUTE) {
    throw new ChatError("That's a lot of messages at once. Wait a moment and try again.");
  }

  // Two copies of the same send racing each other: the second one is ignored
  // here and reads back the first.
  await db
    .insert(chatMessages)
    .values({ clientId: input.clientId, guestId, body, createdAt: now.toISOString() })
    .onConflictDoNothing({ target: chatMessages.clientId });
  const stored = await findByClientId(db, input.clientId);
  if (!stored || stored.guestId !== guestId) throw new ChatError("That message couldn't be sent.");
  return stored;
}

async function findByClientId(db: Db, clientId: string): Promise<ChatMessage | null> {
  const [row] = await db.select().from(chatMessages).where(eq(chatMessages.clientId, clientId));
  return row ? toMessage(row) : null;
}

/**
 * Records that `guestId` has read up to `lastId`. It never moves backwards,
 * and never past the newest message, so later messages still count as unread.
 */
export async function markRead(db: Db, guestId: string, lastId: unknown): Promise<void> {
  if (!isCursor(lastId)) throw new ChatError("Bad cursor.");
  const [newest] = await db.select({ id: max(chatMessages.id) }).from(chatMessages);
  const upTo = Math.min(lastId, newest?.id ?? 0);
  const at = new Date().toISOString();
  await db
    .insert(chatReads)
    .values({ guestId, lastReadId: upTo, updatedAt: at })
    .onConflictDoUpdate({
      target: chatReads.guestId,
      set: { lastReadId: sql`max(${chatReads.lastReadId}, excluded.last_read_id)`, updatedAt: at },
    });
}

/** Messages from other guests that `guestId` hasn't read yet. */
export async function unreadCount(db: Db, guestId: string): Promise<number> {
  const [read] = await db.select().from(chatReads).where(eq(chatReads.guestId, guestId));
  const [row] = await db
    .select({ n: count() })
    .from(chatMessages)
    .where(and(gt(chatMessages.id, read?.lastReadId ?? 0), ne(chatMessages.guestId, guestId)));
  return row?.n ?? 0;
}
