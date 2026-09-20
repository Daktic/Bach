# ADR 0005 — Timeline as homepage with pre-trip countdown dialog

**Date:** 2026-09-20
**Status:** Proposed

## Context

The app needs a natural landing screen for guests after sign-in. The four candidate sections are Timeline, Flights, Funds, and Me.

Before the trip departs there is also an opportunity to build anticipation — guests arriving at the site weeks or days out will want to know how long until the trip starts, not just a static itinerary.

## Decision

**The Timeline (`/`) is the homepage.** It is the most information-rich view for guests at every stage: before the trip (what's coming up), during (what's next, what we just did), and after (a record of the trip).

**A countdown dialog renders on top of the timeline before a hardcoded departure date.** The date is a constant in `src/lib/config.ts`. When the current date is before that date the dialog appears on first load (or first load per session — stored in sessionStorage so it doesn't re-fire on every navigation). The guest dismisses it with a single tap. After the departure date the dialog is never shown.

The dialog will display:
- Days / hours / minutes until departure (live countdown via `setInterval`)
- A short hype line (hardcoded copy)
- A dismiss button

## Consequences

- Guests always land on the richest contextual view regardless of where they are in the trip.
- The countdown creates a moment of delight pre-trip without permanently occupying screen real estate.
- Hardcoding the date keeps the implementation simple; there is no admin UI needed to configure it.
- `src/lib/config.ts` becomes the single place to update the date — it should be clearly commented.
- After the departure date, no code path reaches the dialog; it can be deleted post-trip during cleanup.
