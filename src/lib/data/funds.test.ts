import { describe, expect, it } from "vitest";
import { pools } from "./funds";
import { guestIds } from "./guests";
import { shareFor } from "../funds";

// Hand-edited data: catch a pool whose shares don't add up to its cost, e.g.
// after giving the groom a $0 share without raising the others.
describe("seeded pools", () => {
  it.each(pools.map((p) => [p.id, p] as const))("%s: shares cover the cost", (_id, pool) => {
    // In cents, so $712.90 × 10 is exactly $7,129.
    const cents = [...guestIds].reduce((sum, id) => sum + Math.round(shareFor(pool, id) * 100), 0);
    expect(cents).toBeGreaterThanOrEqual(Math.round(pool.cost * 100));
  });
});
