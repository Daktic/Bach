# ADR 0001 — Record architecture decisions

**Date:** 2026-09-20
**Status:** Accepted

## Context

As the Bach project grows, significant architectural choices will be made. Without a lightweight record, the reasoning behind those choices is lost — future contributors face decisions that look arbitrary and risk relitigating them without context.

## Decision

We will use Architecture Decision Records (ADRs) to document significant architectural decisions.

- **Location:** `docs/adr/`
- **Index:** `docs/adr/README.md` — every ADR is listed here with its status
- **Naming:** `NNNN-short-hyphenated-title.md` (four-digit zero-padded sequence)
- **Format:** Context / Decision / Consequences (this document is the template)
- **Statuses:** Proposed → Accepted → Deprecated / Superseded by [NNNN]

An ADR is written when a decision is made, not after the fact. Superseded ADRs are kept for history; the superseding ADR references them.

## Consequences

- Decisions are easy to find and carry their rationale forward.
- New contributors can read the ADR log to understand why the codebase is shaped the way it is.
- The overhead is low: one short Markdown file per significant decision.
