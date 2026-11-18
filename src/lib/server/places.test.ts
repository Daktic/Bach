import { describe, expect, it, vi } from "vitest";
import { normalizeQuery, searchPlaces } from "./places";

const row = (over: Record<string, unknown>) => ({
  lat: "33.544447",
  lon: "-111.92562",
  display_name: "Roka Akor, 7299, North Scottsdale Road, Scottsdale, Maricopa County, Arizona, 85253, United States",
  address: {
    house_number: "7299",
    road: "North Scottsdale Road",
    city: "Scottsdale",
    county: "Maricopa County",
    state: "Arizona",
    "ISO3166-2-lvl4": "US-AZ",
    postcode: "85253",
  },
  ...over,
});

const okFetch = (rows: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(rows), { status: 200 })) as unknown as typeof fetch;

describe("place search", () => {
  it("turns Nominatim rows into a name, a short address and a pin", async () => {
    const fetchFn = okFetch([
      row({ name: "Roka Akor" }),
      row({ name: "", display_name: "7299, North Scottsdale Road, Scottsdale, Arizona", lat: "33.1", lon: "-111.1" }),
    ]);
    const places = await searchPlaces("gberg", "roka akor", fetchFn);
    expect(places[0]).toEqual({
      name: "Roka Akor",
      address: "7299 North Scottsdale Road, Scottsdale, AZ 85253",
      lat: 33.544447,
      lng: -111.92562,
    });
    // No name of its own: the street address stands in, not the bare house number.
    expect(places[1].name).toBe("7299 North Scottsdale Road");
    const url = new URL((fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string);
    expect(url.hostname).toBe("nominatim.openstreetmap.org");
    expect(url.searchParams.get("q")).toBe("roka akor");
    expect(url.searchParams.get("viewbox")).toContain("-112");
  });

  it("drops rows without a usable pin, and short queries never go out", async () => {
    const fetchFn = okFetch([row({ lat: "nope" })]);
    expect(await searchPlaces("gberg", "nowhere at all", fetchFn)).toEqual([]);
    const quiet = okFetch([]);
    expect(await searchPlaces("gberg", "ab", quiet)).toEqual([]);
    expect(quiet).not.toHaveBeenCalled();
  });

  it("answers the same query from cache", async () => {
    const fetchFn = okFetch([row({ name: "Cached" })]);
    await searchPlaces("gberg", "cached place", fetchFn);
    await searchPlaces("matt", "Cached  Place ", fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("tidies queries", () => {
    expect(normalizeQuery("  old   town ")).toBe("old town");
    expect(normalizeQuery(42)).toBe("");
    expect(normalizeQuery("x".repeat(200))).toHaveLength(100);
  });
});
