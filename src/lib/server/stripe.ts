import "server-only";
import Stripe from "stripe";
import type { Contribution } from "~/lib/types";

// Stripe is the record of payments (ADR 0010). Until there's a database, a
// "contribution" is a paid Checkout Session tagged with Bach metadata, read
// back from Stripe. Nothing to keep in sync, and a payment can't be lost by
// a webhook that never arrived: the webhook only makes it show up sooner.

export const POOL_KEY = "bach_pool";
export const GUEST_KEY = "bach_guest";
export const CHOICE_KEY = "bach_choice";

let client: Stripe | null | undefined;

/** The Stripe client, or null when STRIPE_SECRET_KEY isn't set. */
export function stripeClient(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    client = key ? new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "Bach" } }) : null;
  }
  return client;
}

export function isStripeConfigured(): boolean {
  return stripeClient() !== null;
}

/** A paid Bach Checkout Session as a contribution; null for anything else. */
export function contributionFromSession(session: Stripe.Checkout.Session): Contribution | null {
  const poolId = session.metadata?.[POOL_KEY];
  const guestId = session.metadata?.[GUEST_KEY];
  if (!poolId || !guestId) return null;
  // "paid" only: a delayed payment method completes the session while still
  // unpaid, and only counts once Stripe says the money arrived.
  if (session.payment_status !== "paid" || session.currency !== "usd" || !session.amount_total) return null;
  return {
    id: session.id,
    poolId,
    guestId,
    amount: session.amount_total / 100,
    paidAt: new Date(session.created * 1000).toISOString(),
    ...(session.metadata?.[CHOICE_KEY] ? { choiceId: session.metadata[CHOICE_KEY] } : {}),
  };
}

// The list is cached briefly: every funds page view would otherwise page
// through Stripe. The webhook and the post-checkout return clear it, so a
// payment shows up straight away; the TTL bounds staleness if a webhook is
// missed or lands on another server instance.
const CACHE_TTL_MS = 60_000;
let cached: { contributions: Contribution[]; expiresAt: number } | null = null;

export function invalidatePayments(): void {
  cached = null;
}

/** Every Bach payment recorded in Stripe. Throws if Stripe can't be reached. */
export async function listContributions(): Promise<Contribution[]> {
  const stripe = stripeClient();
  if (!stripe) return [];
  if (cached && cached.expiresAt > Date.now()) return cached.contributions;

  const contributions: Contribution[] = [];
  for await (const session of stripe.checkout.sessions.list({ status: "complete", limit: 100 })) {
    const contribution = contributionFromSession(session);
    if (contribution) contributions.push(contribution);
  }
  cached = { contributions, expiresAt: Date.now() + CACHE_TTL_MS };
  return contributions;
}
