import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { CHAT_PAGE_SIZE, normalizeMessage } from "~/lib/chat";
import { listMessages, markRead, SEND_LIMIT_PER_MINUTE, sendMessage, unreadCount } from "./chat-store";
import type { Db } from "./db";
import * as schema from "./schema";

// A fresh in-memory SQLite database per test, built from the real migrations.
let db: Db;
beforeEach(async () => {
  db = drizzle(createClient({ url: ":memory:" }), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
});

let n = 0;
const id = () => `client-${String(++n).padStart(4, "0")}`;
const at = (minute: number) => new Date(Date.UTC(2027, 3, 8, 19, minute));

describe("normalizeMessage", () => {
  it("keeps line breaks, drops control characters and extra blank lines", () => {
    expect(normalizeMessage("  hey\r\n\r\n\r\n\r\nwhat's up\u0007  ")).toBe("hey\n\nwhat's up");
    expect(normalizeMessage("tab\tstays")).toBe("tab\tstays");
  });

  it("refuses empty, oversized and non-text messages", () => {
    expect(normalizeMessage("   \n ")).toBeNull();
    expect(normalizeMessage("x".repeat(1001))).toBeNull();
    expect(normalizeMessage("x".repeat(1000))).toHaveLength(1000);
    expect(normalizeMessage(42)).toBeNull();
  });
});

describe("chat store", () => {
  it("stores a message under the sender and returns it with a server time", async () => {
    const sent = await sendMessage(db, "gberg", { clientId: id(), body: "  Landed! " }, at(0));
    expect(sent).toMatchObject({ guestId: "gberg", body: "Landed!", createdAt: "2027-04-08T19:00:00.000Z" });
    expect((await listMessages(db)).messages).toEqual([sent]);
  });

  it("doesn't post a retried send twice", async () => {
    const clientId = id();
    const first = await sendMessage(db, "gberg", { clientId, body: "once" }, at(0));
    const again = await sendMessage(db, "gberg", { clientId, body: "once" }, at(1));
    expect(again).toEqual(first);
    expect((await listMessages(db)).messages).toHaveLength(1);
    // Someone else can't claim another guest's message id.
    await expect(sendMessage(db, "matt", { clientId, body: "mine now" })).rejects.toThrow();
  });

  it("rejects bad input", async () => {
    await expect(sendMessage(db, "gberg", { clientId: id(), body: "   " })).rejects.toThrow("Type a message first.");
    await expect(sendMessage(db, "gberg", { clientId: id(), body: "x".repeat(1001) })).rejects.toThrow("1,000");
    await expect(sendMessage(db, "gberg", { clientId: "<script>", body: "hi" })).rejects.toThrow();
    await expect(sendMessage(db, "gberg", { clientId: id(), body: { text: "hi" } })).rejects.toThrow();
  });

  it("limits how fast one guest can send", async () => {
    for (let i = 0; i < SEND_LIMIT_PER_MINUTE; i++) {
      await sendMessage(db, "gberg", { clientId: id(), body: `msg ${i}` }, at(0));
    }
    await expect(sendMessage(db, "gberg", { clientId: id(), body: "one more" }, at(0))).rejects.toThrow("Wait a moment");
    // Others aren't held up, and a minute later the guest can send again.
    await expect(sendMessage(db, "matt", { clientId: id(), body: "hi" }, at(0))).resolves.toBeTruthy();
    await expect(sendMessage(db, "gberg", { clientId: id(), body: "later" }, at(2))).resolves.toBeTruthy();
  });

  it("pages back through history and catches up on new messages", async () => {
    const total = CHAT_PAGE_SIZE + 5;
    // A minute apart, so the send limit doesn't kick in.
    for (let i = 0; i < total; i++) await sendMessage(db, i % 2 ? "matt" : "gberg", { clientId: id(), body: `#${i}` }, at(i));

    const latest = await listMessages(db);
    expect(latest.messages).toHaveLength(CHAT_PAGE_SIZE);
    expect(latest.messages.at(-1)?.body).toBe(`#${total - 1}`);
    expect(latest.hasOlder).toBe(true);

    const older = await listMessages(db, { before: latest.messages[0].id });
    expect(older.messages.map((m) => m.body)).toEqual(["#0", "#1", "#2", "#3", "#4"]);
    expect(older.hasOlder).toBe(false);

    const newest = latest.messages.at(-1)!.id;
    expect((await listMessages(db, { after: newest })).messages).toEqual([]);
    const next = await sendMessage(db, "chris", { clientId: id(), body: "new" });
    expect((await listMessages(db, { after: newest })).messages).toEqual([next]);

    await expect(listMessages(db, { after: -1 })).rejects.toThrow();
    await expect(listMessages(db, { before: 1.5 })).rejects.toThrow();
  });

  it("counts other guests' unread messages, and read markers only move forward", async () => {
    const a = await sendMessage(db, "matt", { clientId: id(), body: "a" });
    await sendMessage(db, "gberg", { clientId: id(), body: "mine" });
    const c = await sendMessage(db, "chris", { clientId: id(), body: "c" });
    expect(await unreadCount(db, "gberg")).toBe(2); // not counting their own

    await markRead(db, "gberg", a.id);
    expect(await unreadCount(db, "gberg")).toBe(1);
    await markRead(db, "gberg", 0); // never backwards
    expect(await unreadCount(db, "gberg")).toBe(1);

    await markRead(db, "gberg", 1_000_000); // capped at the newest message
    expect(await unreadCount(db, "gberg")).toBe(0);
    await sendMessage(db, "matt", { clientId: id(), body: "d" });
    expect(await unreadCount(db, "gberg")).toBe(1);
    expect(c.id).toBeGreaterThan(a.id);

    await expect(markRead(db, "gberg", -5)).rejects.toThrow();
  });
});
