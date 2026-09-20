# Bach

A private bachelor party website for invited guests. Built with SolidStart (SSR), TypeScript, and Tailwind CSS. Mobile-first.

---

## Objectives

These are goals and intentions, not hard feature requirements. Priorities will shift as the project evolves.

### Access & Authentication

- **Password gate** — guests enter a shared password once to unlock the site; after that they move straight to OAuth
- **OAuth sign-in** — Google is the primary provider; additional providers (e.g. Apple, GitHub) are aspirational
- **Persistent sessions** — last-used sign-in method is stored in localStorage so returning guests skip the gate and land straight in
- **Admin role** — at least one user (the organiser) has elevated access to see private information across all guests

### Trip Timeline

- A visual progress timeline showing the full itinerary: what's happened, what's coming up, how far along the trip is
- Each activity is tappable and opens a detail view with description, timings, and a map embed
- Timeline is the natural home screen for guests

### Flight Tracker

- Guests can enter their own flight details (airline, flight number, arrival time)
- A compiled view shows all guests' flights: who has landed, who's in the air, who's arriving next
- Guests who haven't entered flight info are prompted to find / purchase a ticket

### Pooled Funds

- Expenses (e.g. Airbnb, activities) can have a funding goal attached
- Guests see a live progress bar toward the goal
- Admin can see contribution status per guest — who has paid, who hasn't
- May be tied to individual activities or surfaced as a separate section

### Design System

**Theme:** American Southwest — sun-bleached desert, warm adobe, turquoise accents.

**Surfaces:** Thick construction-paper texture — matte, tactile. Not flat material design; not glassmorphism.

**Palette:**

| Token | Hex | Use |
|-------|-----|-----|
| Teal | `#62d8c7` | Primary accent, interactive elements |
| Orange | `#ef6917` | Highlights, CTAs, badges |
| Cream | `#f9f7db` | Default surface / background |
| Charcoal | `#454346` | Body text, borders |

**Viewport:** Mobile-first. Every feature must work well on a phone screen. Desktop is a nice-to-have.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Meta-framework | SolidStart (SSR) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Testing | Vitest |
| Linting | ESLint + Prettier |
| Package manager | pnpm |

See [`docs/adr/`](docs/adr/README.md) for the reasoning behind key decisions.

---

## Development

```bash
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm build
pnpm start
```
