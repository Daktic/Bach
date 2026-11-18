import { describe, expect, it } from "vitest";
import {
  assignCars,
  bestPlan,
  carDebts,
  carOptions,
  describePlan,
  netBalances,
  parseFare,
  planFits,
  splitFare,
} from "./rides";
import { lyftLink, ridePlaces, uberLink } from "./ride-places";

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

describe("carOptions", () => {
  it("lists only mixes where every car is needed, cheapest first", () => {
    expect(carOptions(10).map(describePlan)).toEqual(["1 XL + 1 Standard", "3 Standard", "2 XL"]);
    expect(carOptions(4).map(describePlan)).toEqual(["1 Standard", "1 XL"]);
  });

  it("checks a chosen mix still fits", () => {
    expect(planFits(["xl"], 6)).toBe(true);
    expect(planFits(["xl"], 7)).toBe(false);
    expect(planFits(["xl", "standard"], 3)).toBe(false); // the Standard isn't needed
  });
});

describe("assignCars", () => {
  const riders = (n: number) => Array.from({ length: n }, (_, i) => ({ guestId: `g${i}`, car: null }));

  it("fills cars evenly by share of seats", () => {
    expect(assignCars(["xl", "standard"], riders(10)).map((c) => c.length)).toEqual([6, 4]);
    expect(assignCars(["standard", "standard"], riders(7)).map((c) => c.length)).toEqual([4, 3]);
  });

  it("keeps riders someone moved by hand, if there's room", () => {
    const cars = assignCars(["standard", "standard"], [
      { guestId: "a", car: 1 },
      { guestId: "b", car: null },
      { guestId: "c", car: 1 },
      { guestId: "d", car: 5 }, // that car's gone
    ]);
    expect(cars).toEqual([["b", "d"], ["a", "c"]]);
  });
});

describe("fares", () => {
  it("splits to the cent, odd cents to the first riders", () => {
    expect([...splitFare(1000, ["a", "b", "c"]).values()]).toEqual([334, 333, 333]);
  });

  it("has riders owe the booker, never the booker themself", () => {
    const debts = carDebts({ rideId: 1, car: 0, bookerId: "a", riders: ["a", "b", "c"], fareCents: 3000, settled: ["c"] });
    expect(debts).toEqual([
      { rideId: 1, car: 0, from: "b", to: "a", cents: 1000, settled: false },
      { rideId: 1, car: 0, from: "c", to: "a", cents: 1000, settled: true },
    ]);
  });

  it("nets unsettled debts between each pair", () => {
    const d = (from: string, to: string, cents: number, settled = false) => ({ rideId: 1, car: 0, from, to, cents, settled });
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

describe("app links", () => {
  const place = (id: string) => ridePlaces.find((p) => p.id === id)!;

  it("opens Uber with both pins", () => {
    const url = new URL(uberLink(place("phx"), place("roka")));
    expect(url.origin + url.pathname).toBe("https://m.uber.com/ul/");
    expect(url.searchParams.get("action")).toBe("setPickup");
    expect(url.searchParams.get("pickup[latitude]")).toBe("33.4343");
    expect(url.searchParams.get("dropoff[nickname]")).toBe("Roka Akor");
  });

  it("uses the phone's location when the pickup has no pin", () => {
    const url = new URL(uberLink(place("house"), place("roka")));
    expect(url.searchParams.get("pickup")).toBe("my_location");
    expect(new URL(lyftLink(place("house"), place("roka"), "standard")).searchParams.has("destination[latitude]")).toBe(false);
  });

  it("asks Lyft for XL as lyft_plus", () => {
    const url = new URL(lyftLink(place("phx"), place("roka"), "xl"));
    expect(url.searchParams.get("id")).toBe("lyft_plus");
    expect(url.searchParams.get("destination[longitude]")).toBe("-111.92562");
  });
});
