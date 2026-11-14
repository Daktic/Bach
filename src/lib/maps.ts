// "Open in Maps" links (TL-4): Apple Maps on iPhone and iPad, Google Maps
// everywhere else. Plain search URLs, so no embed and no API key.

export type MapsProvider = "apple" | "google";

/** Search URL for a free-text place, e.g. "Bourbon Steak, Scottsdale, AZ". */
export function mapsSearchUrl(query: string, provider: MapsProvider = "google"): string {
  const q = encodeURIComponent(query.trim());
  return provider === "apple"
    ? `https://maps.apple.com/?q=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** The parts of `navigator` that platform detection reads. */
export interface NavigatorLike {
  userAgent?: string;
  maxTouchPoints?: number;
}

/** True on iPhone, iPod and iPad, including iPads that request desktop sites. */
export function isAppleMobile(nav: NavigatorLike | undefined): boolean {
  if (!nav) return false;
  const ua = nav.userAgent ?? "";
  if (/\b(iPhone|iPad|iPod)\b/.test(ua)) return true;
  // iPadOS Safari reports itself as a Mac; only the touch screen gives it away.
  return /\bMacintosh\b/.test(ua) && (nav.maxTouchPoints ?? 0) > 1;
}

/**
 * Which maps app to link to. Read `navigator` only after mount: the server
 * has none, so SSR and the first client render use Google.
 */
export function mapsProviderFor(nav: NavigatorLike | undefined): MapsProvider {
  return isAppleMobile(nav) ? "apple" : "google";
}
