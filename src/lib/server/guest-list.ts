import "server-only";
import { guestIds, getGuestById } from "~/lib/data/guests";
import { lookupGuestId, parseGuestEmails, type AllowList } from "~/lib/guest-allowlist";
import type { Guest } from "~/lib/types";

// Reads the invite list from GUEST_EMAILS (see src/lib/data/guests.ts for the
// format). Re-parsed whenever the variable changes, so editing .env.local in
// dev takes effect without a restart once Vite reloads the env.

let cached: { raw: string | undefined; list: AllowList } | null = null;

function allowList(): AllowList {
  const raw = process.env.GUEST_EMAILS;
  if (!cached || cached.raw !== raw) {
    const list = parseGuestEmails(raw, guestIds);
    if (list.problems.length) {
      console.warn(`[guest-list] GUEST_EMAILS problems:\n  ${list.problems.join("\n  ")}`);
    }
    if (list.emailToGuest.size === 0) {
      console.warn("[guest-list] GUEST_EMAILS is empty — nobody can sign in.");
    }
    cached = { raw, list };
  }
  return cached.list;
}

/** The invited guest an email belongs to, or null if it isn't on the list. */
export function findGuestByEmail(email: string | null | undefined): Guest | null {
  return getGuestById(lookupGuestId(allowList(), email));
}

export function isInvitedEmail(email: string | null | undefined): boolean {
  return findGuestByEmail(email) !== null;
}
