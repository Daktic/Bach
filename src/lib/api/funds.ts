"use server";

import { getRequestEvent } from "solid-js/web";
import { dollarsToCents } from "~/lib/card-fees";
import { activityData } from "~/lib/data/activities";
import { mockContributions, pools } from "~/lib/data/funds";
import { guestIds } from "~/lib/data/guests";
import { balanceDue, toPoolView } from "~/lib/funds";
import { withForwardedOrigin } from "~/lib/server/forwarded";
import { requireGuest } from "~/lib/server/session";
import {
  GUEST_KEY,
  POOL_KEY,
  contributionFromSession,
  invalidatePayments,
  isStripeConfigured,
  listContributions,
  stripeClient,
} from "~/lib/server/stripe";
import type { Contribution, Pool, PoolView } from "~/lib/types";

// Privacy: each guest only ever receives their own share and payments.
// Totals (raised so far) are shared; per-guest status is not.

// Tags Bach's sessions in the Stripe Dashboard (Stripe recommends a label
// ending in 8 random letters).
const INTEGRATION_ID = "bach-pool-share-qhvmtzrk";

const roster = [...guestIds];

function activitiesFor(poolId: string) {
  return activityData
    .filter((a) => a.poolId === poolId)
    .map((a) => ({ id: a.id, title: a.title }));
}

/** Payments from Stripe once it's set up (ADR 0010), mock data before that. */
async function contributions(): Promise<readonly Contribution[]> {
  return isStripeConfigured() ? listContributions() : mockContributions;
}

function viewFor(pool: Pool, all: readonly Contribution[], guestId: string): PoolView {
  return toPoolView(pool, all, guestId, roster, {
    activities: activitiesFor(pool.id),
    canPay: isStripeConfigured(),
  });
}

export async function getMyPools(): Promise<PoolView[]> {
  const { guest } = await requireGuest();
  const all = await contributions();
  return pools.map((p) => viewFor(p, all, guest.id));
}

export async function getMyPool(id: string): Promise<PoolView | null> {
  const { guest } = await requireGuest();
  const pool = pools.find((p) => p.id === id);
  if (!pool) return null;
  return viewFor(pool, await contributions(), guest.id);
}

/** Where Stripe sends the guest back: the address they're using (including an ngrok tunnel in dev). */
function siteOrigin(): string {
  const event = getRequestEvent();
  if (!event) throw new Error("No request");
  return new URL(withForwardedOrigin(event.request).url).origin;
}

/**
 * FN-4: a Stripe Checkout page for the signed-in guest's unpaid balance on
 * one pool. Returns its URL; the browser goes there. The amount is always
 * worked out here on the server, never sent by the browser.
 */
export async function startCheckout(poolId: string): Promise<{ url: string }> {
  const { guest, email } = await requireGuest();
  const stripe = stripeClient();
  if (!stripe) throw new Error("Card payments aren't set up yet.");
  const pool = pools.find((p) => p.id === poolId);
  if (!pool) throw new Error("We couldn't find that pool.");

  try {
    // Fresh numbers, so nobody is charged twice for a payment that just landed.
    invalidatePayments();
    const due = balanceDue(viewFor(pool, await listContributions(), guest.id));
    if (due <= 0) throw new UserFacingError("You're already paid up for this one.");
    const amount = dollarsToCents(due);

    // A second tap (or another tab) reuses the checkout page already open for
    // the same amount, rather than opening a second one that could be paid too.
    for await (const open of stripe.checkout.sessions.list({ status: "open", limit: 100 })) {
      if (
        open.metadata?.[POOL_KEY] === pool.id &&
        open.metadata?.[GUEST_KEY] === guest.id &&
        open.amount_total === amount &&
        open.url
      ) {
        return { url: open.url };
      }
    }

    const metadata = { [POOL_KEY]: pool.id, [GUEST_KEY]: guest.id };
    const origin = siteOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: `${pool.title}: your share`,
              description: "Includes the card processing fee, so the pool gets the full amount.",
            },
          },
        },
      ],
      customer_email: email,
      client_reference_id: guest.id,
      metadata,
      payment_intent_data: { metadata, description: `Bach: ${pool.title} (${guest.name})` },
      success_url: `${origin}/funds/${pool.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/funds/${pool.id}?checkout=cancelled`,
      integration_identifier: INTEGRATION_ID,
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return { url: session.url };
  } catch (err) {
    if (err instanceof UserFacingError) throw new Error(err.message);
    console.error("[stripe] couldn't start checkout", err);
    throw new Error("Couldn't open the payment page. Try again in a moment.");
  }
}

class UserFacingError extends Error {}

export type CheckoutReturn = "paid" | "processing" | "unknown";

/**
 * After Stripe sends the guest back (FN-6): refresh the payment list so the
 * pool shows as paid straight away. Fulfilment doesn't depend on this: the
 * payment is in Stripe either way, and the webhook also refreshes it.
 */
export async function confirmCheckout(sessionId: string): Promise<CheckoutReturn> {
  const { guest } = await requireGuest();
  const stripe = stripeClient();
  if (!stripe || typeof sessionId !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return "unknown";
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.[GUEST_KEY] !== guest.id) return "unknown";
    invalidatePayments();
    if (contributionFromSession(session)) return "paid";
    return session.status === "complete" ? "processing" : "unknown";
  } catch (err) {
    console.warn("[stripe] couldn't confirm checkout", err);
    return "unknown";
  }
}
