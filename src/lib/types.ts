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
  image?: string;      // square art on the timeline card: a /public path or a full URL
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

/** "layover": landed from one leg, next leg not boarding yet. */
export type FlightStatus = "upcoming" | "boarding" | "in_air" | "layover" | "landed" | "delayed";
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

/**
 * A guest's trip to PHX. The FlightLeg fields are the last leg (the one that
 * lands); `legs` lists every leg in departure order when there's a connection.
 */
export interface GuestFlight extends FlightLeg {
  id: string;
  guestId: string;      // matches Guest.id
  guestName: string;
  legs?: FlightLeg[];
}

/**
 * The trip as of `now`. The FlightLeg fields are the leg in progress (or the
 * next one, during a layover; the last one once landed).
 */
export interface GuestFlightWithStatus extends GuestFlight {
  status: FlightStatus;
  progressFraction: number;    // 0–1 along the current leg
  minutesUntilArrival: number; // to the current leg's arrival; negative once landed
  legIndex: number;            // 0-based position of the current leg
  legCount: number;
  /** Where the whole trip ends, and when (for sorting and "lands at PHX"). */
  finalDestination: string;
  finalArrivesAt: string;
  /** During a layover, where they're waiting. */
  layoverAt?: string;
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
  /** The guest's uploaded photo (a data URL), else their sign-in account's photo URL. */
  image?: string;
  arrivesBy: ArrivalMode;
  hasInboundFlight: boolean;
  /** "Who's here" status, from the database (FL-8). */
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
  placeholderGradient: string; // CSS gradient used as hero when there are no photos
  /** Photos shown as a carousel on the pool page; the first one on its card. */
  photos?: PoolPhoto[];
  cost: number;                // what the vendor charges, before card fees
  dueDate?: string;            // "YYYY-MM-DD", end of day Arizona time (FN-8)
  shares: {
    default: number;
    overrides?: Record<string, number>; // guestId → amount (e.g. groom → 0)
  };
  /**
   * An optional, choose-your-own-amount pool (e.g. a food & drink fund): no share,
   * no goal, no due date. Guests chip in any amount, as often as they like.
   * Set `cost: 0` and `shares: { default: 0 }` alongside it.
   */
  open?: { presets: number[] };
  /**
   * A pick-your-group pool (e.g. golf on two courses): each guest picks one
   * choice when they pay, and owes that choice's price. Set `cost: 0` and
   * `shares: { default: 0 }` alongside it.
   */
  choices?: PoolChoice[];
}

/** One group in a pick-your-group pool. `price` is per person, before card fees. */
export interface PoolChoice {
  id: string;
  title: string;
  /** Short name for tight spots, e.g. the card on /funds ("Cholla"). */
  shortTitle: string;
  price: number;
  description?: string;
}

/** A pool photo. `src` is a path under /public (e.g. "/pools/accommodation/pool.jpg") or a full URL. */
export interface PoolPhoto {
  src: string;
  /** Describes the photo for screen readers, e.g. "Backyard pool at night". */
  alt: string;
}

/** A group in a pick-your-group pool, as guests see it. */
export interface PoolChoiceView extends PoolChoice {
  /** What a guest is charged for this group: price plus card fee. */
  charge: number;
  /** How many guests have paid for this group. Names are never shared. */
  players: number;
}

/** One payment toward a pool: a paid Stripe Checkout Session, or mock data without Stripe. */
export interface Contribution {
  id: string;
  poolId: string;
  guestId: string;
  amount: number;
  paidAt: string; // ISO instant
  /** For a pick-your-group pool: which group this payment was for. */
  choiceId?: string;
  /**
   * Paid outside Stripe (cash, transfer, or the organiser's own money),
   * recorded by hand. No card fee applies to a guest who pays this way.
   */
  offline?: boolean;
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
  photos: PoolPhoto[];
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
  /** Set for a choose-your-own-amount pool: the preset amounts to offer. */
  open: { presets: number[] } | null;
  /** Set for a pick-your-group pool: each group, with how many have paid for it. */
  choices: PoolChoiceView[] | null;
  /** The group the viewer paid for, if any. */
  myChoice: string | null;
  /** A pick-your-group pool where the viewer hasn't picked (paid for) a group yet. */
  needsChoice: boolean;
  /** Pick-your-group pool: how many guests haven't picked a group yet. */
  undecided: number;
  /** Activities on the timeline paid for by this pool (TL-5). */
  activities: { id: string; title: string }[];
}

