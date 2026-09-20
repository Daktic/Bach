# ADR 0006 — Activity data via server functions with a swappable source

**Date:** 2026-09-20
**Status:** Proposed

## Context

The trip timeline needs a source of activity data for Apr 8–12 2027. The data is fixed and known at build time, but productising this app one day would require a real database.

Two concerns pull in different directions:
1. **Simplicity now** — a static TypeScript array needs zero infrastructure and is adequate for a single fixed trip.
2. **Replaceability later** — components should not be tightly coupled to the current data source.

## Decision

Activity data lives in `src/lib/data/activities.ts` as a typed TypeScript array. Components never import this file directly. They call a server function in `src/lib/api/activities.ts` (marked `"use server"`) which reads from the data file and returns typed results.

`src/lib/api/activities.ts` is the single swap point: replacing the static array with a database query touches only that file.

Day status (`past` / `current` / `future`) is computed client-side from the current date so the dev `?mockDate` URL param flows through without requiring the server to know about it.

## Consequences

- Zero infrastructure required for the initial build.
- Switching to a database only touches the API layer — routes and components are unchanged.
- Server functions become HTTP RPC endpoints automatically; components call them like regular async functions.
- `src/lib/data/activities.ts` is the only file that needs editing to update the itinerary.
