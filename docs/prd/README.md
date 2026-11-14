# Bach — Product Requirements

**Status:** Draft
**Last updated:** 2026-11-13
**Trip:** Thu Apr 8 – Mon Apr 12, 2027 · Scottsdale, AZ (fly into PHX)

This document says *what* Bach must do and *how we'll know it works*. The *how it's built* lives in [`docs/adr/`](../adr/README.md). The README's objectives are the vision; this is the checklist.

---

## 1. Problem

Planning a bachelor weekend for ~10 friends usually runs on a group chat plus a spreadsheet. Details get buried, nobody knows who has booked a flight, and the organiser chases money one Venmo request at a time.

Bach replaces that with one private, mobile-first site: the itinerary, who's arriving when, and what everyone owes, with a button to pay it.

## 2. Goals and non-goals

**Goals**

1. Every guest can answer "what's happening, when, and where" from their phone in under 10 seconds.
2. Every guest has a flight entered before the booking deadline (§9).
3. Every funding pool is fully paid before its vendor deadline, without the organiser chasing anyone manually.
4. Only invited guests can sign in. Nobody else sees anything.

**Non-goals**

- Multi-trip or multi-tenant support. This is one trip, one guest list.
- Handling card details. Payments go through Stripe (§6.4); Bach never sees card numbers.
- An admin UI. The organiser edits the guest list, itinerary and pools by hand (seed files or the database). Payment records come from Stripe.
- Booking flights inside the app. We link out.
- Desktop layouts. The phone is the only target viewport (§7).
- Native apps or push notifications (a PWA "add to home screen" is a nice-to-have).

## 3. Users and roles

| Role | Who | Can do |
|------|-----|--------|
| **Guest** | ~10 invited friends | See timeline, flights, funds; edit their own profile and flight; set their own travel status; pay their shares |
| **Organiser** | Hosts the trip; also a guest in the app | No extra permissions in the app. Maintains data by hand and checks payments in the Stripe dashboard. |
| **Outsider** | Anyone not on the guest list, even with a valid Google/Apple account | Sees `/sign-in` and a "not on the list" message. Nothing else. |

The guest list is fixed and maintained by hand. There is one kind of signed-in user.

## 4. Status legend

Each requirement below is tagged:

- **P0** — must ship before the trip, or the feature fails its purpose
- **P1** — should ship; the feature is noticeably worse without it
- **P2** — nice-to-have

And with current state: ✅ built · 🟡 partial / mock data · ⬜ not started

---

## 5. Access and authentication

OAuth proves *who* someone is. The guest list decides *whether they get in*. Both must pass.

### Requirements

| ID | Requirement | Pri | State |
|----|-------------|-----|-------|
| AUTH-1 | Guests sign in with Google or Apple | P0 | ✅ UI and Auth.js config (`basePath` fixed so sign-in completes) |
| AUTH-2 | Every route except `/sign-in` and `/api/auth/*` requires a session; unauthenticated requests redirect to `/sign-in` | P0 | ✅ middleware, plus `requireGuest()` in every server function |
| AUTH-3 | **Invite-only sign-in.** The OAuth email must match an entry on the hand-maintained guest list, checked server-side in Auth.js's `signIn` callback. No match → no session is issued and the user sees "you're not on the list". There is no self-sign-up path. | P0 | ✅ needs `GUEST_EMAILS` set ([ADR 0009](../adr/0009-invite-only-auth-with-env-guest-list.md)) |
| AUTH-4 | The session resolves to that guest's record (id, name), and that identity drives "me" everywhere (profile, my flight, my share) instead of the hardcoded `gberg` | P0 | ✅ |
| AUTH-5 | A guest who uses a different email for Google and Apple can have both listed against one guest record | P1 | ✅ list the guest once per email in `GUEST_EMAILS` |
| AUTH-6 | Guests can sign out | P1 | ✅ drawer footer and `/me` |
| AUTH-7 | After sign-in, land on the timeline (`/`) | P1 | ✅ or back to the page they first asked for |
| AUTH-8 | Remember last-used provider and highlight it on return | P2 | ✅ |

