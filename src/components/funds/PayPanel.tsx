import { createSignal, Match, Show, Switch } from "solid-js";
import { startCheckout } from "~/lib/api/funds";
import { balanceDue } from "~/lib/funds";
import type { PoolView } from "~/lib/types";
import { formatMoney, shareState } from "./pool-status";

interface Props {
  pool: Pick<PoolView, "id" | "myShare" | "myPaid" | "myCardFee" | "canPay">;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5" aria-hidden="true">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4" aria-hidden="true">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );
}

/**
 * The pay area on a pool page (FN-3, FN-4). Pay opens Stripe Checkout for the
 * guest's unpaid balance; the server works out the amount. Without Stripe
 * configured, the button is shown but disabled.
 */
export function PayPanel(props: Props) {
  const state = () => shareState(props.pool);
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function pay() {
    if (pending()) return;
    setPending(true);
    setError(null);
    try {
      const { url } = await startCheckout(props.pool.id);
      // Stays "Opening checkout…" while the browser leaves for Stripe.
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't open the payment page. Try again.");
      setPending(false);
    }
  }

  return (
    <Switch>
      <Match when={state() === "none"}>
        <p class="text-sm font-bold text-charcoal">You don't owe anything for this one.</p>
        <Show
          when={props.pool.myPaid > 0}
          fallback={<p class="mt-0.5 text-xs text-charcoal/75">Your share is $0. Enjoy it.</p>}
        >
          <p class="mt-0.5 text-xs text-charcoal/75">
            You've chipped in {formatMoney(props.pool.myPaid)} anyway. Thanks!
          </p>
        </Show>
      </Match>

      <Match when={state() === "paid"}>
        <div class="flex items-center gap-3">
          {/* Like the crew bar's "Arrived" badge: filled teal, charcoal glyph. */}
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-charcoal">
            <CheckIcon />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-black text-charcoal">You're paid up</p>
            <p class="mt-0.5 text-xs text-charcoal/75">
              Your {formatMoney(props.pool.myShare)} share is covered. Thanks!
            </p>
          </div>
        </div>
      </Match>

      <Match when={(state() === "unpaid" || state() === "partial") && props.pool.canPay}>
        <button
          type="button"
          onClick={pay}
          disabled={pending()}
          aria-busy={pending()}
          aria-describedby="pay-note"
          // Charcoal on orange is 3.1:1, so the label stays large (20px bold).
          class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange px-4
                 text-xl font-black text-charcoal transition-transform active:scale-[0.98]
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal
                 disabled:cursor-wait disabled:opacity-70"
        >
          {pending() ? "Opening checkout…" : `Pay ${formatMoney(balanceDue(props.pool))}`}
        </button>
        <Show when={error()}>
          <p role="alert" class="mt-2 text-center text-sm font-semibold text-charcoal">
            {error()}
          </p>
        </Show>
        <p id="pay-note" class="mt-2 text-center text-xs text-charcoal/75">
          Secure checkout by Stripe.
          <Show when={props.pool.myCardFee > 0}>
            {" "}Includes a {formatMoney(props.pool.myCardFee)} card fee, so the pool gets your full share.
          </Show>
        </p>
      </Match>

      <Match when={state() === "unpaid" || state() === "partial"}>
        <button
          type="button"
          disabled
          aria-describedby="pay-note"
          class="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2
                 rounded-xl bg-charcoal/10 px-4 text-base font-black text-charcoal/55"
        >
          <LockIcon />
          Pay {formatMoney(balanceDue(props.pool))}
        </button>
        <p id="pay-note" class="mt-2 text-center text-xs text-charcoal/75">
          Card payments open soon.
        </p>
      </Match>
    </Switch>
  );
}
