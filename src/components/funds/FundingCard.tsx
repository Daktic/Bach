import { A } from "@solidjs/router";
import { Match, Show, Switch } from "solid-js";
import { isOverdue } from "~/lib/funds";
import type { PoolView } from "~/lib/types";
import { DueBadge } from "./DueBadge";
import { FundingProgress } from "./FundingProgress";
import { GroupCounts } from "./GroupPicker";
import { PoolHero } from "./PoolHero";
import { formatMoney, shareState } from "./pool-status";

interface Props {
  pool: PoolView;
  /** Set after mount; null during SSR and hydration so both renders match. */
  now: Date | null;
}

export function FundingCard(props: Props) {
  const state = () => shareState(props.pool);
  const myGroup = () => props.pool.choices?.find((c) => c.id === props.pool.myChoice)?.shortTitle;
  const overdue = () => {
    const now = props.now;
    return now !== null && isOverdue(props.pool, now);
  };

  return (
    <A
      href={`/funds/${encodeURIComponent(props.pool.id)}`}
      class="block overflow-hidden rounded-2xl paper-card
             transition-all duration-150 hover:brightness-[1.02] active:scale-[0.99]"
    >
      <PoolHero pool={props.pool} paid={state() === "paid"} class="h-36" />

      <div class="px-4 pb-3 pt-4">
        <h2 class="break-words text-lg font-black leading-tight text-charcoal">{props.pool.title}</h2>
        <p class="mt-1.5 break-words text-sm leading-relaxed text-charcoal/75">{props.pool.description}</p>

        {/* The viewer's own share. Never anyone else's. */}
        <div class="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p class="text-sm font-semibold text-charcoal/75">
            <Switch>
              <Match when={props.pool.open && props.pool.myPaid > 0}>
                You've chipped in <span class="font-black text-charcoal">{formatMoney(props.pool.myPaid)}</span>
              </Match>
              <Match when={props.pool.open}>
                <span class="font-bold text-charcoal">Optional</span> · chip in any amount
              </Match>
              <Match when={state() === "pick"}>
                <span class="font-bold text-charcoal">Pick your group</span> to pay
              </Match>
              <Match when={state() === "none"}>No share for you</Match>
              <Match when={state() === "partial"}>
                Paid <span class="font-black text-charcoal">{formatMoney(props.pool.myPaid)}</span>
                {" "}of {formatMoney(props.pool.myShare)}
              </Match>
              <Match when={state() === "paid" && myGroup()}>
                {myGroup()} <span class="font-black text-charcoal">{formatMoney(props.pool.myShare)}</span>
                {" · "}<span class="font-bold text-charcoal">paid</span>
              </Match>
              <Match when={state() === "paid"}>
                Your share <span class="font-black text-charcoal">{formatMoney(props.pool.myShare)}</span>
                {" · "}<span class="font-bold text-charcoal">paid</span>
              </Match>
              <Match when={state() === "unpaid"}>
                Your share <span class="font-black text-charcoal">{formatMoney(props.pool.myShare)}</span>
              </Match>
            </Switch>
          </p>
          <Show when={props.pool.dueDate}>
            {(due) => (
              <DueBadge
                dueDate={due()}
                overdue={overdue()}
                muted={state() === "paid" || state() === "none"}
              />
            )}
          </Show>
        </div>
      </div>

      <div class="border-t border-charcoal/8 px-4 pb-5 pt-3">
        {/* An open pool has no goal, so no bar: just what's been raised. */}
        <Show
          when={!props.pool.open && !props.pool.choices}
          fallback={props.pool.choices ? (
            <GroupCounts choices={props.pool.choices} undecided={props.pool.undecided} compact />
          ) : (
            <p class="text-xs font-semibold text-charcoal/75">
              <span class="font-bold text-charcoal">{formatMoney(props.pool.raisedAmount)}</span> raised so far
            </p>
          )}
        >
          <FundingProgress pool={props.pool} />
        </Show>
      </div>
    </A>
  );
}
