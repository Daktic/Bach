# ADR 0010 — Pool payments: Stripe Checkout, with Stripe as the payment record

**Date:** 2026-11-14
**Status:** Proposed

## Context

Guests pay their share of each pool (PRD FN-3 to FN-6). Bach must never handle card details, and the organiser has no admin view: they use the Stripe dashboard. The PRD planned for a webhook that writes each payment to a `contributions` table, but Turso (ADR 0007) isn't set up yet, so there's nowhere to write.

The organiser decided that pools absorb Stripe's card fee (2.9% + 30¢ per payment): whatever a pool costs, guests' shares are grossed up so the pool still nets the full cost.

Stripe is a separate account ("Bach") under the organiser's login, not the account of another project. That keeps statement names, payouts and reporting apart.

## Decision

1. **Stripe Checkout (hosted), one session per guest per pool.** The server function `startCheckout(poolId)` works out the guest's unpaid balance on the server. The browser never sends an amount. The session is created with inline `price_data` in USD, `customer_email`, and metadata `bach_pool` / `bach_guest` (on the session and on its PaymentIntent). It also sets success and cancel URLs back to the pool page, and an `integration_identifier` label. `payment_method_types` is not set, so Stripe's dynamic payment methods decide what's offered: cards, Apple Pay, Google Pay, and anything else enabled in the dashboard.
2. **Stripe is the record of payments until there's a database.** A contribution is a Checkout Session with Bach metadata and `payment_status: "paid"`, read back with `checkout.sessions.list`. Totals, "paid up" and overdue status are derived from those records. Nothing has to be kept in sync, and a payment can't be lost to a missed webhook. The list is cached in memory for 60 seconds.
3. **A signed webhook at `/api/stripe/webhook`.** It verifies Stripe's signature (`STRIPE_WEBHOOK_SECRET`) and, for `checkout.session.completed`, `async_payment_succeeded`, `async_payment_failed` and `expired`, clears the cached payment list. Fulfilment is reading Stripe, so the webhook only makes payments show up sooner, including delayed payment methods that turn "paid" later. The route is public; the signature is the authentication.
4. **The return page confirms, it doesn't fulfil.** On `?checkout=success&session_id=…` the pool page calls `confirmCheckout`. That checks the session belongs to the guest, clears the cache and shows "Payment received", "processing" or "checking". Payment state never depends on this page loading.
5. **Card fees are built into shares.** `cost` and `shares` in `src/lib/data/funds.ts` are before fees. A guest is charged `withCardFees(share)`: the smallest amount that nets the share after Stripe's fee ($320 → $329.87). A pool's target is the sum of those charges. A data test checks that each pool's shares cover its cost.
6. **No double charges from the same guest.** Before creating a session the server re-reads payments without the cache. If the guest is already paid up it refuses. If an open session for the same guest, pool and amount exists, it returns that one instead of creating a second.
7. **Without `STRIPE_SECRET_KEY`, the app shows mock payments and a disabled Pay button**, as before.
8. **Open pools (the Food & Drink Fund)** set `open: { presets }` with a $0 share and no cost. The guest picks a preset or types a whole-dollar amount ($1–$500). The server validates it and charges `withCardFees(amount)`, so the fund gets the chosen amount. There's no "already paid" check, because guests can chip in as often as they like. Open pools never count toward "paid up" and have no goal or due date.
9. **Pick-your-group pools (golf)** set `choices` (id, title, price) with a $0 share and no cost. The guest picks a group and pays in one step. The group goes into the session metadata as `bach_choice`, so the payment is the record of who's in which group, and player counts per group come from paid sessions. Until a guest has paid, they count as "still to pick" and as not paid up, and as overdue after the due date. Once they've paid for one group they can't pay for another; the organiser switches them by refunding in Stripe. With a database, picks could be stored before paying.

## Consequences

- Payments work without Turso. When Turso lands, the webhook can also write `contributions` rows; the derivation stays the same.
- Each funds page view may page through the account's completed Checkout Sessions (cached 60 seconds). For about ten guests and four pools that's a handful of sessions. A busy account would need the database instead.
- The cache is per server instance. With several instances, another instance can show a payment up to 60 seconds late.
- Refunds and disputes are handled in the Stripe dashboard. A refunded session still has `payment_status: "paid"`, so a refund doesn't reduce the guest's "paid" total. Fix it by hand (lower the guest's share) or add refund handling with the database.
- Stripe recommends a restricted key (`rk_…`) with Checkout Sessions write access over a full secret key. Use one in production.
- Partial payments are supported: Pay always charges the remaining balance.
