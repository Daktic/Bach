import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./db";
import { ONLINE_WINDOW_MS } from "~/lib/presence";
import { clearPresence, onlineGuestIds, touchPresence } from "./presence-store";
import * as schema from "./schema";

let db: Db;
beforeEach(async () => {
  db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
});

const t0 = new Date("2027-04-08T19:00:00Z");
const later = (ms: number) => new Date(t0.getTime() + ms);

describe("presence", () => {
  it("shows a guest online until their check-ins stop", async () => {
    await touchPresence(db, "gberg", t0);
    await touchPresence(db, "matt", t0);
    expect(await onlineGuestIds(db, later(10_000))).toEqual(["gberg", "matt"]);

    // Matt keeps checking in; Garrett's last check-in ages out of the window.
    await touchPresence(db, "matt", later(ONLINE_WINDOW_MS));
    expect(await onlineGuestIds(db, later(ONLINE_WINDOW_MS + 1))).toEqual(["matt"]);
  });

  it("drops a guest straight away when the app goes to the background", async () => {
    await touchPresence(db, "gberg", t0);
    await clearPresence(db, "gberg");
    expect(await onlineGuestIds(db, t0)).toEqual([]);
    await clearPresence(db, "nobody"); // nothing to clear is fine
  });
});
