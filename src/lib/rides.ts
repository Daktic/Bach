// Rides (ADR 0012): sorting a group into cars, and splitting the fare.
// Pure functions, shared by the server (which stores rides) and the page.

export type CarKind = "standard" | "xl";

export interface CarKindInfo {
  seats: number;
  label: string;
  /** Rough price next to a standard car, for picking the cheapest mix. */
  costFactor: number;
}

/**
 * Seats are what Uber and Lyft allow riders, not the car's size: UberX and
 * Lyft take 4, UberXL and Lyft XL take 6. XL runs about 1.6× a standard fare
 * in Phoenix, so five or six people go cheaper in one XL than in two cars.
 */
export const CAR_KINDS: Record<CarKind, CarKindInfo> = {
  standard: { seats: 4, label: "Standard", costFactor: 1 },
  xl: { seats: 6, label: "XL", costFactor: 1.6 },
};

/** Biggest group one ride can sort (the whole crew, with room to spare). */
export const MAX_RIDERS = 24;

export const isCarKind = (k: unknown): k is CarKind => k === "standard" || k === "xl";

export const seatsIn = (plan: readonly CarKind[]) => plan.reduce((sum, k) => sum + CAR_KINDS[k].seats, 0);
export const costOf = (plan: readonly CarKind[]) =>
  Math.round(plan.reduce((sum, k) => sum + CAR_KINDS[k].costFactor, 0) * 100) / 100;

/** "1 XL + 1 Standard". */
export function describePlan(plan: readonly CarKind[]): string {
  if (plan.length === 0) return "No cars";
  const xl = plan.filter((k) => k === "xl").length;
  const std = plan.length - xl;
  return [xl && `${xl} XL`, std && `${std} Standard`].filter(Boolean).join(" + ");
}

/** XL cars first, so car 1 is the big one. */
const ordered = (xl: number, std: number): CarKind[] => [
  ...Array<CarKind>(xl).fill("xl"),
  ...Array<CarKind>(std).fill("standard"),
];

/**
 * Every sensible mix of cars for `riders` people, cheapest first. "Sensible"
 * means every car is needed: drop any one and the group no longer fits. Ties
 * go to fewer cars (the group stays together), then to fewer XLs.
 */
export function carOptions(riders: number): CarKind[][] {
  if (riders <= 0) return [];
  const options: CarKind[][] = [];
  const maxXl = Math.ceil(riders / CAR_KINDS.xl.seats);
  for (let xl = 0; xl <= maxXl; xl++) {
    const left = Math.max(0, riders - xl * CAR_KINDS.xl.seats);
    const std = Math.ceil(left / CAR_KINDS.standard.seats);
    const plan = ordered(xl, std);
    if (isTight(plan, riders)) options.push(plan);
  }
  return options.sort(
    (a, b) =>
      costOf(a) - costOf(b) ||
      a.length - b.length ||
      a.filter((k) => k === "xl").length - b.filter((k) => k === "xl").length,
  );
}

/** Fits everyone, and no car could be dropped. */
function isTight(plan: readonly CarKind[], riders: number): boolean {
  const seats = seatsIn(plan);
  if (seats < riders) return false;
  return plan.every((k) => seats - CAR_KINDS[k].seats < riders);
}

/** The cheapest mix of cars for `riders` people. */
export function bestPlan(riders: number): CarKind[] {
  return carOptions(riders)[0] ?? [];
}

/** A chosen plan still works if it fits everyone and every car is needed. */
export function planFits(plan: readonly CarKind[], riders: number): boolean {
  return riders > 0 && plan.length > 0 && isTight(plan, riders);
}

/** "xl,standard" ↔ ["xl", "standard"]. */
export function parsePlan(text: string | null | undefined): CarKind[] | null {
  if (!text) return null;
  const kinds = text.split(",");
  return kinds.every(isCarKind) ? kinds : null;
}
export const formatPlan = (plan: readonly CarKind[]) => plan.join(",");

export interface RiderSeat {
  guestId: string;
  /** A car someone put this rider in by hand, if any. */
  car: number | null;
}

/**
 * Puts riders in cars. Riders someone moved by hand stay put while their car
 * exists and has room; everyone else, in the order they joined, goes to the
 * emptiest car (by share of seats filled), so ten people in an XL and a
 * Standard split 6 and 4, and seven in two Standards split 4 and 3.
 */
export function assignCars(plan: readonly CarKind[], riders: readonly RiderSeat[]): string[][] {
  const cars: string[][] = plan.map(() => []);
  const seats = plan.map((k) => CAR_KINDS[k].seats);
  const floating: string[] = [];
  for (const r of riders) {
    const c = r.car;
    if (c !== null && c >= 0 && c < cars.length && cars[c].length < seats[c]) cars[c].push(r.guestId);
    else floating.push(r.guestId);
  }
  for (const guestId of floating) {
    let best = -1;
    for (let c = 0; c < cars.length; c++) {
      if (cars[c].length >= seats[c]) continue;
      if (best < 0 || cars[c].length / seats[c] < cars[best].length / seats[best]) best = c;
    }
    // More riders than seats can't happen with a fitting plan; keep them
    // visible in the last car rather than dropping anyone.
    cars[best < 0 ? cars.length - 1 : best]?.push(guestId);
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
  car: number;
  from: string;
  to: string;
  cents: number;
  settled: boolean;
}

/** Who owes the booker what, for one booked car with a fare. The booker owes nobody. */
export function carDebts(input: {
  rideId: number;
  car: number;
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
      car: input.car,
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

/** "12.05" or "$12.05" → 1205. Null for anything that isn't a sensible fare. */
export function parseFare(text: string): number | null {
  const m = text.trim().replace(/^\$/, "").replace(/,/g, "").match(/^(\d{1,4})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
  return cents > 0 && cents <= MAX_FARE_CENTS ? cents : null;
}

/** $2,000: well past any ride in the Valley, short of a typo with extra zeros. */
export const MAX_FARE_CENTS = 200_000;

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
  index: number;
  kind: CarKind;
  seats: number;
  riders: string[];
  booking: BookingView | null;
}

export interface RideView {
  id: number;
  fromId: string;
  toId: string;
  /** Arizona wall time, "2027-04-08T15:00". */
  departAt: string;
  note: string | null;
  createdBy: string;
  /** Everyone in the ride, in the order they joined. */
  riders: string[];
  plan: CarKind[];
  /** True when someone picked this mix over the cheapest one. */
  customPlan: boolean;
  /** Every sensible mix for this many riders, cheapest first. */
  options: CarKind[][];
  cars: CarView[];
  /** Once a car is booked, who's in which car is fixed. */
  locked: boolean;
}

/** Every debt from every booked car with a fare. */
export function rideDebts(rides: readonly RideView[]): RideDebt[] {
  return rides.flatMap((ride) =>
    ride.cars.flatMap((car) =>
      car.booking
        ? carDebts({
            rideId: ride.id,
            car: car.index,
            bookerId: car.booking.bookerId,
            riders: car.booking.riders,
            fareCents: car.booking.fareCents,
            settled: car.booking.settled,
          })
        : [],
    ),
  );
}
