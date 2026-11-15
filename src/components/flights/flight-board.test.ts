import { describe, expect, it } from "vitest";
import type { FlightBoard, FlightLeg, GuestFlight } from "~/lib/types";
import {
  buildFlightView,
  flightGroup,
  hasNoArrivalPlan,
  nextTravelStatus,
  resolveMyArrival,
} from "./flight-board";

const flight = (guestId: string, departsAt: string, arrivesAt: string): GuestFlight => ({
  id: `f-${guestId}`,
  guestId,
  guestName: guestId,
  flightNumber: "XX 1",
  airline: "Test Air",
  origin: "JFK",
  destination: "PHX",
  departsAt,
  arrivesAt,
});

// At 2 PM Arizona on Apr 8: chris landed, jake in the air, mike boarding,
// ryan upcoming, and the viewer (gberg) in the air.
const board: FlightBoard = {
  flights: [
    flight("ryan", "2027-04-08T21:45:00-04:00", "2027-04-08T22:30:00-07:00"),
    flight("chris", "2027-04-08T10:00:00-04:00", "2027-04-08T10:30:00-07:00"),
    flight("gberg", "2027-04-08T13:30:00-07:00", "2027-04-08T15:45:00-07:00"),
    flight("mike", "2027-04-08T16:25:00-05:00", "2027-04-08T17:10:00-07:00"),
    flight("jake", "2027-04-08T15:30:00-04:00", "2027-04-08T16:00:00-07:00"),
  ],
  noFlight: [
    { id: "tom", guestName: "Tom" },
    { id: "alex", guestName: "Alex" },
  ],
  driving: [{ id: "jordan", guestName: "Jordan" }],
};

const twoPmArizona = new Date("2027-04-08T14:00:00-07:00");
const noLocal = { inbound: [], driving: false };
const garrett = { id: "gberg", name: "Garrett" };

const localLeg: FlightLeg = {
  flightNumber: "WN 12",
  airline: "Southwest",
  origin: "DEN",
  destination: "PHX",
  departsAt: "2027-04-08T08:00:00-06:00",
  arrivesAt: "2027-04-08T08:45:00-07:00",
};

describe("resolveMyArrival", () => {
  it("uses the viewer's board flight", () => {
    const mine = resolveMyArrival(board, garrett, noLocal);
    expect(mine).toMatchObject({ kind: "flight", savedLocally: false, flight: { id: "f-gberg" } });
  });

  it("prefers the flight saved on /me over the board", () => {
    const mine = resolveMyArrival(board, garrett, { inbound: [localLeg], driving: false });
    expect(mine).toMatchObject({
      kind: "flight",
      savedLocally: true,
      flight: { flightNumber: "WN 12", guestId: "gberg", guestName: "Garrett" },
    });
  });

  it("treats a saved 'driving' as beating any flight, and flags it as saved on this device", () => {
    expect(resolveMyArrival(board, garrett, { inbound: [localLeg], driving: true })).toEqual({
      kind: "driving",
      savedLocally: true,
    });
  });

  it("uses the organiser's driving list, which everyone sees", () => {
    expect(resolveMyArrival(board, { id: "jordan", name: "Jordan" }, noLocal)).toEqual({
      kind: "driving",
      savedLocally: false,
    });
  });

  it("falls back to no flight", () => {
    expect(resolveMyArrival(board, { id: "tom", name: "Tom" }, noLocal)).toEqual({ kind: "none" });
  });
});

describe("buildFlightView", () => {
  it("groups everyone else in the air → boarding → upcoming → landed", () => {
    const view = buildFlightView(board, garrett, noLocal, twoPmArizona);
    expect(view.groups.map((g) => [g.group, g.flights.map((f) => f.guestId)])).toEqual([
      ["in_air", ["jake"]],
      ["boarding", ["mike"]],
      ["upcoming", ["ryan"]],
      ["landed", ["chris"]],
    ]);
  });

  it("keeps the viewer out of everyone else's lists", () => {
    const asTom = buildFlightView(board, { id: "tom", name: "Tom" }, noLocal, twoPmArizona);
    expect(asTom.mine).toEqual({ kind: "none" });
    expect(asTom.noFlight.map((g) => g.id)).toEqual(["alex"]);

    const asJordan = buildFlightView(board, { id: "jordan", name: "Jordan" }, noLocal, twoPmArizona);
    expect(asJordan.mine).toEqual({ kind: "driving", savedLocally: false });
    expect(asJordan.driving).toEqual([]);
  });

  it("computes the viewer's status from `now`", () => {
    const view = buildFlightView(board, garrett, noLocal, twoPmArizona);
    expect(view.mine).toMatchObject({
      kind: "flight",
      flight: { guestId: "gberg", status: "in_air", minutesUntilArrival: 105 },
    });
    const flights = view.groups.flatMap((g) => g.flights);
    expect(flights.some((f) => f.guestId === "gberg")).toBe(false);
  });

  it("hides the board flight when the viewer saved their own", () => {
    const view = buildFlightView(board, garrett, { inbound: [localLeg], driving: false }, twoPmArizona);
    expect(view.mine).toMatchObject({ kind: "flight", savedLocally: true, flight: { status: "landed" } });
    expect(view.groups.flatMap((g) => g.flights).map((f) => f.guestId)).not.toContain("gberg");
  });

  it("drops empty groups", () => {
    const beforeTrip = buildFlightView(board, garrett, noLocal, new Date("2027-03-01T12:00:00-07:00"));
    expect(beforeTrip.groups.map((g) => g.group)).toEqual(["upcoming"]);
  });
});

