import "server-only";
import { Auth } from "@auth/core";
import type { Session } from "@auth/core/types";
import { redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import type { RequestEvent } from "solid-js/web";
import { authConfig } from "~/lib/auth";
import { withForwardedOrigin } from "~/lib/server/forwarded";
import { findGuestByEmail } from "~/lib/server/guest-list";
import type { Guest } from "~/lib/types";

/** A signed-in, invited guest for the current request. */
export interface CurrentGuest {
  guest: Guest;
  email: string;
  image: string | null;
}

const LOCALS_KEY = "bach:currentGuest";

// "authjs.session-token" over http, "__Secure-authjs.session-token" over https,
// with ".0", ".1"… suffixes when a large token is split across cookies.
const SESSION_COOKIE_RE = /^(__Secure-)?authjs\.session-token(\.\d+)?=/;

/**
 * Asks Auth.js for the session behind this request. Unlike getSession() from
 * @auth/solid-start, this keeps the Set-Cookie headers Auth.js returns, so the
 * caller can pass on the refreshed (rolling) session cookie.
 */
async function readSession(request: Request): Promise<{ session: Session | null; setCookies: string[] }> {
  const url = new URL(`${authConfig.basePath ?? "/api/auth"}/session`, request.url);
  const response = await Auth(new Request(url, { headers: request.headers }), {
    ...authConfig,
    secret: authConfig.secret ?? process.env.AUTH_SECRET,
    trustHost: true,
  });
  const setCookies = response.headers.getSetCookie();
  const data = (await response.json().catch(() => null)) as (Session & { message?: string }) | null;
  if (response.status !== 200) throw new Error(data?.message ?? `session endpoint returned ${response.status}`);
  const session = data && Object.keys(data).length ? data : null;
  return { session, setCookies };
}

/**
 * Resolves the request's session to an invited guest, or null.
 * The result is cached on the request so the middleware and any server
 * functions or SSR data loads in the same request share one lookup.
 *
 * Sessions roll: each request by an invited guest re-issues the session
 * cookie with a fresh expiry, so active guests stay signed in. Invalid or
 * expired cookies are cleared, and so is the cookie of a guest removed from
 * the list (the jwt callback in ~/lib/auth rejects uninvited emails); they're
 * refused on every request.
 */
export async function resolveCurrentGuest(
  event: RequestEvent | undefined = getRequestEvent(),
): Promise<CurrentGuest | null> {
  if (!event) return null;
  if (LOCALS_KEY in event.locals) return event.locals[LOCALS_KEY] as CurrentGuest | null;

  let current: CurrentGuest | null = null;
  try {
    const { session, setCookies } = await readSession(withForwardedOrigin(event.request));
    const email = session?.user?.email ?? null;
    const guest = findGuestByEmail(email);
    if (guest && email) {
      current = { guest, email, image: session?.user?.image ?? null };
    }
    // Pass the session cookie on when it refreshes an invited guest's session,
    // or when Auth.js is clearing a session that's no longer valid. Other
    // Auth.js cookies (CSRF, callback URL) belong to the /api/auth flow.
    if (current || !session) {
      for (const cookie of setCookies) {
        if (SESSION_COOKIE_RE.test(cookie)) event.response?.headers?.append("Set-Cookie", cookie);
      }
    }
  } catch (err) {
    console.error("[session] could not read session", err);
    current = null;
  }

  event.locals[LOCALS_KEY] = current;
  return current;
}

/**
 * Returns the signed-in guest or throws a redirect to /sign-in.
 * Call at the top of every server function that returns trip data.
 */
export async function requireGuest(): Promise<CurrentGuest> {
  const current = await resolveCurrentGuest();
  if (!current) throw redirect("/sign-in");
  return current;
}
