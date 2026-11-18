import type { RideDestination } from "~/lib/ride-places";

// Rides (ADR 0012): cars with seats the crew fills by hand, the cheapest mix
// of cars as a suggestion, and splitting the fare. Pure functions, shared by
// the server (which stores rides) and the page.

export type CarKind = "standard" | "xl";

export interface CarKindInfo {
  seats: number;
  label: string;
  /** Rough price next to a standard car, for suggesting the cheapest mix. */
  costFactor: number;
  /**
   * Seat numbers by row, front to back, as the car outline draws them. The
   * front row has the driver beside seat 0.
   */
  rows: number[][];
}

/**
 * Seats are what Uber and Lyft allow riders, not the car's size: UberX and
 * Lyft take 4, UberXL and Lyft XL take 6. XL runs about 1.6× a standard fare
 * in Phoenix, so five or six people go cheaper in one XL than in two cars.
 */
export const CAR_KINDS: Record<CarKind, CarKindInfo> = {
  standard: { seats: 4, label: "Standard", costFactor: 1, rows: [[0], [1, 2, 3]] },
  xl: { seats: 6, label: "XL", costFactor: 1.6, rows: [[0], [1, 2], [3, 4, 5]] },
};

/** Cars one ride can have: the whole crew in Standards, with room to spare. */
export const MAX_CARS = 6;

export const isCarKind = (k: unknown): k is CarKind => k === "standard" || k === "xl";
export const otherKind = (k: CarKind): CarKind => (k === "xl" ? "standard" : "xl");

export const costOf = (plan: readonly CarKind[]) =>
  Math.round(plan.reduce((sum, k) => sum + CAR_KINDS[k].costFactor, 0) * 100) / 100;

/** "1 XL + 1 Standard". */
export function describePlan(plan: readonly CarKind[]): string {
  if (plan.length === 0) return "No cars";
  const xl = plan.filter((k) => k === "xl").length;
  const std = plan.length - xl;
  return [xl && `${xl} XL`, std && `${std} Standard`].filter(Boolean).join(" + ");
}

/**
 * The cheapest mix of cars for `riders` people, XLs first. Only mixes where
 * every car is needed count; ties go to fewer cars, then fewer XLs.
 */
export function bestPlan(riders: number): CarKind[] {
  if (riders <= 0) return [];
  let best: CarKind[] | null = null;
  const maxXl = Math.ceil(riders / CAR_KINDS.xl.seats);
  for (let xl = 0; xl <= maxXl; xl++) {
    const std = Math.ceil(Math.max(0, riders - xl * CAR_KINDS.xl.seats) / CAR_KINDS.standard.seats);
    const plan: CarKind[] = [...Array<CarKind>(xl).fill("xl"), ...Array<CarKind>(std).fill("standard")];
    const seats = plan.reduce((s, k) => s + CAR_KINDS[k].seats, 0);
    if (!plan.every((k) => seats - CAR_KINDS[k].seats < riders)) continue; // a car isn't needed
    if (
      !best ||
      costOf(plan) < costOf(best) ||
      (costOf(plan) === costOf(best) && plan.length < best.length)
    ) {
      best = plan;
    }
  }
  return best ?? [];
}

/**
 * Seats `riders` in a set of cars, in order, each to the emptiest car (by
 * share of seats filled): ten in an XL and a Standard split 6 and 4.
 * Returns each car's seats, front first; null is an empty seat.
 */
export function arrange(plan: readonly CarKind[], riders: readonly string[]): (string | null)[][] {
  const cars = plan.map((k) => Array<string | null>(CAR_KINDS[k].seats).fill(null));
  const filled = plan.map(() => 0);
  for (const r of riders) {
    let best = -1;
    for (let c = 0; c < cars.length; c++) {
      if (filled[c] >= cars[c].length) continue;
      if (best < 0 || filled[c] / cars[c].length < filled[best] / cars[best].length) best = c;
    }
    if (best < 0) break;
    cars[best][filled[best]++] = r;
  }
  return cars;
}

// ─── Splitting a fare ────────────────────────────────────────────────────────

/**
 * Each rider's share of a fare in cents, in rider order. Shares differ by at
 * most a cent; the odd cents go to the first riders.
 */
