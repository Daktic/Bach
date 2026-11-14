import { getMyTravel, saveMyTravel as saveOnServer } from "~/lib/api/travel";
import type { FlightLeg } from "~/lib/types";

// The signed-in guest's own travel details (FL-1, FL-2, FL-9), stored in the
// database (ADR 0007). Components read a cached copy synchronously and
// subscribe for updates; the cache fills from the server on first use.
//
// Written by /me, read by /flights and the "Who's here" bar.

export interface MyTravel {
  inbound: FlightLeg | null;
  outbound: FlightLeg | null;
  /** FL-9: driving in instead of flying. */
  driving: boolean;
}

export const EMPTY_TRAVEL: MyTravel = { inbound: null, outbound: null, driving: false };

const CHANGE_EVENT = "bach:travel-change";
const cache = new Map<string, MyTravel>();
const loading = new Map<string, Promise<void>>();

function emit(guestId: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { guestId } }));
}

/** Fetches this guest's travel from the server and notifies subscribers. */
export function refreshMyTravel(guestId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const pending = loading.get(guestId);
  if (pending) return pending;
  const run = getMyTravel()
    .then((travel) => {
      cache.set(guestId, travel);
      emit(guestId);
    })
    .catch(() => {
      // Offline or signed out: keep what we have.
    })
    .finally(() => loading.delete(guestId));
  loading.set(guestId, run);
  return run;
}

/** The cached copy (empty until the first fetch lands). Starts a fetch if needed. */
export function loadMyTravel(guestId: string): MyTravel {
  const cached = cache.get(guestId);
  if (!cached) void refreshMyTravel(guestId);
  return cached ? { ...cached } : { ...EMPTY_TRAVEL };
}

/** Saves to the server. Shows the change straight away; reverts if the save fails. */
export async function saveMyTravel(guestId: string, travel: MyTravel): Promise<boolean> {
  const previous = cache.get(guestId);
  cache.set(guestId, travel);
  emit(guestId);
  try {
    cache.set(guestId, await saveOnServer(travel));
    emit(guestId);
    return true;
  } catch {
    if (previous) cache.set(guestId, previous);
    else cache.delete(guestId);
    emit(guestId);
    return false;
  }
}

/** Calls `onChange` whenever this guest's cached travel changes. */
export function onMyTravelChange(guestId: string, onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocal = (e: Event) => {
    if ((e as CustomEvent<{ guestId: string }>).detail?.guestId === guestId) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onLocal);
  return () => window.removeEventListener(CHANGE_EVENT, onLocal);
}
