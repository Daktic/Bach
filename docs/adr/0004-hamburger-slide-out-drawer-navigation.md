# ADR 0004 — Hamburger / slide-out drawer navigation

**Date:** 2026-09-20
**Status:** Proposed

## Context

The app has four top-level sections: Trip (Timeline), Flights, Funds, and Me. A navigation pattern is needed that works well on mobile-first screens and fits the Southwest construction-paper aesthetic.

Three options were considered:

1. **Bottom tab bar** — persistent tabs pinned to the bottom; one-thumb reachable; native mobile feel.
2. **Hamburger → slide-out drawer** — minimal top bar; full navigation hidden behind a menu icon that reveals a panel from the left/right.
3. **Top icon tabs** — tabs pinned to the top of the viewport; familiar web pattern but hard to reach on tall phones.

A bottom tab bar is the most ergonomic mobile pattern for a small set of top-level routes. However, for this project the construction-paper / southwest visual identity benefits from a clean, uncluttered surface where the content dominates. A persistent bottom bar would compete with that aesthetic and with the timeline's vertical scroll.

## Decision

We will use a **hamburger → slide-out drawer** pattern:

- A slim top bar carries the page title and the `☰` menu icon.
- Tapping `☰` slides a drawer in from the left over the content (with a dimmed overlay behind it).
- The drawer lists all four top-level sections with icons and labels.
- Tapping a nav item or the overlay closes the drawer.
- The active route is highlighted in the drawer.

On larger viewports (tablet/desktop, as a nice-to-have) the drawer can be pinned open as a sidebar.

## Consequences

- Content has the full viewport width with no permanent chrome competing for space — important for the timeline and map embeds.
- Navigation is one additional tap vs. a tab bar; acceptable for a small, known guest list who will learn the UI quickly.
- The drawer component lives in `src/components/nav/` and is part of the root layout, so it renders on every page without duplication.
- Accessibility (focus trap, escape key, aria roles) must be implemented on the drawer; this is non-trivial and should not be skipped.
