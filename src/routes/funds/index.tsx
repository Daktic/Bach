import { For, Show } from "solid-js";
import { FundingCard } from "~/components/funds/FundingCard";
import { mockFundingPools } from "~/lib/data/funds";

function PaidUpHeader() {
  const pools = mockFundingPools;
  const paidCount = () => pools.filter(p => p.myContribution >= p.myShare).length;
  const total = pools.length;
  const allPaid = () => paidCount() === total;

  return (
    <div class="paper-card rounded-xl px-4 py-4 flex items-center justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/40">
          Your status
        </p>
        <p class="mt-0.5 text-sm font-bold text-charcoal">
          <Show
            when={allPaid()}
            fallback={
              <>
                Paid up on{" "}
                <span class="text-teal">{paidCount()} of {total}</span>
              </>
            }
          >
            <span class="text-teal">All paid up</span> — you're good to go
          </Show>
        </p>
      </div>

      {/* Mini pip row */}
      <div class="flex gap-1 shrink-0">
        <For each={pools}>{(pool) => (
          <div
            class={`w-2.5 h-2.5 rounded-full transition-colors
                    ${pool.myContribution >= pool.myShare ? "bg-teal" : "bg-charcoal/20"}`}
            title={pool.title}
          />
        )}</For>
      </div>
    </div>
  );
}

export default function FundsPage() {
  return (
    <div class="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div>
        <h1 class="text-2xl font-black text-charcoal">Funds</h1>
        <p class="mt-1 text-sm text-charcoal/50">
          Pooled expenses. Contribute your portion directly.
        </p>
      </div>

      <PaidUpHeader />

      <For each={mockFundingPools}>
        {(pool) => <FundingCard pool={pool} />}
      </For>
    </div>
  );
}
