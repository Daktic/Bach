import { clientOnly } from "@solidjs/start";
import { Suspense } from "solid-js";

// clientOnly: the page polls for everyone's changes while it's open, and
// keeps its own state between them (ADR 0012).
const RidesRoom = clientOnly(() => import("~/components/rides/RidesRoom").then((m) => ({ default: m.RidesRoom })));

export default function RidesPage() {
  return (
    <div class="mx-auto max-w-lg space-y-5 px-4 py-6">
      <div>
        <h1 class="text-2xl font-black text-charcoal">Rides</h1>
        <p class="mt-1 text-sm text-charcoal/75">
          Sort the crew into cars, book them in Uber or Lyft, and keep track of who's paid back.
        </p>
      </div>
      <Suspense>
        <RidesRoom
          fallback={
            <div class="space-y-4" aria-busy="true">
              <span class="sr-only">Loading rides…</span>
              <div aria-hidden="true" class="paper-card h-11 animate-pulse rounded-xl" />
              <div aria-hidden="true" class="paper-card h-64 animate-pulse rounded-2xl" />
            </div>
          }
        />
      </Suspense>
    </div>
  );
}