describe("flightGroup", () => {
  it("files delayed flights with upcoming ones", () => {
    expect(flightGroup("delayed")).toBe("upcoming");
    expect(flightGroup("in_air")).toBe("in_air");
  });
});

describe("who's here", () => {
  it("cycles home → car → plane → arrived → home", () => {
    expect(nextTravelStatus("home")).toBe("car");
    expect(nextTravelStatus("car")).toBe("plane");
    expect(nextTravelStatus("plane")).toBe("arrived");
    expect(nextTravelStatus("arrived")).toBe("home");
  });

  it("dims only guests with no inbound flight who aren't driving", () => {
    expect(hasNoArrivalPlan({ hasInboundFlight: false, arrivesBy: "fly" })).toBe(true);
    expect(hasNoArrivalPlan({ hasInboundFlight: true, arrivesBy: "fly" })).toBe(false);
    expect(hasNoArrivalPlan({ hasInboundFlight: false, arrivesBy: "drive" })).toBe(false);
  });

  it("counts the viewer's own saved travel", () => {
    const member = { hasInboundFlight: false, arrivesBy: "fly" as const };
    expect(hasNoArrivalPlan(member, { inbound: [localLeg], driving: false })).toBe(false);
    expect(hasNoArrivalPlan(member, { inbound: [], driving: true })).toBe(false);
    expect(hasNoArrivalPlan(member, { inbound: [], driving: false })).toBe(true);
  });
});

describe("trips with a connection", () => {
  const toDfw: FlightLeg = {
    flightNumber: "AA 100",
    airline: "American",
    origin: "LAX",
    destination: "DFW",
    departsAt: "2027-04-08T07:00:00-07:00",
    arrivesAt: "2027-04-08T12:00:00-05:00",
  };
  const toPhx: FlightLeg = {
    flightNumber: "AA 200",
    airline: "American",
    origin: "DFW",
    destination: "PHX",
    departsAt: "2027-04-08T14:00:00-05:00",
    arrivesAt: "2027-04-08T14:45:00-07:00",
  };
  const at = (iso: string) => buildFlightView({ flights: [], noFlight: [], driving: [] }, garrett, { inbound: [toPhx, toDfw], driving: false }, new Date(iso)).mine;

  it("follows the leg in progress, whatever order the legs were saved in", () => {
    expect(at("2027-04-08T08:00:00-07:00")).toMatchObject({
      kind: "flight",
      flight: { status: "in_air", flightNumber: "AA 100", destination: "DFW", legIndex: 0, legCount: 2, finalDestination: "PHX" },
    });
  });

  it("shows the layover between legs, then boarding and the last leg", () => {
    expect(at("2027-04-08T10:30:00-07:00")).toMatchObject({ flight: { status: "layover", layoverAt: "DFW", flightNumber: "AA 200" } });
    expect(at("2027-04-08T11:30:00-07:00")).toMatchObject({ flight: { status: "boarding", legIndex: 1 } });
    expect(at("2027-04-08T13:00:00-07:00")).toMatchObject({ flight: { status: "in_air", destination: "PHX" } });
    expect(at("2027-04-08T15:00:00-07:00")).toMatchObject({ flight: { status: "landed", legIndex: 1 } });
  });

  it("is upcoming before the first leg, and groups layovers on their own", () => {
    expect(at("2027-04-07T12:00:00-07:00")).toMatchObject({ flight: { status: "upcoming", legIndex: 0 } });
    expect(flightGroup("layover")).toBe("layover");
  });
});
