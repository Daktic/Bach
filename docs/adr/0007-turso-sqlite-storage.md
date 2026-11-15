# ADR 0007 — Turso (SQLite at the edge) for persistent storage

**Date:** 2026-09-20 (revised 2026-11-14)
**Status:** Proposed

## Context

Guests enter their own flights, "Who's here" status and profile edits. Until now those were saved only in each guest's browser, so nobody saw anyone else's flight (PRD FL-2, FL-8, ME-2). That's the gap a database closes, and it matters by January 2027, when guests start booking.

Since this ADR was first written, several things it left open were decided elsewhere:

- **Sign-in:** Auth.js with an invite list in `GUEST_EMAILS` (ADR 0009). There is no admin role.
- **Payments:** Stripe is the record of payments, plus a short hand-entered list of payments made outside Stripe (ADR 0010).
- **Hand-maintained data:** the guest roster, pools and the itinerary are kept in code by the organiser and change rarely.

Options considered for storage were Supabase (Postgres, heavier than needed), Turso (hosted SQLite) and Neon/PlanetScale (serverless Postgres).

## Decision

1. **Turso with Drizzle ORM** (`drizzle-orm` + `@libsql/client`). The free tier covers a ten-person guest list many times over. Drizzle gives type-checked tables and queries, and `drizzle-kit` turns schema changes into SQL migrations.
2. **The database holds what guests enter**:

   ```
   flights          guest_id, direction (in|out), leg (0, 1, … in departure order),
                    flight_number, airline, origin, destination, departs_at,
                    arrives_at, updated_at
                    primary key (guest_id, direction, leg)
   guest_travel     guest_id (pk), driving (bool), status (home|car|plane|arrived), updated_at
   guest_profiles   guest_id (pk), display_name?, avatar_data_url?, updated_at
   ```

   Times keep their UTC offset as text ("2027-04-08T10:00:00-04:00"), exactly as guests see them. Photos are the 256px JPEG data URLs the app already makes (about 20–40 KB), which is fine at this size.
3. **Hand-maintained data stays in code for now:** guests, pools, shares and activities in `src/lib/data/`, sign-in emails in `GUEST_EMAILS`, payments in Stripe. These can move into tables later without changing the pages.
4. **One access layer.** Pages read and write only through the server functions in `src/lib/api/`, which call `requireGuest()` and use `src/lib/server/db.ts`. A guest can only write their own rows. The server takes the guest id from the session, never from the browser.
5. **Environments.** `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` point at the database (in `.env.local` for dev, and in the hosting settings for production). Without them the app falls back to a local SQLite file in `.data/`. Tests use an in-memory SQLite database with the same migrations.
6. **Migrations** live in `drizzle/` and are applied with `pnpm db:migrate`. They are checked into the repo; table definitions are in `src/lib/server/schema.ts`.
7. **Sync between phones** is polling: "Who's here" refreshes every 30 seconds and when the page comes back into view (PRD Q5). Real-time push isn't needed for ten people.

## Consequences

- Flights, driving and statuses are shared: every guest sees everyone's arrivals.
- Dev and production share one Turso database unless a second one is made for production. Test entries made while developing are visible to everyone.
- Each schema change needs a migration (`pnpm db:generate`, then `pnpm db:migrate`).
- Switching to Postgres later means swapping the Drizzle driver and dialect; the queries stay largely the same.
