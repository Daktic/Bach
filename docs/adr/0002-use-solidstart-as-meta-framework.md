# ADR 0002 — Use SolidStart as the application meta-framework

**Date:** 2026-09-20
**Status:** Accepted

## Context

The project requires server-side rendering (SSR) for performance and SEO. Two primary paths were evaluated:

1. **Next.js + React** — the most widely adopted SSR meta-framework
2. **SolidStart** — SolidJS's first-party meta-framework, built on Vinxi/Nitro

A third option was considered: pairing SolidJS on the frontend with a standalone server (e.g. Hono or Express) and wiring SSR manually. This was set aside because it adds significant integration overhead with no compelling benefit over a purpose-built meta-framework.

The team has an interest in deepening SolidJS experience, and has a preference for Solid's fine-grained reactivity model over React's virtual DOM diffing approach.

## Decision

We will use **SolidStart** as the meta-framework for this project, with SSR enabled.

## Consequences

- SSR works out of the box via SolidStart's Nitro adapter layer, with deployment targets selectable at build time (Node, Bun, Deno, static, Cloudflare, etc.).
- The team builds SolidJS expertise rather than extending existing React/Next.js knowledge.
- Solid's fine-grained reactivity means components re-render at the signal level, not the component tree level — less wasted work, simpler mental model for state-driven UIs.
- SolidStart's ecosystem is smaller than Next.js. Some third-party integrations (auth libraries, UI component kits) will require more research or adaptation.
- Switching to Next.js later would be a significant rewrite; this decision should be treated as durable.
