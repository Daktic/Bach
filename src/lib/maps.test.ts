import { describe, expect, it } from "vitest";
import { isAppleMobile, mapsProviderFor, mapsSearchUrl } from "./maps";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1",
  ipad:
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  // iPadOS Safari in its default "desktop website" mode, and a real Mac.
  mac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
  windows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

describe("mapsSearchUrl", () => {
  const place = "Bourbon Steak, Scottsdale, AZ";

  it("builds a Google Maps search URL by default", () => {
    expect(mapsSearchUrl(place)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Bourbon%20Steak%2C%20Scottsdale%2C%20AZ",
    );
    expect(mapsSearchUrl(place, "google")).toBe(mapsSearchUrl(place));
  });

  it("builds an Apple Maps search URL", () => {
    expect(mapsSearchUrl(place, "apple")).toBe(
      "https://maps.apple.com/?q=Bourbon%20Steak%2C%20Scottsdale%2C%20AZ",
    );
  });

  it("encodes characters that would break the query string", () => {
    expect(mapsSearchUrl("Fry's & Co. #2", "apple")).toBe("https://maps.apple.com/?q=Fry's%20%26%20Co.%20%232");
    expect(mapsSearchUrl("Café Monarch", "google")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20Monarch",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(mapsSearchUrl("  Old Town Scottsdale, AZ \n", "apple")).toBe(
      "https://maps.apple.com/?q=Old%20Town%20Scottsdale%2C%20AZ",
    );
  });
});

describe("mapsProviderFor", () => {
  it("uses Apple Maps on iPhone and iPad, whatever the browser", () => {
    expect(mapsProviderFor({ userAgent: UA.iphone, maxTouchPoints: 5 })).toBe("apple");
    expect(mapsProviderFor({ userAgent: UA.iphoneChrome, maxTouchPoints: 5 })).toBe("apple");
    expect(mapsProviderFor({ userAgent: UA.ipad, maxTouchPoints: 5 })).toBe("apple");
  });

  it("spots an iPad that asks for desktop sites by its touch screen", () => {
    expect(isAppleMobile({ userAgent: UA.mac, maxTouchPoints: 5 })).toBe(true);
    expect(isAppleMobile({ userAgent: UA.mac, maxTouchPoints: 0 })).toBe(false);
    expect(isAppleMobile({ userAgent: UA.mac })).toBe(false);
  });

  it("uses Google Maps everywhere else", () => {
    expect(mapsProviderFor({ userAgent: UA.mac, maxTouchPoints: 0 })).toBe("google");
    expect(mapsProviderFor({ userAgent: UA.android, maxTouchPoints: 5 })).toBe("google");
    expect(mapsProviderFor({ userAgent: UA.windows, maxTouchPoints: 10 })).toBe("google");
    expect(mapsProviderFor({})).toBe("google");
  });

  it("defaults to Google when there is no navigator (SSR)", () => {
    expect(mapsProviderFor(undefined)).toBe("google");
  });
});
