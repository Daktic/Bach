import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// What guests enter themselves (ADR 0007). Hand-maintained data (guests,
// pools, activities) stays in src/lib/data/ for now.
//
// After changing anything here: `pnpm db:generate` writes a migration into
// drizzle/, and `pnpm db:migrate` applies it to the database in .env.local.

const updatedAt = () => text("updated_at").notNull();

/**
 * One leg of a guest's trip, in (to PHX) or out (home). A guest's trip is all
 * their legs; connections are extra legs, numbered in departure order.
 */
export const flights = sqliteTable(
  "flights",
  {
    guestId: text("guest_id").notNull(),
    direction: text("direction", { enum: ["in", "out"] }).notNull(),
    // 0, 1, 2… in departure order within the direction.
    leg: integer("leg").notNull().default(0),
    flightNumber: text("flight_number").notNull(),
    airline: text("airline").notNull(),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    // Airport-local wall time with its UTC offset, e.g. "2027-04-08T10:00:00-04:00".
    departsAt: text("departs_at").notNull(),
    arrivesAt: text("arrives_at").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.guestId, t.direction, t.leg] })],
);

/** Driving in instead of flying (FL-9), and the "Who's here" status (FL-7, FL-8). */
export const guestTravel = sqliteTable("guest_travel", {
  guestId: text("guest_id").primaryKey(),
  driving: integer("driving", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["home", "car", "plane", "arrived"] }).notNull().default("home"),
  updatedAt: updatedAt(),
});

/** Profile edits (ME-2): a display name and a small photo, both optional. */
export const guestProfiles = sqliteTable("guest_profiles", {
  guestId: text("guest_id").primaryKey(),
  displayName: text("display_name"),
  // 256px JPEG as a data URL (about 20–40 KB).
  avatarDataUrl: text("avatar_data_url"),
  // The sign-in account's photo URL (Google), saved when the guest signs in so
  // the rest of the crew sees it too. An uploaded photo wins over it.
  accountImageUrl: text("account_image_url"),
  updatedAt: updatedAt(),
});

/**
 * The crew chat (ADR 0011). Ids only grow (AUTOINCREMENT), so "everything
 * after id N" is how phones catch up. `client_id` is made by the sender's
 * browser, so a retried send can't post the same message twice.
 */
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: text("client_id").notNull().unique(),
    guestId: text("guest_id").notNull(),
    body: text("body").notNull(),
    // Server clock, ISO 8601 UTC ("2027-04-08T21:42:05.123Z").
    createdAt: text("created_at").notNull(),
  },
  // For the send rate limit: a guest's recent messages.
  (t) => [index("chat_messages_guest_time").on(t.guestId, t.createdAt)],
);

/** How far each guest has read, for the unread badge. */
export const chatReads = sqliteTable("chat_reads", {
  guestId: text("guest_id").primaryKey(),
  lastReadId: integer("last_read_id").notNull().default(0),
  updatedAt: updatedAt(),
});

/**
 * When each guest last had the app open (ADR 0011). Every open page checks in
 * every 20 seconds while it's on screen; a guest seen in the last 50 seconds
 * shows as online in the chat. Hiding the app deletes the row.
 */
export const guestPresence = sqliteTable("guest_presence", {
  guestId: text("guest_id").primaryKey(),
  // Server clock, ISO 8601 UTC.
  lastSeenAt: text("last_seen_at").notNull(),
});
