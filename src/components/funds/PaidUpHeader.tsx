import { createMemo, For, Match, Show, Switch } from "solid-js";
import { isOverdue, isPaidUp } from "~/lib/funds";
import type { PoolView } from "~/lib/types";
import { formatMoney, paidUpSummary } from "./pool-status";

interface Props {
  pools: PoolView[];
  /** Set after mount; null during SSR and hydration so both renders match. */
  now: Date | null;
}

/** FN-2: "Paid up on N of M" for the signed-in guest. $0 shares aren't counted. */
export function PaidUpHeader(props: Props) {
  const summary = createMemo(() => paidUpSummary(props.pools));

  const overdue = (pool: PoolView) => {
    const now = props.now;
    return now !== null && isOverdue(pool, now);
  };
  const overdueCount = () => summary().counted.filter(overdue).length;

  return (
    <div class="paper-card flex items-center justify-between gap-4 rounded-xl px-4 py-4">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">
          Your status
        </p>
        {/* Emphasis is weight, not teal/orange (too light for text); the pips
            carry the colours. */}
        <Switch
          fallback={
            <>
              <p class="mt-0.5 text-sm font-bold text-charcoal">
                Paid up on{" "}
                <span class="font-black">{summary().paid} of {summary().total}</span>
              </p>
              <p class="mt-0.5 text-xs font-semibold text-charcoal/75">
                {formatMoney(summary().outstanding)} left to pay
                <Show when={overdueCount() > 0}>
                  {" · "}
                  <span class="font-bold text-charcoal">{overdueCount()} overdue</span>
                </Show>
              </p>
            </>
          }
        >
          <Match when={summary().total === 0}>
            <p class="mt-0.5 text-sm font-bold text-charcoal">Nothing to pay</p>
            <p class="mt-0.5 text-xs font-semibold text-charcoal/75">
              You don't have a share in any pool.
            </p>
          </Match>
          <Match when={summary().paid === summary().total}>
            <p class="mt-0.5 text-sm font-bold text-charcoal">
              <span class="font-black">All paid up</span> — you're good to go
            </p>
          </Match>
        </Switch>
      </div>

      {/* One pip per pool you have a share in */}
      <Show when={summary().total > 0}>
        <div aria-hidden="true" class="flex max-w-[45%] shrink-0 flex-wrap justify-end gap-1">
          <For each={summary().counted}>
            {(pool) => (
              <span
                class={`h-2.5 w-2.5 rounded-full transition-colors
                        ${isPaidUp(pool) ? "bg-teal" : overdue(pool) ? "bg-orange" : "bg-charcoal/20"}`}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
