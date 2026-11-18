// NAV-1: each page gets its own document title, for the browser tab, history
// and screen readers. The server renders it into the HTML (entry-server.tsx)
// and AppShell (app.tsx) updates it after each client-side navigation. The
// list mirrors the page routes in src/routes, and page-title.test.ts fails if
// a route is missing from it.

export const SITE_NAME = "Bach";

/** Title for paths no route matches; the catch-all route shows "Page not found". */
export const NOT_FOUND_TITLE = `Page not found · ${SITE_NAME}`;

const PAGES: ReadonlyArray<{ path: string; name: string }> = [
  { path: "/", name: "Timeline" },
  { path: "/flights", name: "Flights" },
  { path: "/flights/book", name: "Book a flight" },
  { path: "/rides", name: "Rides" },
  { path: "/chat", name: "Chat" },
  { path: "/funds", name: "Funds" },
  { path: "/funds/:id", name: "Pool" },
  { path: "/activity/:id", name: "Activity" },
  { path: "/me", name: "Me" },
  { path: "/sign-in", name: "Sign in" },
];

/** Splits a path the way the router does: empty segments (extra slashes) don't count. */
function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function matches(pattern: string[], segments: string[]): boolean {
  return (
    pattern.length === segments.length &&
    // Static segments match regardless of case, as they do in the router.
    pattern.every((part, i) => part.startsWith(":") || part === segments[i].toLowerCase())
  );
}

/** "Funds · Bach" for /funds; "Page not found · Bach" for a path with no page. */
export function pageTitle(pathname: string): string {
  const segments = segmentsOf(pathname);
  const page = PAGES.find((p) => matches(segmentsOf(p.path), segments));
  return page ? `${page.name} · ${SITE_NAME}` : NOT_FOUND_TITLE;
}
