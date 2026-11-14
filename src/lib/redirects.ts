// Shared by the middleware (server) and the sign-in page (client).

/**
 * Returns `next` only if it's a same-site path ("/flights?x=1"), else null.
 * Guards the post-sign-in redirect against open redirects ("//evil.com",
 * "https://evil.com", "/\\evil.com", "/.//evil.com").
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  try {
    const base = "http://bach.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    if (url.pathname.startsWith("/sign-in") || url.pathname.startsWith("/api/auth")) return null;
    const path = url.pathname + url.search + url.hash;
    // Check what we hand back, not just the input: removing dot segments can
    // turn an allowed input into a protocol-relative URL ("/.//evil.com",
    // "/x/..//evil.com" → "//evil.com"), which browsers send off-site.
    if (path.startsWith("//") || new URL(path, base).origin !== base) return null;
    return path;
  } catch {
    return null;
  }
}

/** /sign-in URL that returns the guest to `path` afterwards. */
export function signInUrlFor(path: string): string {
  const next = safeNextPath(path);
  return next && next !== "/" ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in";
}
