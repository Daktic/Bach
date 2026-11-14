import { describe, expect, it } from "vitest";
import { sizedImage } from "./image-size";

describe("sizedImage", () => {
  it("swaps the width of a Wikimedia thumbnail", () => {
    const src =
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Hiroshige_Bowl_of_Sushi.jpg/960px-Hiroshige_Bowl_of_Sushi.jpg";
    expect(sizedImage(src, 250)).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Hiroshige_Bowl_of_Sushi.jpg/250px-Hiroshige_Bowl_of_Sushi.jpg",
    );
  });

  it("turns a link to an original Wikimedia file into a thumbnail", () => {
    expect(sizedImage("https://upload.wikimedia.org/wikipedia/commons/9/96/Poster_-_1948.jpg", 250)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Poster_-_1948.jpg/250px-Poster_-_1948.jpg",
    );
  });

  it("leaves other images alone", () => {
    expect(sizedImage("/pools/house.jpg", 250)).toBe("/pools/house.jpg");
    expect(sizedImage("https://images.unsplash.com/photo-1?w=1200", 250)).toBe("https://images.unsplash.com/photo-1?w=1200");
  });
});
