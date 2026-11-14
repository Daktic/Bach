import { describe, expect, it } from "vitest";
import { downscaleSteps, squareCrop } from "./avatar-image";

describe("squareCrop", () => {
  it("takes the centred square and caps it at 256 px", () => {
    expect(squareCrop(4032, 3024)).toEqual({ sx: 504, sy: 0, side: 3024, size: 256 });
    expect(squareCrop(1000, 3000, 128)).toEqual({ sx: 0, sy: 1000, side: 1000, size: 128 });
  });

  it("never upscales small images", () => {
    expect(squareCrop(100, 300)).toEqual({ sx: 0, sy: 100, side: 100, size: 100 });
    expect(squareCrop(0, 0).size).toBe(0);
  });
});

describe("downscaleSteps", () => {
  it("halves until the next halving would undershoot", () => {
    expect(downscaleSteps(3024, 256)).toEqual([1512, 756, 378]);
    expect(downscaleSteps(512, 256)).toEqual([256]);
    expect(downscaleSteps(300, 256)).toEqual([]);
    expect(downscaleSteps(100, 0)).toEqual([]);
  });
});
