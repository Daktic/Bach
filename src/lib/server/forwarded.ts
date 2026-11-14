import "server-only";

const HOST_RE = /^[A-Za-z0-9.-]+(:\d{1,5})?$/;

/**
 * Dev only: the request as the browser addressed it, when it came through a
 * tunnel (ngrok). The tunnel ends at the local dev server, so request.url
 * says http://localhost-ish, and Auth.js builds its callback URLs (and picks
 * secure cookie names) from request.url alone. Sign in with Apple needs the
 * public https:// callback, so rebuild the URL from X-Forwarded-Proto/Host.
 *
 * Production returns the request untouched: there the platform already
 * hands us the public URL, and forwarded headers aren't trusted.
 */
export function withForwardedOrigin(request: Request): Request {
  if (process.env.NODE_ENV === "production") return request;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const host = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  if (!proto && !host) return request;

  const url = new URL(request.url);
  if (proto === "https" || proto === "http") url.protocol = `${proto}:`;
  if (host && HOST_RE.test(host)) {
    url.host = host;
    if (!host.includes(":")) url.port = "";
  }
  if (url.href === request.url) return request;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
    // Node needs this to stream a request body through.
    ...(hasBody ? { duplex: "half" } : {}),
  } as RequestInit);
}
