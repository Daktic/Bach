import "server-only";
import { withCardFees } from "~/lib/card-fees";
import type { Contribution, Pool } from "~/lib/types";

// Pools and shares are hand-seeded by the organiser (FN-7, FN-9).
// `cost` is what the vendor charges; shares are each guest's part of it, and
// together they must cover the cost (a test checks this). Both are BEFORE
// card fees: guests are charged their share plus Stripe's 2.9% + 30¢, so the
// pool still nets the full cost (~/lib/card-fees).
// Every guest owes `shares.default` unless `shares.overrides` says otherwise,
// e.g. `overrides: { someGuestId: 0 }` for the groom (then raise the others'
// shares to cover it). A $0 share shows no Pay button. Due dates are end of
// day, Arizona time (FN-8).
//
// All values below are mock until the real costs are known.

export const pools: Pool[] = [
  {
    id: "accommodation",
    title: "Scottsdale House",
    description: "5BR Airbnb in Old Town with a pool, fire pit, and a putting green for all 4 nights.",
    placeholderGradient: "linear-gradient(145deg, #b8824a 0%, #d9a96e 45%, #f0d4a8 100%)",
    cost: 3200,
    dueDate: "2027-01-15",
    shares: { default: 320 },
  },
  {
    id: "party-bus",
    title: "Party Bus",
    description: "Roundtrip from PHX + wheels on demand all weekend so nobody has to call an Uber.",
    placeholderGradient: "linear-gradient(145deg, #4a3a9e 0%, #7a66d4 45%, #b8abf0 100%)",
    cost: 800,
    dueDate: "2027-03-01",
    shares: { default: 80 },
  },
  {
    id: "golf",
    title: "Golf Day",
    description: "18 holes at TPC Scottsdale — cart, range balls, and the full 19th hole experience.",
    placeholderGradient: "linear-gradient(145deg, #2d6e28 0%, #57a852 45%, #9ed99a 100%)",
    cost: 1500,
    dueDate: "2027-02-15",
    shares: { default: 150 },
  },
  {
    id: "dinner",
    title: "Steak Night",
    description: "Deposit on the private dining room at Bourbon Steak — Friday night, suits optional.",
    placeholderGradient: "linear-gradient(145deg, #7a2222 0%, #b84a4a 45%, #e09080 100%)",
    cost: 600,
    dueDate: "2027-03-15",
    shares: { default: 60 },
  },
];

// Mock payments, shown only when Stripe isn't configured. With
// STRIPE_SECRET_KEY set, payments come from Stripe (~/lib/server/stripe).
function paid(poolId: string, share: number, guestIds: string[], paidAt: string): Contribution[] {
  return guestIds.map((guestId) => ({
    id: `mock-${poolId}-${guestId}`,
    poolId,
    guestId,
    amount: withCardFees(share),
    paidAt,
  }));
}

export const mockContributions: Contribution[] = [
  ...paid("accommodation", 320, ["gberg", "chris", "sarah", "jake", "mike", "ryan", "alex", "tyler"], "2026-12-01T17:00:00Z"),
  ...paid("party-bus", 80, ["chris", "sarah", "jake", "ryan"], "2026-12-05T17:00:00Z"),
  ...paid("golf", 150, ["gberg", "chris", "sarah", "jake", "mike", "ryan", "tom", "alex", "jordan", "tyler"], "2026-12-10T17:00:00Z"),
  ...paid("dinner", 60, ["gberg", "chris", "sarah", "jake", "mike", "ryan"], "2026-12-12T17:00:00Z"),
];

