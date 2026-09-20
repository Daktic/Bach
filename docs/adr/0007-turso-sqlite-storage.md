# ADR 0007 — Turso (SQLite at the edge) for persistent storage

**Date:** 2026-09-20
**Status:** Proposed

## Context

The flight tracker is the first feature requiring per-user persistent data. Fund contributions will also need it. A storage decision is needed before those features are wired up.

Options considered:
1. **Supabase** — Postgres + auth + realtime. Generous free tier but heavier than needed for a small guest list.
2. **Turso** — Hosted SQLite, edge-replicated via libSQL. Extremely low latency, simple schema, cheap.
3. **PlanetScale / Neon** — Serverless Postgres. More powerful than needed; pricing scales differently.

## Decision

We will use **Turso** with **Drizzle ORM** (`drizzle-orm` + `@libsql/client`).

- **Turso** handles storage. The free tier covers the guest-list scale comfortably.
- **Drizzle** provides type-safe schema definition and query building without a heavy ORM footprint.
- Auth is handled separately (ADR TBD); Turso does not provide auth.

Initial tables:
```
users    (id, email, name, avatar_url, is_admin, created_at)
flights  (id, user_id, flight_number, origin, destination, departs_at, arrives_at, created_at)
```

Fund contributions will be added as a separate table when that feature is built.

## Consequences

- Schema changes require a migration (Drizzle handles this with `drizzle-kit`).
- No built-in auth — an auth library (Lucia, Better Auth, etc.) must be layered on top.
- Switching to Postgres later only requires swapping the Drizzle driver; queries stay the same.
- Local dev uses a local SQLite file; production uses the Turso remote URL.
