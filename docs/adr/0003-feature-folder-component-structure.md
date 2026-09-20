# ADR 0003 — Feature-folder component structure

**Date:** 2026-09-20
**Status:** Proposed

## Context

SolidStart's file-based router owns `src/routes/` — one file per page, with dynamic segments via `[param]`. Beyond that, the project needs a convention for where components, utilities, and styles live.

Two options were considered:

1. **Flat `components/`** — all components in one directory. Simple at first, noisy as the codebase grows.
2. **Feature folders** — components grouped by the feature they belong to, with a shared `common/` for cross-feature primitives.

This project has four clearly distinct feature areas: Timeline, Flights, Funds, and Navigation/Shell. They are unlikely to collapse into one another.

## Decision

We will use a feature-folder structure under `src/`:

```
src/
  routes/              # file-based pages (SolidStart)
    index.tsx          # Timeline — home
    flights/
    funds/
    me/
    activity/[id].tsx  # Activity detail
  components/
    common/            # Shared primitives: Button, Card, Dialog, …
    nav/               # App shell: TopBar, Drawer
    timeline/          # Timeline-specific components
    flights/           # Flight-specific components
    funds/             # Funds-specific components
  lib/                 # Utilities, API helpers, typed constants
  styles/              # Global CSS, design tokens
```

Components that are used in more than one feature area belong in `common/`. Components only ever used within a single feature stay in that feature's folder.

## Consequences

- New features get a clearly named folder; there is no ambiguity about where a component belongs.
- `common/` stays intentionally lean — resist moving things there prematurely.
- The flat-file simplicity of early development is traded for a structure that scales without constant reorganisation.
