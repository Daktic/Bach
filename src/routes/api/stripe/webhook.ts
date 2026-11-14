import type { APIEvent } from "@solidjs/start/server";
import { invalidatePayments, stripeClient } from "~/lib/server/stripe";

// Stripe's payment notifications (FN-5, ADR 0010). Payments are read from
// Stripe itself, so there's nothing to write here: a verified event about a
// Checkout Session clears the cached payment list, and the next page view
// shows the payment. That covers delayed payment methods too, which only
// turn "paid" later (async_payment_succeeded).
//
// Public route (no Bach session): the signature check is the authentication.

const HANDLED = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export async function POST({ request }: APIEvent) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    console.warn("[stripe] webhook received but STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET isn't set");
    return new Response("Webhook not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event;
  try {
    // The raw body, exactly as sent: re-serialised JSON wouldn't verify.
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (HANDLED.has(event.type)) {
    invalidatePayments();
    console.info(`[stripe] ${event.type} ${(event.data.object as { id?: string }).id ?? ""}`);
  }
  return Response.json({ received: true });
}
