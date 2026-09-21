import { useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { mockFundingPools } from "~/lib/data/funds";

export default function FundingDetailPage() {
  const params = useParams();
  const pool = () => mockFundingPools.find(p => p.id === params.id);

  return (
    <Show when={pool()} fallback={<p class="p-8 text-center text-sm text-charcoal/40">Pool not found.</p>} keyed>
      {(p) => (
        <div class="mx-auto max-w-lg">
          {/* Back arrow */}
          <div class="px-4 py-3">
            <a
              href="/funds"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/50 hover:text-charcoal transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
              Back to funds
            </a>
          </div>

          {/* Hero */}
          <div
            class="h-56 w-full"
            style={{ background: p.image ? undefined : p.placeholderGradient }}
          >
            <Show when={p.image}>
              <img src={p.image} alt={p.title} class="w-full h-full object-cover" />
            </Show>
          </div>

          <div class="px-4 py-6 space-y-4">

            <div>
              <h1 class="text-2xl font-black text-charcoal">{p.title}</h1>
              <p class="mt-2 text-sm text-charcoal/60 leading-relaxed">{p.description}</p>
            </div>

            {/* Funding summary */}
            <div class="paper-card rounded-xl px-4 py-4 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-charcoal/50 font-medium">Total goal</span>
                <span class="font-bold text-charcoal">${p.targetAmount.toLocaleString()}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-charcoal/50 font-medium">Raised</span>
                <span class="font-bold text-teal">${p.currentAmount.toLocaleString()}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-charcoal/50 font-medium">Your share</span>
                <span class="font-bold text-charcoal">${p.myShare.toLocaleString()}</span>
              </div>

              <div class="pt-2">
                <div class="relative h-2 rounded-full bg-charcoal/10 overflow-hidden">
                  <div
                    class={`absolute inset-y-0 left-0 rounded-full
                            ${p.currentAmount >= p.targetAmount ? "bg-teal" : "bg-orange"}`}
                    style={{ width: `${Math.min(100, (p.currentAmount / p.targetAmount) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Placeholder — payment UI comes later */}
            <div class="rounded-xl border-2 border-dashed border-charcoal/15 px-4 py-8 text-center">
              <p class="text-sm font-semibold text-charcoal/40">Payment details coming soon</p>
            </div>
          </div>
        </div>
      )}
    </Show>
  );
}
