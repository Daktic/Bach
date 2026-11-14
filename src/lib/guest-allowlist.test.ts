import { describe, expect, it } from "vitest";
import { lookupGuestId, parseGuestEmails } from "./guest-allowlist";
import { safeNextPath, signInUrlFor } from "./redirects";

const ids = new Set(["gberg", "chris"]);

describe("parseGuestEmails (AUTH-3, AUTH-5)", () => {
  it("maps emails to guests, case-insensitively, with several per guest", () => {
    const list = parseGuestEmails(
      " gberg=Garrett@Example.com, gberg=g@icloud.example;\nchris=chris@example.com ",
      ids,
    );
    expect(list.problems).toEqual([]);
    expect(lookupGuestId(list, "garrett@example.com")).toBe("gberg");
    expect(lookupGuestId(list, "G@ICLOUD.EXAMPLE ")).toBe("gberg");
    expect(lookupGuestId(list, "chris@example.com")).toBe("chris");
  });

  it("rejects anyone not on the list", () => {
    const list = parseGuestEmails("gberg=garrett@example.com", ids);
    expect(lookupGuestId(list, "rando@example.com")).toBeNull();
    expect(lookupGuestId(list, "")).toBeNull();
    expect(lookupGuestId(list, null)).toBeNull();
  });

  it("is empty (nobody gets in) when unset", () => {
    expect(parseGuestEmails(undefined, ids).emailToGuest.size).toBe(0);
    expect(parseGuestEmails("", ids).emailToGuest.size).toBe(0);
  });

  it("skips unknown guests and malformed entries without logging emails", () => {
    const list = parseGuestEmails("bob=bob@example.com,garbage,chris=not-an-email", ids);
    expect(list.emailToGuest.size).toBe(0);
    expect(list.problems).toHaveLength(3);
    expect(list.problems.join(" ")).not.toContain("@");
  });

  it("never logs the email when a pair is written email-first", () => {
    const list = parseGuestEmails("garrett@example.com=gberg,chris=chris@example.com", ids);
    expect(lookupGuestId(list, "chris@example.com")).toBe("chris");
    expect(list.emailToGuest.size).toBe(1);
    expect(list.problems).toEqual(["entry 1: unknown guest id (expected guestId=email)"]);
    expect(list.problems.join(" ")).not.toContain("@");
    expect(list.problems.join(" ")).not.toContain("garrett");
  });

  it("names an unknown guest id that looks like one", () => {
    expect(parseGuestEmails("bob=bob@example.com", ids).problems).toEqual(['entry 1: unknown guest id "bob"']);
  });

  it("drops an email claimed by two guests (fails closed)", () => {
    const list = parseGuestEmails("gberg=shared@example.com,chris=shared@example.com", ids);
    expect(lookupGuestId(list, "shared@example.com")).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/flights")).toBe("/flights");
    expect(safeNextPath("/activity/fri-dinner?x=1#top")).toBe("/activity/fri-dinner?x=1#top");
    expect(safeNextPath("/a/../flights")).toBe("/flights");
    expect(safeNextPath("/./me")).toBe("/me");
  });

  it("blocks open redirects and loops", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "evil.com", "/sign-in", "/api/auth/signout", "", null]) {
      expect(safeNextPath(bad)).toBeNull();
    }
  });

  it("blocks paths that normalise to a protocol-relative URL", () => {
    for (const bad of [
      "/.//evil.com",
      "/x/..//evil.com/phish",
      "/%2e//evil.com",
      "/%2e%2e//evil.com",
      "/..//evil.com",
      "/./\\evil.com",
      "/.\t//evil.com",
      "/\t/evil.com",
    ]) {
      expect(safeNextPath(bad)).toBeNull();
    }
  });

  it("builds sign-in URLs", () => {
    expect(signInUrlFor("/")).toBe("/sign-in");
    expect(signInUrlFor("/funds/golf")).toBe("/sign-in?next=%2Ffunds%2Fgolf");
  });
});
