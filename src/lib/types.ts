// ─── Guests ───────────────────────────────────────────────────────────────────

export type ArrivalMode = "fly" | "drive";

/** One invited guest. The roster is hand-maintained in src/lib/data/guests.ts. */
export interface Guest {
  id: string;
  name: string;
  initials: string;
  /** Hand-seeded by the organiser for guests known to be driving (FL-9). */
  arrivesBy?: ArrivalMode;
}

/** The signed-in guest, as returned by getMe(). */
export interface Me {
  id: string;
  name: string;
  initials: string;
  email: string | null;
  /** OAuth profile photo, when the provider gives one (Google does, Apple doesn't). */
  image: string | null;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

/** Activity times are Arizona wall times ("HH:MM", 24h). */
export interface Activity {
  id: string;
  day: string;         // "YYYY-MM-DD"
  title: string;
  description: string;
  image?: string;      // path relative to /public
  startTime?: string;  // "HH:MM" 24h, Arizona
  endTime?: string;    // "HH:MM" 24h, Arizona
  location?: string;   // free text, used for the "Open in Maps" link
  details?: string;    // extended prose for the dialog
  poolId?: string;     // funding pool that pays for this activity (TL-5)
}

/** Activity as served to the client, with its pool's title joined in. */
export interface ActivityView extends Activity {
  pool?: { id: string; title: string };
}

export type DayStatus = "past" | "current" | "future";

export interface TripDay {
  date: string;        // "YYYY-MM-DD"
  label: string;       // "Thursday · Apr 8"
  status: DayStatus;
  activities: ActivityView[];
}

// ─── Flights ──────────────────────────────────────────────────────────────────

export type FlightStatus = "upcoming" | "boarding" | "in_air" | "landed" | "delayed";
export type FlightDirection = "in" | "out";

/**
 * A flight leg. Times are the airport's local wall time plus that airport's
 * UTC offset, as the flight data gives them:
 *   departsAt "2027-04-08T09:00:00-04:00"  (9 AM at JFK)
 *   arrivesAt "2027-04-08T11:45:00-07:00"  (11:45 AM at PHX)
 * Display uses the wall time in the string; status math uses the instant.
 */
export interface FlightLeg {
  flightNumber: string;
  airline: string;
  origin: string;       // IATA code e.g. "JFK"
  destination: string;  // IATA code e.g. "PHX"
  departsAt: string;
  arrivesAt: string;
}

export interface GuestFlight extends FlightLeg {
  id: string;
  guestId: string;      // matches Guest.id
  guestName: string;
}

export interface GuestFlightWithStatus extends GuestFlight {
  status: FlightStatus;
  progressFraction: number;    // 0–1, meaningful only for in_air
  minutesUntilArrival: number; // negative once landed
}

export interface GuestWithoutFlight {
  id: string;
  guestName: string;
}

/** Everything /flights needs, from getFlightBoard(). Inbound legs only. */
export interface FlightBoard {
  flights: GuestFlight[];
  /** Guests on the roster with no inbound flight who aren't driving. */
  noFlight: GuestWithoutFlight[];
  /** Guests the organiser marked as driving in. */
  driving: GuestWithoutFlight[];
}

// ─── Travel status ("Who's here") ─────────────────────────────────────────────

export type TravelStatus = "home" | "car" | "plane" | "arrived";

export interface CrewMemberView {
  id: string;
  name: string;
  initials: string;
  arrivesBy: ArrivalMode;
  hasInboundFlight: boolean;
  /** Mock until travel status is stored server-side (FL-8). */
  status: TravelStatus;
}

// ─── Funds ────────────────────────────────────────────────────────────────────

/**
 * A pooled expense. Hand-seeded in src/lib/data/funds.ts.
 * Each guest's share is `shares.default` unless overridden per guest (FN-9).
 * `cost` and `shares` are before card fees: guests are charged their share
 * plus Stripe's fee (see ~/lib/card-fees), so the pool nets the full cost.
 */
export interface Pool {
  id: string;
  title: string;
  description: string;
  placeholderGradient: string; // CSS gradient used as hero when no real image is set
  image?: string;              // /public path — overrides gradient when present
  cost: number;                // what the vendor charges, before card fees
  dueDate?: string;            // "YYYY-MM-DD", end of day Arizona time (FN-8)
  shares: {
    default: number;
    overrides?: Record<string, number>; // guestId → amount (e.g. groom → 0)
  };
}

/** One payment toward a pool: a paid Stripe Checkout Session, or mock data without Stripe. */
export interface Contribution {
  id: string;
  poolId: string;
  guestId: string;
  amount: number;
  paidAt: string; // ISO instant
}

/**
 * A pool as one guest sees it, from getMyPools()/getMyPool().
 * Contains no other guest's share or payment status.
 */
export interface PoolView {
  id: string;
  title: string;
  description: string;
  placeholderGradient: string;
  image?: string;
  /** The cost plus every guest's card fee: what the pool must raise. */
  targetAmount: number;
  raisedAmount: number;
  dueDate?: string;
  /** The viewer's share including the card fee: what they're charged. */
  myShare: number;
  /** The card-fee part of myShare. */
  myCardFee: number;
  myPaid: number;
  /** True when card payments are set up (Stripe configured). */
  canPay: boolean;
  /** Activities on the timeline paid for by this pool (TL-5). */
  activities: { id: string; title: string }[];
}

