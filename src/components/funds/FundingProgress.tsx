import { Show } from "solid-js";
import { isFullyFunded } from "~/lib/funds";
import type { PoolView } from "~/lib/types";
import { Dot } from "./Dot";
import { amountToGo, formatMoney, fundedPercent } from "./pool-status";

// Pool totals only. Nothing here is per-guest.

type Totals = Pick<PoolView, "raisedAmount" | "targetAmount">;

export function ProgressBar(props: { pool: Totals }) {
  const pct = () => fundedPercent(props.pool);

  return (
    <div
      role="progressbar"
      aria-label="Raised so far"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(pct())}
      aria-valuetext={`${formatMoney(props.pool.raisedAmount)} of ${formatMoney(props.pool.targetAmount)}`}
      class="relative h-2 overflow-hidden rounded-full bg-charcoal/10"
    >
      <div
        class={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500
                ${isFullyFunded(props.pool) ? "bg-teal" : "bg-orange"}`}
        style={{ width: `${pct()}%` }}
      />
    </div>
  );
}

/** Bar plus "$X of $Y raised" and what's left to go. */
export function FundingProgress(props: { pool: Totals }) {
  return (
    <div>
      <ProgressBar pool={props.pool} />
      <div class="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
        <span class="font-semibold text-charcoal/75">
          <span class="text-charcoal/80">{formatMoney(props.pool.raisedAmount)}</span>
          {" "}of {formatMoney(props.pool.targetAmount)} raised
        </span>
        {/* The dot matches the bar's fill. */}
        <Show
          when={isFullyFunded(props.pool)}
          fallback={
            <span class="font-bold text-charcoal">
              <Dot class="bg-orange" />
              {formatMoney(amountToGo(props.pool))} to go
            </span>
          }
        >
          <span class="font-bold text-charcoal">
            <Dot class="bg-teal" />
            Fully funded
          </span>
        </Show>
      </div>
    </div>
  );
}
