# ADR 0008 — AeroDataBox for live flight status

**Date:** 2026-09-20
**Status:** Proposed

## Context

The flight tracker needs real-time flight status (departed, in the air, landed, delayed). Options:

1. **Time-based computation** — derive status from the stored departure/arrival times. Simple, no cost, but doesn't reflect delays or actual landing times.
2. **AeroDataBox** — REST API via RapidAPI. Provides real-time flight position, gate departure, actual landing, delay info. ~$0.002/call.
3. **FlightAware AeroAPI** — More comprehensive but significantly more expensive.
4. **OpenSky Network** — Free, community-sourced, unreliable for commercial flights.

## Decision

We will use **AeroDataBox** via RapidAPI for live flight status.

- Guests enter their **flight number**; the server fetches current status on demand.
- The API call is proxied through a SolidStart server function (`"use server"`) so the API key never reaches the client.
- Status is refreshed when the user loads or refreshes the flights page. We do not poll in the background.
- For a 10-person guest list over a single travel day, cost is negligible (<$0.05 total).

Server function signature:
```ts
// src/lib/api/flights.ts
export async function lookupFlight(flightNumber: string, date: string): Promise<FlightLookupResult>
```

## Consequences

- An AeroDataBox API key (RapidAPI) must be set as an environment variable (`AERODATABOX_API_KEY`).
- If AeroDataBox is unavailable, the UI falls back to time-based status computed from stored times.
- The server function caches the last result per flight per day to avoid redundant calls on page reload.
- Actual landing time from the API can be stored back to Turso to reduce future API calls.