### Acceptance criteria

- Visiting any page in a private window redirects to `/sign-in`.
- Signing in with a Google account not on the guest list completes the Google step, then lands back on `/sign-in` with the "not on the list" message. No session cookie is set and no trip data is returned.
- Removing an email from the guest list blocks that person's next sign-in.
- Two different guests signed in on two phones see their own name, flight, and share.

---

## 6. Features

### 6.1 Trip timeline (home)

Guests see the whole weekend as a vertical timeline grouped by day, with today highlighted once the trip starts.

| ID | Requirement | Pri | State |
|----|-------------|-----|-------|
| TL-1 | `/` shows all trip days (Apr 8–12) with their activities in time order | P0 | ✅ |
| TL-2 | Days are marked past / current / future; the page scrolls to today during the trip | P0 | ✅ day boundaries in Arizona time |
| TL-3 | Tapping an activity opens its details: title, time range, location, description | P0 | ✅ dialog and `/activity/[id]` |
| TL-4 | Activity details include an "Open in Maps" link (and optionally an embed) when a location is set | P1 | ✅ link only, no embed (an embed needs an API key) |
| TL-5 | Activities link to their funding pool when one exists | P2 | ✅ both directions (two mock links for now) |
| TL-6 | Before departure, a countdown dialog shows once per browser session | P1 | ✅ |
| TL-7 | `/activity/[id]` works as a shareable deep link to one activity, or is removed | P2 | ✅ with a Share button |
| TL-8 | Real itinerary content replaces the TBD placeholders | P0 | 🟡 content task, hand-edited in `src/lib/data/activities.ts` |

**Acceptance:** with `?mockDate=2027-04-10`, Thu/Fri are past, Sat is current and on screen at load, Sun/Mon are future. Each activity with a `location` offers a way to open it in the phone's map app.

### 6.2 Flights

Guests see who has booked, who's in the air, and who's landed. Guests without a flight get nudged to book one.

| ID | Requirement | Pri | State |
|----|-------------|-----|-------|
| FL-1 | A guest can enter their inbound (and optional outbound) flight by flight number + date, with auto-filled details from a lookup | P0 | 🟡 lookup plus manual entry; saved on the guest's own device until FL-2. The lookup can't see future flights yet (§10 Q1) |
| FL-2 | Flights are stored server-side so every guest sees everyone's flights | P0 | ⬜ needs Turso (ADR 0007) |
| FL-3 | `/flights` lists every guest's inbound flight, sorted: in the air, boarding, upcoming, landed | P0 | 🟡 works on mock flights plus the viewer's own entry |
| FL-4 | Flight status reflects reality on travel day (delays, actual landing), falling back to schedule-based status if the API fails | P1 | 🟡 schedule-based only; provider undecided (§10 Q1) |
| FL-5 | Guests with no flight are listed separately with a "book a flight" call to action | P0 | ✅ on mock data until FL-2 |
| FL-6 | `/flights/book` searches live fares from the guest's nearest airport to PHX for the trip dates and links out to book | P1 | ✅ SerpAPI, cached, per-guest hourly limit, sign-in required |
| FL-7 | "Who's here" bar shows each guest's travel status (home / driving / flying / arrived) | P1 | 🟡 mock statuses |
| FL-8 | A guest can only change their *own* travel status; status syncs to other guests without a full reload | P1 | 🟡 own status only ✅; syncing needs server storage |
| FL-9 | Guests who drive instead of fly can say so and are not shown as "no flight" | P2 | 🟡 drivers the organiser seeds show for everyone; a guest's own toggle stays on their device until FL-2 |

**Acceptance:** guest A enters a flight on their phone; guest B refreshes `/flights` on another phone and sees it. Tapping guest B's avatar as guest A does nothing.

### 6.3 Profile (`/me`)

