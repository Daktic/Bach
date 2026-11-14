import type { FlightLeg } from "~/lib/types";
import { hasUtcOffset, parseWallTime } from "~/lib/zoned-time";

// The signed-in guest's own travel details, saved in this browser until they
// can be stored server-side (FL-1, FL-2, FL-9). Keyed by guest id so two
// guests sharing a device don't see each other's entries.
//
// Written by /me, read by /flights and the "Who's here" bar so a guest at
// least sees their own entry reflected everywhere on their phone.

export interface MyTravel {
  inbound: FlightLeg | null;
  outbound: FlightLeg | null;
  /** FL-9: driving in instead of flying. */
  driving: boolean;
}

export const EMPTY_TRAVEL: MyTravel = { inbound: null, outbound: null, driving: false };

const keyFor = (guestId: string) => `bach:travel:${guestId}`;
const CHANGE_EVENT = "bach:travel-change";

function isValidLeg(value: unknown): value is FlightLeg {
  if (!value || typeof value !== "object") return false;
  const leg = value as Record<string, unknown>;
  const str = (k: string) => typeof leg[k] === "string" && (leg[k] as string).length > 0;
  return (
    str("flightNumber") &&
    str("origin") &&
    str("destination") &&
    str("departsAt") &&
    str("arrivesAt") &&
    typeof leg.airline === "string" &&
    // Only offset-aware times (see FlightLeg) — older entries saved without an
    // offset can't be placed in time reliably, so they're dropped.
    hasUtcOffset(leg.departsAt as string) &&
    hasUtcOffset(leg.arrivesAt as string) &&
    parseWallTime(leg.departsAt as string) !== null &&
    parseWallTime(leg.arrivesAt as string) !== null
  );
}

export function loadMyTravel(guestId: string): MyTravel {
  try {
    // Inside the try: touching localStorage throws when site data is blocked.
    if (typeof localStorage === "undefined") return { ...EMPTY_TRAVEL };
    const raw = localStorage.getItem(keyFor(guestId));
    if (!raw) return { ...EMPTY_TRAVEL };
    const parsed = JSON.parse(raw) as Partial<Record<keyof MyTravel, unknown>>;
    return {
      inbound: isValidLeg(parsed.inbound) ? parsed.inbound : null,
      outbound: isValidLeg(parsed.outbound) ? parsed.outbound : null,
      driving: parsed.driving === true,
    };
  } catch {
    return { ...EMPTY_TRAVEL };
  }
}

export function saveMyTravel(guestId: string, travel: MyTravel): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(keyFor(guestId), JSON.stringify(travel));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { guestId } }));
  } catch {
    // Storage full or blocked (private mode) — the entry just isn't remembered.
  }
}

/** Calls `onChange` when this guest's travel is saved in this tab or another. */
export function onMyTravelChange(guestId: string, onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === keyFor(guestId)) onChange();
  };
  const onLocal = (e: Event) => {
    if ((e as CustomEvent<{ guestId: string }>).detail?.guestId === guestId) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onLocal);
  };
}
