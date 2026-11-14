# ADR 0009 — Invite-only sign-in: Auth.js JWT sessions + a guest list kept out of the repo

**Date:** 2026-11-13
**Status:** Proposed

## Context

Bach is for about ten invited guests. Google and Apple sign-in (Auth.js, already in the code) prove who someone is, but on their own they let anyone with a Google or Apple account in. The PRD (AUTH-2 to AUTH-5) requires:

- every page and data call to sit behind sign-in;
- only emails on a hand-maintained guest list to get a session;
- one guest to be allowed several emails (Google and Apple often differ).

ADR 0007 left the auth library as "TBD", but Auth.js with JWT sessions is already wired up. Turso (ADR 0007) isn't set up yet, so the guest list can't live in a database today. **The GitHub repository is public**, so friends' email addresses can't be committed.

Two smaller facts shaped the details:

- Auth.js assumes its routes live at `/auth`; ours are at `/api/auth`. Without an explicit `basePath`, every Auth.js request failed with `UnknownAction`, so sign-in never worked.
- Some Google accounts carry an unverified email. An allow-list keyed on email has to ignore those, or anyone could claim an invited address.

## Decision

1. **Auth.js with JWT sessions, no database adapter.** `basePath: "/api/auth"` is set explicitly.
2. **The guest roster (id, name, initials) is a committed data file** (`src/lib/data/guests.ts`). Names were already public in the repo.
3. **Sign-in emails live in the `GUEST_EMAILS` environment variable** as `guestId=email` pairs separated by commas, e.g. `gberg=a@example.com,gberg=a@icloud.example,chris=c@example.com`. Listing a guest twice allows two emails (AUTH-5). Emails are matched case-insensitively. An email listed against two different guests is ignored (fails closed). Unset means nobody can sign in.
4. **The `signIn` callback is the gate (AUTH-3).** It returns `false` for any email not on the list, and for Google accounts whose email isn't verified. Auth.js then issues no session and redirects to `/sign-in?error=AccessDenied`.
5. **Every request re-checks the list.** A SolidStart middleware (`src/middleware.ts`) resolves the session's email against `GUEST_EMAILS` on each request. Pages redirect to `/sign-in?next=<path>`, and server-function calls get a 401. Removing an email locks that person out immediately, not just at their next sign-in. Pages are sent with `Cache-Control: private, no-store`, so Back after signing out can't re-show a signed-in page from the browser's cache; it goes through this check again.
6. **Sessions roll, and only for invited guests.** `getSession()` from `@auth/solid-start` drops the refreshed cookie Auth.js returns, so sessions would end 30 days after sign-in however active the guest was. `src/lib/server/session.ts` calls Auth.js directly and passes the refreshed session cookie on for invited guests. A guest who stays away for 30 days signs in again. Auth.js's `jwt` callback returns `null` for an email that's no longer on the list, so Auth.js clears that cookie instead of refreshing it, including on its own public `/api/auth/session` endpoint.
7. **Data only reaches the browser through server functions that call `requireGuest()`** (defence in depth, extending ADR 0006). Data modules import `server-only`, so importing them from client code fails the build. Per-guest payment status is computed server-side for the signed-in guest only. The middleware only accepts server-function calls as same-site `POST`s carrying SolidStart's `X-Server-Instance` header, and answers anything else with 403. A link or form on another site therefore can't make a signed-in guest's browser run a server function (which could also spend paid API calls).
8. **The `next` redirect is validated** (`safeNextPath`) to block open redirects.

## Consequences

- Only invited guests can sign in or read data, without a database.
- `GUEST_EMAILS` and `AUTH_SECRET` must be set in `.env.local` for local dev and in the hosting environment for production. Editing the list means editing an env var and, in production, redeploying or restarting.
- JWT sessions can't be revoked one by one, but the per-request list check covers the case that matters: removing a guest.
- An empty or broken `GUEST_EMAILS` in production signs every guest out, not just blocks them. Once it's fixed, everyone signs in again. That's the price of clearing a removed guest's cookie.
- Server functions can't be called by a plain HTML form or a `GET` (they get 403). Nothing in the app does that today; anything added later has to go through SolidStart's client.
- When Turso lands (ADR 0007), `GUEST_EMAILS` can become the `guest_emails` table. Only `src/lib/server/guest-list.ts` changes.
- Apple "Hide My Email" relay addresses must be listed explicitly if a guest uses one.