| ID | Requirement | Pri | State |
|----|-------------|-----|-------|
| ME-1 | Shows the signed-in guest's name and avatar (defaulting to the OAuth photo) | P0 | ✅ |
| ME-2 | Guest can edit display name and upload a photo | P1 | 🟡 saved on the guest's own device only |
| ME-3 | Guest manages their own flights here (see FL-1) | P0 | ✅ (device-only until FL-2) |
| ME-4 | Optional fields useful to the organiser: phone number, dietary needs, shirt size | P2 | ⬜ only useful once it's stored server-side |

### 6.4 Pooled funds

Shared costs (house, party bus, golf, dinner) each have a goal and a per-guest share. Guests see what they owe and pay it through Stripe. Stripe tells Bach when a payment succeeds, so nobody records payments by hand.

| ID | Requirement | Pri | State |
|----|-------------|-----|-------|
| FN-1 | `/funds` lists every pool with title, goal, amount raised, progress bar, and the guest's own share | P0 | 🟡 built on mock pools and payments |
| FN-2 | Header shows "paid up on N of M" for the signed-in guest | P0 | ✅ (mock payments) |
| FN-3 | Pool detail page explains what the pool covers and shows a **Pay $X** button for the guest's unpaid balance | P0 | ✅ includes the card fee in the share |
| FN-4 | **Pay** opens Stripe Checkout (hosted) for that guest's share of that pool. The checkout session carries the guest id and pool id so the payment can be matched. | P0 | ✅ [ADR 0010](../adr/0010-stripe-checkout-with-stripe-as-payment-record.md); works in the Bach sandbox |
| FN-5 | A Stripe webhook records each successful payment as a contribution. Raised totals and "paid up" status are derived from these records. Duplicate webhook deliveries don't double-count. | P0 | ✅ payments are read from Stripe itself until Turso; the signed webhook refreshes them (ADR 0010) |
| FN-6 | After paying, the guest returns to the pool page and sees it marked paid (allowing a few seconds for the webhook) | P0 | ✅ |
| FN-7 | Pools, per-guest shares and contributions are stored server-side; pools and shares are seeded by hand | P0 | 🟡 pools and shares hand-seeded in `src/lib/data/funds.ts`; payments live in Stripe until Turso |
| FN-8 | Each pool has an optional due date; overdue unpaid shares are highlighted to the guest | P1 | ✅ |
| FN-9 | Shares can differ per guest (e.g. the groom's share is $0 and shows no Pay button) | P1 | ✅ via `shares.overrides` |
| FN-10 | Apple Pay / Google Pay available in Checkout | P2 | ✅ Apple Pay shows in the sandbox; methods are managed in the Stripe dashboard |

**Acceptance:** in Stripe test mode, a guest taps Pay on Party Bus and completes checkout with a test card. Within a few seconds their `/funds` header increments, the pool's raised amount goes up by their share, and the Pay button is gone. Replaying the same webhook event changes nothing. A guest never sees another guest's payment status.

### 6.5 Navigation and shell

| ID | Requirement | Pri | State |
|----|-------------|-----|-------|
| NAV-1 | Hamburger drawer with Timeline, Flights, Funds, Me | P0 | ✅ |
| NAV-2 | Sign-out lives in the drawer footer | P1 | ✅ |
| NAV-3 | Installable as a PWA (manifest + icon) | P2 | ✅ manifest and icons; not yet tested on a real phone |

---

## 7. Cross-cutting requirements

**Mobile-first.** The phone is the product. Every screen is designed and tested at 375 px wide first, works one-handed, has no horizontal scroll, and has tap targets of at least 44 px. Larger screens get the same single-column layout centred on the page; no desktop-specific layouts are planned.

**Design.** American Southwest, construction-paper surfaces, palette per the README. New screens reuse `paper-card` / `paper-surface` rather than introducing new surface styles.

**Privacy.** All data is behind invite-only sign-in (AUTH-3). Per-guest payment status is visible only to that guest; the organiser uses the Stripe dashboard. API keys and secrets (SerpAPI, Aviationstack, OAuth, Stripe secret and webhook signing secret) stay server-side. The webhook verifies Stripe's signature before trusting any payload.

**Time zones.** Displayed times never shift based on the viewer's phone time zone.

- **Trip times** (itinerary, countdown, day boundaries) are Arizona time (MST, no DST).
- **Flight times** show what the flight data gives us, which is normally the airport's local time: departure in the origin's time zone, arrival in the destination's. A 9:00 departure from JFK reads 9:00, not 6:00.
- Flight times are stored with their UTC offset (or airport time zone) so status and progress (FL-3, FL-4) are computed on real instants, not on bare local times.

**Reliability on travel day.** If a third-party flight API is down or over quota, `/flights` still renders using scheduled times.

**Cost.** Third-party API spend for the whole trip stays under ~$20 (Stripe fees aside). Cache flight lookups and searches rather than calling on every render. Beyond the cache, each guest gets at most 20 fare searches or booking links and 10 flight lookups an hour. The server fixes the fare search's destination and dates, and lookups only accept dates within a week of the trip.

**Dev ergonomics.** `?mockDate=YYYY-MM-DD` (or `YYYY-MM-DDTHH:MM`, read as Arizona time) keeps working in dev for every time-dependent view. Stripe runs in test mode outside production.

---

## 8. Data model (target)

Builds on ADR 0007. Names are indicative. Rows marked *hand-seeded* are maintained by the organiser, not through the app.

```
guests         id, name, avatar_url?, phone?, created_at                     (hand-seeded)
guest_emails   email (unique), guest_id                                       (hand-seeded; AUTH-3/5 allow-list)
flights        id, guest_id, direction (in|out), flight_number, airline,
               origin, destination, departs_at, arrives_at, last_status?, updated_at
travel_status  guest_id, status (home|car|plane|arrived), updated_at
pools          id, title, description, image?, target_amount, due_date?, sort  (hand-seeded)
pool_shares    pool_id, guest_id, amount                                      (hand-seeded)
contributions  id, pool_id, guest_id, amount, stripe_session_id (unique), paid_at
```

`currentAmount` and "my contribution" become derived values from `contributions`, not stored fields. The unique `stripe_session_id` makes webhook handling idempotent.

**Until Turso is set up:** `guests` lives in `src/lib/data/guests.ts`. `guest_emails` is the `GUEST_EMAILS` environment variable, because the repo is public ([ADR 0009](../adr/0009-invite-only-auth-with-env-guest-list.md)). `pools` and `pool_shares` live in `src/lib/data/funds.ts`. `flights`, `travel_status` and `contributions` are mock seed data, and each guest's own entries stay in their browser. The pages read all of it through the server functions in `src/lib/api/`, so swapping in the database only touches that layer and the data files.

---

## 9. Milestones

Dates work back from the trip. Adjust as plans firm up.

| Milestone | Target | Scope |
|-----------|--------|-------|
| **M1 — Locked down** | Dec 2026 | AUTH-2–4, AUTH-6–7, NAV-2; Turso wired up with `guests` + `guest_emails` |
| **M2 — Flights for real** | Jan 2027 | FL-1–3, FL-5, ME-1–3. Send invites; this is when guests start booking. |
| **M3 — Money** | Feb 2027 | FN-1–7 with Stripe Checkout + webhook. Collect deposits before vendor deadlines. |
| **M4 — Travel-day polish** | Mar 2027 | FL-4, FL-7–8, TL-4, FN-8–9, AUTH-5, FL-9, final itinerary content (TL-8) |
| **Trip** | Apr 8–12, 2027 | Freeze. Bug fixes only. |

**Status (2026-11-14):** everything that doesn't need outside setup is built and has been through a security, time-zone and accessibility review: M1 apart from Turso, the M2 flows on mock data, M3 including Stripe payments (test mode), and most of M4. What's left is setup (§12) plus FL-2, FL-4, FN-7 storage and ME-4.

**Booking deadline for guests:** TBD (suggest ~8 weeks out, mid-Feb 2027).

---

## 10. Open questions

1. **Flight status provider.** ADR 0008 picks AeroDataBox, but the code uses Aviationstack for lookup and SerpAPI for fare search. Which is the live-status source? Supersede or update ADR 0008 to match. Aviationstack's `/flights` endpoint, which the lookup uses, only covers today's and past flights, so it can't find an April 2027 flight ahead of time. The form then says the lookup isn't available and offers manual entry. Looking up future flights needs Aviationstack's future-schedules endpoint (paid plans) or another provider.
2. ~~**Auth library.**~~ Answered by [ADR 0009](../adr/0009-invite-only-auth-with-env-guest-list.md): Auth.js with JWT sessions, an invite list in `GUEST_EMAILS`, no database adapter.
3. ~~**Stripe fees.**~~ Answered: pools absorb the fee. Each share is grossed up so the pool nets the full cost after Stripe's 2.9% + 30¢ (ADR 0010).
4. ~~**Payment storage.**~~ Answered by [ADR 0010](../adr/0010-stripe-checkout-with-stripe-as-payment-record.md): Checkout Sessions tagged with guest and pool, read back from Stripe.
5. **Realtime transport** for "Who's here" (FL-8): polling every 30 s is probably enough for 10 people. SSE only if that feels laggy.
6. **Post-trip.** Does the site become a read-only memory (photos?) or get taken down?
7. **SerpAPI booking links.** `resolveBookingUrl` sends a round-trip `departure_token`, which SerpAPI may not accept for booking options. If so, tapping a fare always falls back to the Kayak link. Check against SerpAPI's docs before relying on direct airline links.
8. **Real content in a public repo.** Everything in `src/lib/data/` (itinerary, pools, shares, guest names) can be read on GitHub, whatever the sign-in gate does. Before real addresses, times and amounts go in (TL-8, FN-7), either make the repo private or move that data to Turso (§12 step 4).

---

## 11. Known gaps in the current code

Fixed in this pass: sign-in now lands on `/`, per-guest fund values moved into shares and payments, "Who's here" only lets you change your own status, `/activity/[id]` is a real page, `package.json` is named `bach`, and flight times carry their airport's offset. Also fixed: two bugs that blocked sign-in (Auth.js `basePath`) and flight lookup (API key name).

A review then hardened the post-sign-in redirect, blocked cross-site calls to server functions, and stopped Back after sign-out from showing a cached signed-in page. It also capped paid API calls per guest, and made the flight lookup tell "no such flight" apart from "lookup not available". Unknown URLs now get a real 404 page, every page has its own title, and text contrast meets WCAG AA on the paper background.

Still open:

- Flights and "Who's here" statuses are mock seed data until FL-2. Payments are real Stripe (test mode) once `STRIPE_SECRET_KEY` is set, mock without it.
- A refunded payment still counts as paid (ADR 0010). Adjust the guest's share by hand if you refund someone.
- A guest the organiser marks as driving (`arrivesBy: "drive"`) shows as driving to everyone until FL-2. On their own phone, adding a flight on `/me` replaces it. To change it for everyone, edit `src/lib/data/guests.ts`.
- `src/lib/api/amadeus.ts` actually calls SerpAPI. The name is historical.

---

## 12. Setup still needed (outside the code)

1. `.env.local`: set `AUTH_SECRET` (currently empty) and `GUEST_EMAILS` (see `.env.example`). Without them, nobody can sign in, including you.
2. Google and Apple OAuth: add `<site>/api/auth/callback/google` and `<site>/api/auth/callback/apple` as redirect URIs.
3. Hosting: the same variables in the production environment.
4. Turso (ADR 0007), for FL-2, FL-8 sync, ME-2/ME-4 persistence and payment records.
5. Stripe: done in the Bach sandbox (test mode). For production: activate the account, create a live restricted key (`rk_live_…`, Checkout Sessions write), add a webhook endpoint at `https://<site>/api/stripe/webhook` for the four `checkout.session.*` events, and set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the host.
6. Real content: itinerary (TL-8), pools, shares, due dates and the groom's $0 override (FN-9). Decide first where it lives, since the repo is public (§10 Q8).
7. A flight-data plan that covers future flights, for the FL-1 lookup and FL-4 live status (§10 Q1). Until then, guests enter flights by hand.
