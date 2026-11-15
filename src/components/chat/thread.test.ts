import { describe, expect, it } from "vitest";
import { isBigEmoji, layoutThread, linkSegments, spokenTime, timeLabel, type ThreadMessage } from "./thread";

const PHX = "America/Phoenix"; // UTC−7 all year
const now = new Date("2027-04-10T20:00:00Z"); // Sat Apr 10, 1:00 PM in Phoenix

let n = 0;
const msg = (guestId: string, createdAt: string, extra: Partial<ThreadMessage> = {}): ThreadMessage => {
  n++;
  return { id: n, key: `k${n}`, clientId: `k${n}`, guestId, body: `m${n}`, createdAt, state: "sent", ...extra };
};

describe("timeLabel", () => {
  it("reads like iMessage, in the viewer's time zone", () => {
    expect(timeLabel("2027-04-10T19:42:00Z", now, PHX)).toEqual({ day: "Today", time: "12:42 PM" });
    expect(timeLabel("2027-04-10T03:30:00Z", now, PHX)).toEqual({ day: "Yesterday", time: "8:30 PM" });
    expect(timeLabel("2027-04-06T16:05:00Z", now, PHX)).toEqual({ day: "Tuesday", time: "9:05 AM" });
    expect(timeLabel("2027-03-20T16:05:00Z", now, PHX)).toEqual({ day: "Sat, Mar 20", time: "9:05 AM" });
    expect(timeLabel("2026-11-14T16:05:00Z", now, PHX)).toEqual({ day: "Sat, Nov 14, 2026", time: "9:05 AM" });
    expect(spokenTime("2027-04-10T19:42:00Z", now, PHX)).toBe("Today at 12:42 PM");
  });

  it("works out 'today' in the viewer's zone, not UTC", () => {
    // 1 AM UTC on the 11th is still the 10th in Phoenix.
    expect(timeLabel("2027-04-11T01:00:00Z", new Date("2027-04-11T02:00:00Z"), PHX).day).toBe("Today");
    expect(timeLabel("2027-04-11T01:00:00Z", new Date("2027-04-11T02:00:00Z"), "America/New_York").day).toBe("Today");
    expect(timeLabel("2027-04-10T23:00:00Z", new Date("2027-04-11T05:00:00Z"), "America/New_York").day).toBe("Yesterday");
  });
});

describe("layoutThread", () => {
  it("groups a sender's quick messages into one run with a tail on the last", () => {
    const thread = [
      msg("andrew", "2027-04-10T19:00:00Z"),
      msg("andrew", "2027-04-10T19:01:00Z"),
      msg("andrew", "2027-04-10T19:02:00Z"),
      msg("gberg", "2027-04-10T19:03:00Z"),
    ];
    const l = layoutThread(thread, "gberg", now, PHX);
    expect(thread.map((m) => [l.get(m.key)?.first, l.get(m.key)?.last])).toEqual([
      [true, false],
      [false, false],
      [false, true],
      [true, true],
    ]);
    expect(l.get(thread[3].key)).toMatchObject({ mine: true, delivered: true });
    expect(l.get(thread[0].key)?.mine).toBe(false);
  });

  it("adds a time header at the start, after a long pause, and on a new day", () => {
    const thread = [
      msg("andrew", "2027-04-10T02:00:00Z"), // Apr 9, 7 PM
      msg("andrew", "2027-04-10T02:10:00Z"), // 10 minutes later: same section
      msg("andrew", "2027-04-10T02:30:00Z"), // 20 minutes later: new header, new run
      msg("matt", "2027-04-10T07:10:00Z"), // after midnight in Phoenix: new day
    ];
    const l = layoutThread(thread, "gberg", now, PHX);
    expect(thread.map((m) => l.get(m.key)?.separator)).toEqual([
      { day: "Yesterday", time: "7:00 PM" },
      null,
      { day: "Yesterday", time: "7:30 PM" },
      { day: "Today", time: "12:10 AM" },
    ]);
    // 10 minutes apart is too far to join one run, even without a header.
    expect(l.get(thread[1].key)?.first).toBe(true);
    expect(l.get(thread[2].key)?.first).toBe(true);
  });

  it("only says Delivered under the guest's own newest message once it's stored", () => {
    const sending = msg("gberg", "2027-04-10T19:05:00Z", { state: "sending" });
    let l = layoutThread([msg("gberg", "2027-04-10T19:00:00Z"), sending], "gberg", now, PHX);
    expect([...l.values()].map((r) => r.delivered)).toEqual([false, false]);
    l = layoutThread([msg("gberg", "2027-04-10T19:00:00Z"), msg("andrew", "2027-04-10T19:01:00Z")], "gberg", now, PHX);
    expect([...l.values()].some((r) => r.delivered)).toBe(false);
  });
});

describe("message text", () => {
  it("shows one to three emoji big", () => {
    expect(isBigEmoji("🌵")).toBe(true);
    expect(isBigEmoji("🍻 🍻 🍻")).toBe(true);
    expect(isBigEmoji("👍🏽")).toBe(true); // skin tone
    expect(isBigEmoji("👨‍👩‍👧")).toBe(true); // one family emoji
    expect(isBigEmoji("🇺🇸")).toBe(true); // flag
    expect(isBigEmoji("🍻🍻🍻🍻")).toBe(false);
    expect(isBigEmoji("ok 👍")).toBe(false);
    expect(isBigEmoji("123")).toBe(false);
  });

  it("splits out links, but never javascript: and the like", () => {
    expect(linkSegments("Tee times: cholla.example.com/book, ok?")).toEqual([
      { text: "Tee times: " },
      { text: "cholla.example.com/book", href: "https://cholla.example.com/book" },
      { text: ", ok?" },
    ]);
    expect(linkSegments("javascript:alert(1)")).toEqual([{ text: "javascript:alert(1)" }]);
    expect(linkSegments("no links here")).toEqual([{ text: "no links here" }]);
    expect(linkSegments("mail me@example.com")[1]).toEqual({ text: "me@example.com", href: "mailto:me@example.com" });
  });
});
