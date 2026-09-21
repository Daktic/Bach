import { Show } from "solid-js";
import { A } from "@solidjs/router";
import type { FundingPool } from "~/lib/types";

interface Props {
  pool: FundingPool;
}

function PaidStamp() {
  return (
    <div class="absolute top-4 left-4 -rotate-[18deg] select-none pointer-events-none z-10">
      {/* Outer stamp border */}
      <div class="border-[3px] border-teal/80 rounded-[3px] px-3 py-1
                  shadow-[inset_0_0_0_1.5px_rgba(98,216,199,0.25)]">
        {/* Inner border via ring */}
        <div class="border border-teal/30 rounded-[1px] px-1">
          <span class="block text-[11px] font-black uppercase tracking-[0.3em] text-teal/85
                       leading-tight">
            Paid
          </span>
        </div>
      </div>
    </div>
  );
}

function FundingBar(props: { pool: FundingPool }) {
  const pct = () => Math.min(100, (props.pool.currentAmount / props.pool.targetAmount) * 100);
  const isComplete = () => props.pool.currentAmount >= props.pool.targetAmount;
  const remaining = () => props.pool.targetAmount - props.pool.currentAmount;

  return (
    <div class="px-4 pb-5 pt-3 border-t border-charcoal/8">
      {/* Bar */}
      <div class="relative h-2 rounded-full bg-charcoal/10 overflow-hidden">
        <div
          class={`absolute inset-y-0 left-0 rounded-full transition-all duration-500
                  ${isComplete() ? "bg-teal" : "bg-orange"}`}
          style={{ width: `${pct()}%` }}
        />
      </div>

      {/* Amounts */}
      <div class="flex justify-between items-baseline mt-2">
        <span class="text-xs font-semibold text-charcoal/55">
          ${props.pool.currentAmount.toLocaleString()} raised
        </span>
        <Show
          when={isComplete()}
          fallback={
            <span class="text-xs font-bold text-orange">
              ${remaining().toLocaleString()} to go
            </span>
          }
        >
          <span class="text-xs font-bold text-teal">Fully funded</span>
        </Show>
      </div>
    </div>
  );
}

export function FundingCard(props: Props) {
  const isPaid = () => props.pool.myContribution >= props.pool.myShare;

  return (
    <A
      href={`/funds/${props.pool.id}`}
      class="block paper-card rounded-2xl overflow-hidden
             hover:opacity-90 active:scale-[0.99] transition-all duration-150"
    >
      {/* Hero image / gradient area */}
      <div class="relative h-48 overflow-hidden">
        <Show
          when={props.pool.image}
          fallback={
            <div
              class="absolute inset-0"
              style={{ background: props.pool.placeholderGradient }}
            />
          }
        >
          <img
            src={props.pool.image}
            alt={props.pool.title}
            class="absolute inset-0 w-full h-full object-cover"
          />
        </Show>

        {/* Subtle vignette so text stamps read clearly */}
        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        <Show when={isPaid()}>
          <PaidStamp />
        </Show>
      </div>

      {/* Title + description */}
      <div class="px-4 pt-4 pb-3">
        <h3 class="text-lg font-black text-charcoal leading-tight">
          {props.pool.title}
        </h3>
        <p class="mt-1.5 text-sm text-charcoal/55 leading-relaxed">
          {props.pool.description}
        </p>

        {/* Per-person share callout */}
        <p class="mt-2.5 text-xs font-semibold text-charcoal/40">
          Your share: <span class="text-charcoal/70">${props.pool.myShare}</span>
        </p>
      </div>

      <FundingBar pool={props.pool} />
    </A>
  );
}
