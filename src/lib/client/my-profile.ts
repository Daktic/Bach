import { getMyProfile, saveMyProfile as saveOnServer } from "~/lib/api/profile";

// The signed-in guest's display name and photo (ME-2), stored in the
// database (ADR 0007) so the crew sees them too. Components read a cached copy
// synchronously and subscribe for updates; the cache fills on first use.

export interface MyProfile {
  /** Overrides the roster name when set. */
  name?: string;
  /** Uploaded photo as a data URL; overrides the OAuth photo when set. */
  avatarDataUrl?: string;
}

const CHANGE_EVENT = "bach:profile-change";
const cache = new Map<string, MyProfile>();
const loading = new Map<string, Promise<void>>();

function emit(guestId: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { guestId } }));
}

export function refreshMyProfile(guestId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const pending = loading.get(guestId);
  if (pending) return pending;
  const run = getMyProfile()
    .then((profile) => {
      cache.set(guestId, profile);
      emit(guestId);
    })
    .catch(() => {})
    .finally(() => loading.delete(guestId));
  loading.set(guestId, run);
  return run;
}

/** The cached copy (empty until the first fetch lands). Starts a fetch if needed. */
export function loadMyProfile(guestId: string): MyProfile {
  const cached = cache.get(guestId);
  if (!cached) void refreshMyProfile(guestId);
  return cached ? { ...cached } : {};
}

/** Saves to the server. Returns the error message to show, or null on success. */
export async function saveMyProfile(guestId: string, profile: MyProfile): Promise<string | null> {
  try {
    cache.set(guestId, await saveOnServer(profile));
    emit(guestId);
    return null;
  } catch (err) {
    return err instanceof Error && err.message ? err.message : "Couldn't save. Check your connection and try again.";
  }
}

/** Calls `onChange` whenever this guest's cached profile changes. */
export function onMyProfileChange(guestId: string, onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onLocal = (e: Event) => {
    if ((e as CustomEvent<{ guestId: string }>).detail?.guestId === guestId) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onLocal);
  return () => window.removeEventListener(CHANGE_EVENT, onLocal);
}
