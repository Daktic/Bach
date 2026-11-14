import { Match, Show, Switch } from "solid-js";
import { balanceDue } from "~/lib/funds";
import type { PoolView } from "~/lib/types";
import { formatMoney, shareState } from "./pool-status";

interface Props {
  pool: Pick<PoolView, "myShare" | "myPaid">;
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
 * The pay area on a pool page (FN-3). Stripe Checkout (FN-4) isn't set up
 * yet, so the Pay button is shown but disabled.
 */
export function PayPanel(props: Props) {
  const state = () => shareState(props.pool);

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
