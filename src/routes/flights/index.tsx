import { clientOnly } from "@solidjs/start";
import { ErrorBoundary, For, Suspense } from "solid-js";

// Both read the clock and this browser's storage, so they render client-side.
const CrewStatusBar = clientOnly(() =>
  import("~/components/crew/CrewStatusBar").then(m => ({ default: m.CrewStatusBar }))
);

const FlightTracker = clientOnly(() =>
  import("~/components/flights/FlightTracker").then(m => ({ default: m.FlightTracker }))
);

/** Same footprint as the bar, so the list below doesn't jump when it loads. */
function CrewBarPlaceholder() {
  return (
    <div class="mx-auto max-w-lg px-4 pt-4" aria-hidden="true">
      <div class="paper-card rounded-xl px-4 py-4">
        <p class="mb-4 text-xs font-semibold uppercase tracking-widest text-charcoal/75">
          Who's here
        </p>
        <div class="flex gap-3 overflow-hidden pb-3">
          <For each={[0, 1, 2, 3, 4]}>
            {() => (
              <div class="flex w-14 shrink-0 flex-col items-center gap-2">
                <div class="h-12 w-12 rounded-full border-[3px] border-charcoal/10" />
                {/* Name and status lines */}
                <div class="flex w-full flex-col items-center gap-0.5 pt-1.5">
                  <div class="my-px h-2.5 w-8 rounded-full bg-charcoal/8" />
                  <div class="my-px h-2.5 w-10 rounded-full bg-charcoal/8" />
                </div>
              </div>
            )}
          </For>
        </div>
        {/* The hint under the bar wraps to two lines on a phone. */}
        <div class="h-8 sm:h-4" />
      </div>
    </div>
  );
}

function LoadingFlights() {
  return <p class="p-8 text-center text-sm text-charcoal/75">Loading flights…</p>;
}

function LoadError() {
  return (
    <div class="mx-auto max-w-lg px-4 py-6">
      <div class="paper-card rounded-xl px-4 py-6 text-center">
        <p class="text-sm font-bold text-charcoal">Couldn't load flights.</p>
        <p class="mt-1 text-xs text-charcoal/75">Check your connection and try again.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          class="mt-4 inline-flex min-h-11 items-center rounded-xl bg-charcoal px-6 text-sm font-bold text-cream
                 hover:bg-charcoal/85 active:scale-[0.98] transition-all"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

export default function FlightsPage() {
  return (
    <>
      <h1 class="sr-only">Flights</h1>

      {/* The bar is secondary: if it fails, the flight list still shows. */}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={<CrewBarPlaceholder />}>
          <CrewStatusBar fallback={<CrewBarPlaceholder />} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<LoadError />}>
        <Suspense fallback={<LoadingFlights />}>
          <FlightTracker fallback={<LoadingFlights />} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
