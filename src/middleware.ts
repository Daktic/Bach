import { createMiddleware } from "@solidjs/start/middleware";
import { getRequestEvent } from "solid-js/web";
import { resolveCurrentGuest } from "~/lib/server/session";
import { safeNextPath, signInUrlFor } from "~/lib/redirects";

// AUTH-2: every page and server function requires a signed-in, invited guest.
// Only the sign-in page, the Auth.js endpoints and static files are public.
// Server functions also call requireGuest() themselves (defence in depth).

const PUBLIC_PREFIXES = ["/api/auth/", "/_build/", "/assets/", "/icons/"];
const PUBLIC_FILES = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/robots.txt",
  "/apple-touch-icon.png",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_FILES.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json", "X-Error": "true" },
  });
}

/**
 * True for a server-function call made by the app's own client, which always
 * POSTs with an X-Server-Instance header. SolidStart would otherwise also run
 * a function from a plain GET link (its no-JS path, then redirect to the
 * Referer), and the SameSite=Lax session cookie rides along on a cross-site
 * navigation: CSRF. Another site can't add a custom header without a CORS
 * preflight, which we never grant. The app has no no-JS form actions.
 */
function isAppServerCall(request: Request): boolean {
  return (
    request.method === "POST" &&
    request.headers.has("X-Server-Instance") &&
    request.headers.get("Sec-Fetch-Site") !== "cross-site"
  );
}

export default createMiddleware([
  async () => {
    const event = getRequestEvent();
    if (!event) return;

    const url = new URL(event.request.url);
    const { pathname } = url;
    if (isPublicPath(pathname)) return;

    // Pages carry a guest's data in their HTML. Without no-store, Back after
    // signing out re-renders the signed-in page from the browser's HTTP cache
    // without asking the server. no-store makes Back fetch again, so the
    // checks below send a signed-out visitor to /sign-in.
    event.response.headers.set("Cache-Control", "private, no-store");

    if (pathname.startsWith("/_server") && !isAppServerCall(event.request)) {
      return jsonError(403, "Forbidden");
    }

    const current = await resolveCurrentGuest(event);

    if (pathname === "/sign-in") {
      // Already signed in: skip the sign-in page unless it's showing an error.
      if (current && !url.searchParams.has("error")) {
        return redirectTo(safeNextPath(url.searchParams.get("next")) ?? "/");
      }
      return;
    }

    if (current) return;

    // Data requests get a 401 rather than an HTML redirect. X-Error makes the
    // server-function client throw into the page's ErrorBoundary (whose reload
    // lands on /sign-in); without it a non-5xx response resolves to undefined.
    if (pathname.startsWith("/_server") || pathname.startsWith("/api/")) {
      return jsonError(401, "Unauthorized");
    }

    return redirectTo(signInUrlFor(pathname + url.search));
  },
]);
