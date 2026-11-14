// The signed-in guest's display name and photo overrides, saved in this
// browser until profiles are stored server-side (ME-2). Keyed by guest id.

export interface MyProfile {
  /** Overrides the roster name when set. */
  name?: string;
  /** Uploaded photo as a data URL; overrides the OAuth photo when set. */
  avatarDataUrl?: string;
}

const keyFor = (guestId: string) => `bach:profile:${guestId}`;

export function loadMyProfile(guestId: string): MyProfile {
  try {
    // Inside the try: touching localStorage throws when site data is blocked.
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(keyFor(guestId));
    if (!raw) return {};
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: typeof p.name === "string" && p.name.trim() ? p.name : undefined,
      avatarDataUrl:
        typeof p.avatarDataUrl === "string" && p.avatarDataUrl.startsWith("data:image/")
          ? p.avatarDataUrl
          : undefined,
    };
  } catch {
    return {};
  }
}

/** Returns false when the browser refused to store it (e.g. photo too large). */
export function saveMyProfile(guestId: string, profile: MyProfile): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(keyFor(guestId), JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