export function splitFare(fareCents: number, riders: readonly string[]): Map<string, number> {
  const shares = new Map<string, number>();
  if (riders.length === 0) return shares;
  const base = Math.floor(fareCents / riders.length);
  let extra = fareCents - base * riders.length;
  for (const r of riders) {
    shares.set(r, base + (extra > 0 ? 1 : 0));
    if (extra > 0) extra--;
  }
  return shares;
}

/** One debt from a booked car: `from` owes `to` for one ride. */
export interface RideDebt {
  rideId: number;
  carId: number;
  from: string;
  to: string;
  cents: number;
  settled: boolean;
}

/** Who owes the booker what, for one booked car with a fare. The booker owes nobody. */
export function carDebts(input: {
  rideId: number;
  carId: number;
  bookerId: string;
  riders: readonly string[];
  fareCents: number | null;
  settled: readonly string[];
}): RideDebt[] {
  if (input.fareCents === null) return [];
  const shares = splitFare(input.fareCents, input.riders);
  return input.riders
    .filter((r) => r !== input.bookerId)
    .map((r) => ({
      rideId: input.rideId,
      carId: input.carId,
      from: r,
      to: input.bookerId,
      cents: shares.get(r) ?? 0,
      settled: input.settled.includes(r),
    }));
}

/**
 * Unsettled debts netted per pair of guests: if Kyle owes Matt $12 and Matt
 * owes Kyle $5, that's one line, Kyle owes Matt $7.
 */
export function netBalances(debts: readonly RideDebt[]): { from: string; to: string; cents: number }[] {
  const pair = new Map<string, number>(); // "a|b" with a < b → what a owes b (negative: b owes a)
  for (const d of debts) {
    if (d.settled || d.cents === 0 || d.from === d.to) continue;
    const [a, b] = d.from < d.to ? [d.from, d.to] : [d.to, d.from];
    const key = `${a}|${b}`;
    pair.set(key, (pair.get(key) ?? 0) + (d.from === a ? d.cents : -d.cents));
  }
  const out: { from: string; to: string; cents: number }[] = [];
  for (const [key, cents] of pair) {
    if (cents === 0) continue;
    const [a, b] = key.split("|");
    out.push(cents > 0 ? { from: a, to: b, cents } : { from: b, to: a, cents: -cents });
  }
  return out.sort((x, y) => y.cents - x.cents);
}

/** "$12.05". */
export const formatCents = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** $2,000: well past any ride in the Valley, short of a typo with extra zeros. */
export const MAX_FARE_CENTS = 200_000;

/** "12.05" or "$12.05" → 1205. Null for anything that isn't a sensible fare. */
export function parseFare(text: string): number | null {
  const m = text.trim().replace(/^\$/, "").replace(/,/g, "").match(/^(\d{1,4})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
  return cents > 0 && cents <= MAX_FARE_CENTS ? cents : null;
}

// ─── What the page gets ──────────────────────────────────────────────────────

export type RideProvider = "uber" | "lyft";
export const isRideProvider = (p: unknown): p is RideProvider => p === "uber" || p === "lyft";

export interface BookingView {
  bookerId: string;
  provider: RideProvider;
  /** Who was in the car when it was booked; the fare splits between them. */
  riders: string[];
  /** Riders who've paid the booker back. */
  settled: string[];
  fareCents: number | null;
  bookedAt: string;
}

export interface CarView {
  id: number;
  kind: CarKind;
  /** Who's in each seat, front first; null is an empty seat. */
  seats: (string | null)[];
  /** Once booked, the car's seats and size are fixed. */
  booking: BookingView | null;
}

export interface RideView {
  id: number;
  destination: RideDestination;
  /** Arizona wall time, "2027-04-08T15:00", or null for "whenever we go". */
  departAt: string | null;
  note: string | null;
  createdBy: string;
  cars: CarView[];
}

export const ridersIn = (car: CarView) => car.seats.filter((s): s is string => s !== null);
export const ridersOf = (ride: RideView) => ride.cars.flatMap(ridersIn);

/** Every debt from every booked car with a fare. */
export function rideDebts(rides: readonly RideView[]): RideDebt[] {
  return rides.flatMap((ride) =>
    ride.cars.flatMap((car) =>
      car.booking
        ? carDebts({
            rideId: ride.id,
            carId: car.id,
            bookerId: car.booking.bookerId,
            riders: car.booking.riders,
            fareCents: car.booking.fareCents,
            settled: car.booking.settled,
          })
        : [],
    ),
  );
}
