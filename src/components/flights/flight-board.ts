import { enrichFlight, sortFlights } from "~/lib/flights";
import type {
  ArrivalMode,
  FlightBoard,
  FlightLeg,
  FlightStatus,
  GuestFlight,
  GuestFlightWithStatus,
  GuestWithoutFlight,
  TravelStatus,
} from "~/lib/types";

// Pure logic behind /flights and the "Who's here" bar. No browser APIs, so it
// runs with any `now` (?mockDate in dev) and is unit tested.

/** The viewer's own travel as saved on /me (MyTravel in ~/lib/client/my-travel). */
export interface LocalTravel {
  inbound: FlightLeg | null;
  driving: boolean;
}

export interface Viewer {
  id: string;
  name: string;
}

// ─── The viewer's own arrival ─────────────────────────────────────────────────

/**
 * `savedLocally`: it came from what the viewer saved on /me, which only this
 * browser knows about until flights sync (FL-2), so the card says so.
 */
export type MyArrival<F extends GuestFlight = GuestFlight> =
  | { kind: "flight"; flight: F; savedLocally: boolean }
  | { kind: "driving"; savedLocally: boolean }
  | { kind: "none" };

/**
 * How the viewer is getting there. What they saved on /me beats the board:
 * "driving instead of flying" beats any flight (FL-9), and a flight they
 * entered replaces the one on the board.
 */
export function resolveMyArrival(board: FlightBoard, viewer: Viewer, local: LocalTravel): MyArrival {
  if (local.driving) return { kind: "driving", savedLocally: true };
  if (local.inbound) {
    return {
      kind: "flight",
      savedLocally: true,
      flight: { ...local.inbound, id: `local-${viewer.id}`, guestId: viewer.id, guestName: viewer.name },
    };
  }
  const onBoard = board.flights.find((f) => f.guestId === viewer.id);
  if (onBoard) return { kind: "flight", flight: onBoard, savedLocally: false };
  if (board.driving.some((g) => g.id === viewer.id)) return { kind: "driving", savedLocally: false };
  return { kind: "none" };
}

// ─── The board as the viewer sees it ──────────────────────────────────────────

export type FlightGroup = "in_air" | "boarding" | "upcoming" | "landed";

const GROUP_ORDER: FlightGroup[] = ["in_air", "boarding", "upcoming", "landed"];

/** Delayed flights haven't left yet, so they sit with the upcoming ones. */
export function flightGroup(status: FlightStatus): FlightGroup {
  return status === "delayed" ? "upcoming" : status;
}

export interface FlightView {
  mine: MyArrival<GuestFlightWithStatus>;
  /** Everyone else's flights in FL-3 order, split into non-empty groups. */
  groups: { group: FlightGroup; flights: GuestFlightWithStatus[] }[];
  /** Everyone else who's driving in (FL-9). */
  driving: GuestWithoutFlight[];
  /** Everyone else with no flight and no plan to drive (FL-5). */
  noFlight: GuestWithoutFlight[];
}

export function buildFlightView(
  board: FlightBoard,
  viewer: Viewer,
  local: LocalTravel,
  now: Date,
): FlightView {
  const mine = resolveMyArrival(board, viewer, local);
  const others = sortFlights(
    board.flights.filter((f) => f.guestId !== viewer.id).map((f) => enrichFlight(f, now)),
  );

  return {
    mine: mine.kind === "flight" ? { ...mine, flight: enrichFlight(mine.flight, now) } : mine,
    groups: GROUP_ORDER
      .map((group) => ({ group, flights: others.filter((f) => flightGroup(f.status) === group) }))
      .filter((g) => g.flights.length > 0),
    driving: board.driving.filter((g) => g.id !== viewer.id),
    noFlight: board.noFlight.filter((g) => g.id !== viewer.id),
  };
}

// ─── "Who's here" ─────────────────────────────────────────────────────────────

export const TRAVEL_STATUS_CYCLE: readonly TravelStatus[] = ["home", "car", "plane", "arrived"];

/** home → car → plane → arrived → home. */
export function nextTravelStatus(status: TravelStatus): TravelStatus {
  const i = TRAVEL_STATUS_CYCLE.indexOf(status);
  return TRAVEL_STATUS_CYCLE[(i + 1) % TRAVEL_STATUS_CYCLE.length];
}

/**
 * True when a guest has neither an inbound flight nor a plan to drive, so the
 * bar dims them as "No flight". Pass `local` for the viewer: what they saved
 * on /me counts even before it reaches the server.
 */
export function hasNoArrivalPlan(
  member: { hasInboundFlight: boolean; arrivesBy: ArrivalMode },
  local?: LocalTravel,
): boolean {
  const flying = member.hasInboundFlight || Boolean(local?.inbound);
  const driving = member.arrivesBy === "drive" || Boolean(local?.driving);
  return !flying && !driving;
}
