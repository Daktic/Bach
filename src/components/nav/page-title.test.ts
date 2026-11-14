import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NOT_FOUND_TITLE, pageTitle } from "./page-title";

describe("pageTitle", () => {
  it("names each page", () => {
    expect(pageTitle("/")).toBe("Timeline · Bach");
    expect(pageTitle("/flights")).toBe("Flights · Bach");
    expect(pageTitle("/flights/book")).toBe("Book a flight · Bach");
    expect(pageTitle("/funds")).toBe("Funds · Bach");
    expect(pageTitle("/funds/house")).toBe("Pool · Bach");
    expect(pageTitle("/activity/golf-day")).toBe("Activity · Bach");
    expect(pageTitle("/me")).toBe("Me · Bach");
    expect(pageTitle("/sign-in")).toBe("Sign in · Bach");
  });

  it("matches paths the way the router does", () => {
    expect(pageTitle("")).toBe("Timeline · Bach");
    expect(pageTitle("/funds/")).toBe("Funds · Bach");
    expect(pageTitle("//me")).toBe("Me · Bach");
    expect(pageTitle("/Flights/BOOK")).toBe("Book a flight · Bach");
    // Ids are kept as typed; any value is a page.
    expect(pageTitle("/activity/Sunset%20Hike")).toBe("Activity · Bach");
    expect(pageTitle("/funds/book")).toBe("Pool · Bach");
  });

  it("titles a path with no page as not found, like the catch-all route", () => {
    for (const path of ["/flight", "/fund", "/activity", "/me/extra", "/flights/nope", "/funds/x/y"]) {
      expect(pageTitle(path), path).toBe(NOT_FOUND_TITLE);
    }
    expect(NOT_FOUND_TITLE).toBe("Page not found · Bach");
  });

  it("has a title for every page route", () => {
    const routesDir = fileURLToPath(new URL("../../routes", import.meta.url));
    const pages = readdirSync(routesDir, { recursive: true, encoding: "utf8" })
      .map((file) => file.replaceAll("\\", "/"))
      // Page routes only: API routes are .ts, and catch-alls ([...x]) match anything.
      .filter((file) => file.endsWith(".tsx") && !file.includes("[..."));

    expect(pages).toContain("index.tsx");
    for (const file of pages) {
      const path =
        "/" +
        file
          .replace(/\.tsx$/, "")
          .replace(/(^|\/)index$/, "")
          .replace(/\[[^\]]+\]/g, "some-id");
      expect(pageTitle(path), `${file} (${path})`).not.toBe(NOT_FOUND_TITLE);
    }
  });
});
