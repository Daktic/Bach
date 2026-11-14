import { signOut as endAuthSession } from "@auth/solid-start/client";

// AUTH-6: signing out, shared by the drawer's button (NavBar) and the one on
// /me (ProfilePage). Browser only.

/** Set once a sign-out starts in this page; cleared again if it fails. */
let started = false;
/** The sign-out under way, so a second tap doesn't send a second request. */
let inFlight: Promise<void> | undefined;

/**
 * True once this page has started signing out. Back after signing out can
 * restore the page from the bfcache with trip data still on it; NavBar's
 * pageshow handler checks this and reloads, so the middleware sends the
 * visitor to /sign-in.
 */
export function signOutStarted(): boolean {
  return started;
}

/**
 * Ends the Auth.js session and lands on /sign-in. Resolves as the browser
 * starts leaving the page; rejects if the request fails (offline, say), with
 * the guest still signed in.
 */
export function signOut(): Promise<void> {
  inFlight ??= start();
  return inFlight;
}

async function start(): Promise<void> {
  started = true;
  try {
    await endAuthSession({ callbackUrl: "/sign-in" });
  } catch (err) {
    started = false;
    inFlight = undefined;
    throw err;
  }
}
