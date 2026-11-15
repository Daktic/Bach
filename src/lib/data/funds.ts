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
// Photos: put the files in public/pools/<pool id>/ and list them in order,
// e.g. photos: [{ src: "/pools/accommodation/front.jpg", alt: "The house from the street" }].
// The pool page shows them as a swipeable carousel; the card shows the first.
// Without photos, the gradient is shown. Landscape images about 1200px wide
// work best. The repo is public, so only add photos you're happy to share.
//
// The house is the real Airbnb total. Golf, the party bus and omakase are the
// organiser's per-person budgets (see each pool). Payments below are mock,
// shown only without Stripe.

export const pools: Pool[] = [
  {
    id: "accommodation",
    title: "Dos Palms",
    description:
      "A 4-bedroom Airbnb in north Phoenix with a heated pool, hot tub and trail access to Lookout Mountain, for all 4 nights.",
    placeholderGradient: "linear-gradient(145deg, #b8824a 0%, #d9a96e 45%, #f0d4a8 100%)",
    // Photos are linked from the listing, not copied (the repo is public).
    // Listing: airbnb.com/rooms/1600358551675602629
    photos: [
      { src: "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1600358551675602629/original/02f8791e-de04-4c67-a54a-b6fe8c2ccb46.jpeg?im_w=1200", alt: "Backyard with the pool at Dos Palms" },
      { src: "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1600358551675602629/original/cb5d916f-a10d-467b-8e1f-3525d7dab0c9.jpeg?im_w=1200", alt: "Pool and hot tub with mountain views" },
      { src: "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1600358551675602629/original/f3b8b6c9-4997-4d56-be27-fd7bc94d5b6d.jpeg?im_w=1200", alt: "Resort-style backyard with heated pool and spa" },
      { src: "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1600358551675602629/original/49a78de4-2190-4cb3-a919-97375d8e68a0.jpeg?im_w=1200", alt: "The front of Dos Palms" },
      { src: "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1600358551675602629/original/f50812a4-cb81-4417-a4f7-5d3ca59f76ac.jpeg?im_w=1200", alt: "Open living room with vaulted ceilings" },
      { src: "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1600358551675602629/original/50958f7f-7df0-470d-b94a-76145b0aa1cd.jpeg?im_w=1200", alt: "Fully equipped kitchen" },
      { src: "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1600358551675602629/original/fc33c3e0-761b-4947-9ff3-c09f1f80fe69.jpeg?im_w=1200", alt: "Primary bedroom, a king suite with patio access" },
      { src: "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1600358551675602629/original/1dd7ecd4-f8d6-4d8a-8f06-e15c62edb7b8.jpeg?im_w=1200", alt: "Trail access to Lookout Mountain from the back gate" },
    ],

    cost: 7129, // the Airbnb total
    dueDate: "2027-01-15",
    shares: { default: 712.9 },
  },
  {
    id: "party-bus",
    title: "Party Bus",
    description:
      "Scottsdale Party Bus Crawler, an open-air BYOB party bus, all day Saturday: from the house to both golf courses, then from the We-Ko-Pa Casino Resort (everyone meets there after golf) back home, and out for the night. Get yourself to and from the airport.",
    placeholderGradient: "linear-gradient(145deg, #4a3a9e 0%, #7a66d4 45%, #b8abf0 100%)",
    // Photos linked from scottsdalepartybuscrawler.com, not copied.
    photos: [
      { src: "https://www.scottsdalepartybuscrawler.com/wp-content/uploads/2021/09/Scottsdale-Party-Bus-Crawler.jpg", alt: "The Scottsdale Party Bus Crawler" },
      { src: "https://www.scottsdalepartybuscrawler.com/wp-content/uploads/2023/09/Waving-hi-on-crawler-1024x683.jpg", alt: "A group waving from the open-air party bus" },
      { src: "https://www.scottsdalepartybuscrawler.com/wp-content/uploads/2021/09/Out-the-window-on-white-crawler-scaled.jpg", alt: "Looking out from the open-air bus" },
      { src: "https://www.scottsdalepartybuscrawler.com/wp-content/uploads/2021/09/Walking-off-the-white-party-bus-crawler-scaled.jpg", alt: "Stepping off the party bus" },
    ],
    // Budget set by the organiser: $150 a person with Scottsdale Party Bus
    // Crawler (scottsdalepartybuscrawler.com). Confirm the quote covers the
    // whole Saturday, including tip.
    cost: 1500,
    dueDate: "2027-03-01",
    shares: { default: 150 },
  },
  {
    // Pick your group: each guest chooses a course when they pay. Prices are
    // per player, before card fees; the page shows how many paid for each.
    id: "golf",
    title: "Golf Day",
    description: "Two groups, two courses. Pick yours: Cholla at We-Ko-Pa or Desert Canyon Golf Club in Fountain Hills. After your round, both groups meet at the We-Ko-Pa Casino Resort for the bus home.",
    placeholderGradient: "linear-gradient(145deg, #2d6e28 0%, #57a852 45%, #9ed99a 100%)",
    // Photos linked from wekopa.com and desertcanyongolf.com, not copied.
    photos: [
      { src: "https://wekopa.com/wp-content/uploads/2022/04/We-Ko-Pa-Cholla-Desert-Golf.jpg", alt: "Cholla course at We-Ko-Pa through the desert" },
      { src: "https://wekopa.com/wp-content/uploads/2022/11/cholla_8_fancy.jpg", alt: "Cholla hole 8 at We-Ko-Pa" },
      { src: "https://wekopa.com/wp-content/uploads/2022/11/cholla_17_fancy.jpg", alt: "Cholla hole 17 at We-Ko-Pa" },
      { src: "https://wekopa.com/wp-content/uploads/2022/04/WKP-Clubhouse-2.jpg", alt: "We-Ko-Pa clubhouse" },
      { src: "https://desertcanyongolf.com/wp-content/uploads/2026/10/desert-canyon-hole-16-drone-1024x768.webp", alt: "Desert Canyon hole 16 from above" },
      { src: "https://desertcanyongolf.com/wp-content/uploads/2026/10/desert-canyon-hole-18-canyon-tee-1024x768.webp", alt: "Elevated 18th canyon tee at Desert Canyon with mountain views" },
      { src: "https://desertcanyongolf.com/wp-content/uploads/2026/10/desert-canyon-sky-putting-1024x767.webp", alt: "Putting on an elevated green at Desert Canyon with Fountain Hills views" },
    ],
    cost: 0,
    dueDate: "2027-02-15",
    shares: { default: 0 },
    choices: [
      { id: "cholla", title: "Cholla at We-Ko-Pa", shortTitle: "Cholla", price: 310 },
      { id: "desert-canyon", title: "Desert Canyon Golf Club", shortTitle: "Desert Canyon", price: 110 },
    ],
  },
  {
    id: "omakase",
    title: "Omakase Night",
    description: "Friday night private dining at Roka Akor Scottsdale. Food, drinks, tax and tip all included.",
    placeholderGradient: "linear-gradient(145deg, #1f2a44 0%, #3e5a7a 45%, #9cb6c9 100%)",
    // Photos linked from rokaakor.com, not copied.
    photos: [
      { src: "https://rokaakor.com/wp-content/uploads/2019/05/privat_dining_section_bg.jpg", alt: "Private dining at Roka Akor" },
      { src: "https://rokaakor.com/wp-content/uploads/2026/04/Wagyu-Kobe-on-Grill-1-Large.jpeg", alt: "Wagyu on the robata grill" },
      { src: "https://rokaakor.com/wp-content/uploads/2019/07/Roka-Akor-Scottdale-1024x963.jpg", alt: "Roka Akor Scottsdale" },
    ],
    // Budget set by the organiser: $200 a person for Roka Akor private dining
    // (rokaakor.com/scottsdale/private-dining-catering), covering food, drinks,
    // tax and tip.
    cost: 2000,
    dueDate: "2027-03-15",
    shares: { default: 200 },
  },
  {
    // Optional, choose your own amount: no share, goal or due date. The id stays
    // "drinks" so payments already recorded in Stripe under it still count.
    id: "drinks",
    title: "Food & Drink Fund",
    description: "Optional. Chip in what you like for groceries, takeout, rounds, bottles and the bar tab all weekend.",
    placeholderGradient: "linear-gradient(145deg, #a8641c 0%, #d99a3d 45%, #f2d08a 100%)",
    // Free stock photos from Unsplash (unsplash.com/license), linked not copied.
    photos: [
      { src: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200&q=80&auto=format&fit=crop", alt: "Whiskey poured over a large ice cube" },
      { src: "https://images.unsplash.com/photo-1644447381290-85358ae625cb?w=1200&q=80&auto=format&fit=crop", alt: "A table full of shared food" },
      { src: "https://images.unsplash.com/photo-1649640547107-6bf197e3a30f?w=1200&q=80&auto=format&fit=crop", alt: "A glass of whiskey on a wooden table" },
      { src: "https://images.unsplash.com/photo-1683062332605-4e1209d75346?w=1200&q=80&auto=format&fit=crop", alt: "Tacos and a beer" },
      { src: "https://images.unsplash.com/photo-1508253730651-e5ace80a7025?w=1200&q=80&auto=format&fit=crop", alt: "A wall of whiskey bottles behind the bar" },
      { src: "https://images.unsplash.com/photo-1584440772680-63bec399984b?w=1200&q=80&auto=format&fit=crop", alt: "Burger and fries" },
    ],
    cost: 0,
    shares: { default: 0 },
    open: { presets: [10, 20, 50, 100] },
  },
];

// Payments made outside Stripe (cash, a transfer, or the organiser's own
// money), entered by hand. They count toward totals like Stripe payments, and
// a guest who pays a pool this way owes no card fee on it. Amounts are the
// plain share, before card fees. For golf, also set choiceId to the group.
function offline(poolId: string, guestId: string, amount: number, paidAt: string, choiceId?: string): Contribution {
  return { id: `offline-${poolId}-${guestId}-${paidAt}-${amount}`, poolId, guestId, amount, paidAt, offline: true, ...(choiceId ? { choiceId } : {}) };
}

export const offlinePayments: Contribution[] = [
  // Garrett covers his own share directly.
  offline("accommodation", "gberg", 712.9, "2026-11-14"),
  offline("party-bus", "gberg", 150, "2026-11-14"),
  offline("omakase", "gberg", 200, "2026-11-14"),
  offline("golf", "gberg", 310, "2026-11-14", "cholla"),
  offline("drinks", "gberg", 100, "2026-11-14"), // Food & Drink Fund
];

// Mock payments, shown only when Stripe isn't configured. With
// STRIPE_SECRET_KEY set, payments come from Stripe (~/lib/server/stripe).
function paid(poolId: string, share: number, guestIds: string[], paidAt: string, choiceId?: string): Contribution[] {
  return guestIds.map((guestId) => ({
    id: `mock-${poolId}-${guestId}`,
    poolId,
    guestId,
    amount: withCardFees(share),
    paidAt,
    ...(choiceId ? { choiceId } : {}),
  }));
}

export const mockContributions: Contribution[] = [
  ...paid("accommodation", 712.9, ["chris", "andrew", "avery", "brett", "jerid", "matt", "scott"], "2026-12-01T17:00:00Z"),
  ...paid("party-bus", 150, ["chris", "andrew"], "2026-12-06T17:00:00Z"),
  ...paid("golf", 310, ["chris", "andrew", "avery"], "2026-12-10T17:00:00Z", "cholla"),
  ...paid("golf", 110, ["brett", "jerid"], "2026-12-10T17:00:00Z", "desert-canyon"),
  ...paid("omakase", 200, ["chris", "andrew", "avery", "brett", "jerid"], "2026-12-12T17:00:00Z"),
  ...paid("drinks", 50, ["chris"], "2026-12-14T17:00:00Z"),
  ...paid("drinks", 20, ["andrew", "avery"], "2026-12-15T17:00:00Z"),
];

