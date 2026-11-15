import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  updatedAt: updatedAt(),
});
