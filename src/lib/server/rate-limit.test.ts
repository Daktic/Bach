import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows `limit` calls per key per window", () => {
    let t = 0;
    const limiter = createRateLimiter(3, 1000, () => t);
    expect([limiter.take("gberg"), limiter.take("gberg"), limiter.take("gberg")]).toEqual([true, true, true]);
    expect(limiter.take("gberg")).toBe(false);
    t = 999;
    expect(limiter.take("gberg")).toBe(false);
  });

  it("keeps each guest's budget separate", () => {
    const limiter = createRateLimiter(1, 1000, () => 0);
    expect(limiter.take("gberg")).toBe(true);
    expect(limiter.take("gberg")).toBe(false);
    expect(limiter.take("chris")).toBe(true);
  });

  it("refills when the window ends", () => {
    let t = 0;
    const limiter = createRateLimiter(1, 1000, () => t);
    expect(limiter.take("gberg")).toBe(true);
    expect(limiter.take("gberg")).toBe(false);
    t = 1000;
    expect(limiter.take("gberg")).toBe(true);
    expect(limiter.take("gberg")).toBe(false);
  });
});
