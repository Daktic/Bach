# Bach

A private bachelor party website for invited guests. Built with SolidStart (SSR), TypeScript, and Tailwind CSS. Mobile-first.

---

## Objectives

These are goals and intentions. Detailed requirements, priorities and acceptance criteria live in [`docs/prd/`](docs/prd/README.md).

### Access & Authentication

- **OAuth sign-in** — Google and Apple
- **Invite-only** — the OAuth email must match the hand-maintained guest list; anyone else is turned away and no session is issued. There is no self-sign-up.
- **Persistent sessions** — returning guests land straight in; the last-used provider is remembered
- **No admin role** — every signed-in user is a guest. The organiser maintains the guest list, itinerary and pools by hand.

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
- Guests see a live progress bar toward the goal and their own share
- Guests pay their share through Stripe Checkout; a Stripe webhook records the payment automatically
- The organiser checks who has paid in the Stripe dashboard
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

**Viewport:** Mobile-first. The phone is the product; every screen is designed at 375 px first. Larger screens get the same single-column layout, centred.

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
