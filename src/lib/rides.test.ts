import { describe, expect, it } from "vitest";
import {
  arrange,
  bestPlan,
  carDebts,
  CAR_KINDS,
  describePlan,
  netBalances,
  parseFare,
  splitFare,
} from "./rides";
import { cleanDestination, lyftLink, suggestedDestinations, uberLink } from "./ride-places";

describe("CAR_KINDS", () => {
  it("draws every seat exactly once", () => {
    for (const kind of Object.values(CAR_KINDS)) {
      expect(kind.rows.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: kind.seats }, (_, i) => i));
    }
  });
});

describe("bestPlan", () => {
  it.each([
    [1, "1 Standard"],
    [4, "1 Standard"],
    [5, "1 XL"],
    [6, "1 XL"],
    [7, "2 Standard"],
    [8, "2 Standard"],
    [9, "1 XL + 1 Standard"],
    [10, "1 XL + 1 Standard"],
    // Three Standards (3.0 fares) beat 1 XL + 2 Standard (3.6) and 2 XL (3.2).
    [11, "3 Standard"],
    [12, "3 Standard"],
  ])("%i riders → %s", (n, plan) => {
    expect(describePlan(bestPlan(n))).toBe(plan);
  });

  it("has nothing for nobody", () => {
    expect(bestPlan(0)).toEqual([]);
  });
});

describe("arrange", () => {
  const riders = (n: number) => Array.from({ length: n }, (_, i) => `g${i}`);

  it("fills cars evenly by share of seats, front seats first", () => {
    const cars = arrange(["xl", "standard"], riders(10));
    expect(cars.map((c) => c.filter(Boolean).length)).toEqual([6, 4]);
    expect(cars[0][0]).toBe("g0");
    expect(arrange(["standard", "standard"], riders(7)).map((c) => c.filter(Boolean).length)).toEqual([4, 3]);
  });

  it("leaves empty seats null", () => {
    expect(arrange(["standard"], ["a"])).toEqual([["a", null, null, null]]);
  });
});

describe("fares", () => {
  it("splits to the cent, odd cents to the first riders", () => {
    expect([...splitFare(1000, ["a", "b", "c"]).values()]).toEqual([334, 333, 333]);
  });

  it("has riders owe the booker, never the booker themself", () => {
    const debts = carDebts({ rideId: 1, carId: 7, bookerId: "a", riders: ["a", "b", "c"], fareCents: 3000, settled: ["c"] });
    expect(debts).toEqual([
      { rideId: 1, carId: 7, from: "b", to: "a", cents: 1000, settled: false },
      { rideId: 1, carId: 7, from: "c", to: "a", cents: 1000, settled: true },
    ]);
  });

  it("nets unsettled debts between each pair", () => {
    const d = (from: string, to: string, cents: number, settled = false) => ({ rideId: 1, carId: 1, from, to, cents, settled });
    expect(netBalances([d("kyle", "matt", 1200), d("matt", "kyle", 500), d("phil", "matt", 900, true)])).toEqual([
      { from: "kyle", to: "matt", cents: 700 },
    ]);
  });

  it("reads typed fares", () => {
    expect(parseFare("$48.2")).toBe(4820);
    expect(parseFare("1,250")).toBe(125000);
    expect(parseFare("0")).toBeNull();
    expect(parseFare("12.345")).toBeNull();
    expect(parseFare("lots")).toBeNull();
  });
});

describe("destinations", () => {
  it("tidies what the browser sends and rejects what isn't a place", () => {
    expect(cleanDestination({ name: "  Roka   Akor ", address: " 7299 N Scottsdale Rd ", lat: 33.5444471234, lng: -111.92562 })).toEqual({
      name: "Roka Akor",
      address: "7299 N Scottsdale Rd",
      lat: 33.544447,
      lng: -111.92562,
    });
    expect(cleanDestination({ name: "No address", lat: 1, lng: 2 })).toMatchObject({ address: "" });
    expect(cleanDestination({ name: "", lat: 1, lng: 2 })).toBeNull();
    expect(cleanDestination({ name: "Mars", lat: 91, lng: 0 })).toBeNull();
    expect(cleanDestination({ name: "Text", lat: "33", lng: "-111" })).toBeNull();
    expect(cleanDestination("Roka")).toBeNull();
  });
});

describe("app links", () => {
  const roka = suggestedDestinations.find((p) => p.name === "Roka Akor")!;
  const phone = { lat: 33.5, lng: -111.9 };

  it("opens Uber from the phone's location with the drop-off filled in", () => {
    const url = new URL(uberLink(roka));
    expect(url.origin + url.pathname).toBe("https://m.uber.com/ul/");
    expect(url.searchParams.get("action")).toBe("setPickup");
    expect(url.searchParams.get("pickup")).toBe("my_location");
    expect(url.searchParams.get("dropoff[latitude]")).toBe("33.544447");
    expect(url.searchParams.get("dropoff[nickname]")).toBe("Roka Akor");
    expect(url.searchParams.get("dropoff[formatted_address]")).toBe(roka.address);
  });

  it("gives Lyft the destination only together with the phone's pickup", () => {
    const withPhone = new URL(lyftLink(roka, "xl", phone));
    expect(withPhone.searchParams.get("id")).toBe("lyft_plus");
    expect(withPhone.searchParams.get("pickup[latitude]")).toBe("33.5");
    expect(withPhone.searchParams.get("destination[longitude]")).toBe("-111.92562");
    const without = new URL(lyftLink(roka, "standard", null));
    expect(without.searchParams.get("id")).toBe("lyft");
    expect(without.searchParams.has("destination[latitude]")).toBe(false);
    expect(without.searchParams.has("pickup[latitude]")).toBe(false);
  });
});
