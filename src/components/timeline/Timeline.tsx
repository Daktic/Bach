import { createAsync } from "@solidjs/router";
import { createEffect, createSignal, ErrorBoundary, For, Suspense } from "solid-js";
import { getActivityDays, type ActivityDay } from "~/lib/api/activities";
import { createNow } from "~/lib/client/clock";
import { getDayStatus } from "~/lib/time";
import type { ActivityView, DayStatus } from "~/lib/types";
import { ActivityDialog } from "./ActivityDialog";
import { CountdownDialog } from "./CountdownDialog";
import { DaySection } from "./DaySection";

function LoadError() {
  return (
    <div class="rounded-xl paper-card px-5 py-8 text-center">
      <p class="text-sm font-bold text-charcoal">Couldn't load the itinerary</p>
      <p class="mt-1 text-sm text-charcoal/75">Check your connection, then try again.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        class="mt-5 min-h-11 rounded-lg bg-charcoal px-5 text-sm font-semibold text-cream"
      >
        Reload
      </button>
    </div>
  );
}

export function Timeline() {
  const days = createAsync(async (): Promise<ActivityDay[]> => {
    const result = await getActivityDays();
    // An expired session throws (401). Anything else that isn't a list
    // (e.g. a redirect response) is a failure too.
    if (!Array.isArray(result)) throw new Error("Couldn't load the itinerary");
    return result;
  });
  const [selected, setSelected] = createSignal<ActivityView | null>(null);

  // null on the server and during the first client render, so SSR and
  // hydration agree (every day "future"). Set after mount so statuses and the
  // "today" anchor resolve on the client, honouring ?mockDate in dev. Ticks
  // every minute to keep "today" right when the page stays open past midnight.
  const now = createNow(60_000);

  const statusFor = (date: string): DayStatus => {
    const at = now();
    return at ? getDayStatus(date, at) : "future";
  };

  // Scroll today into view once, as soon as both the clock and the days are
  // ready (after hydration, or when the data arrives on client navigation).
  // Later clock ticks leave the scroll position alone.
  let scrolledToToday = false;
  createEffect(() => {
    if (scrolledToToday || !now()) return;
    let loaded: ActivityDay[] | undefined;
    try {
      loaded = days();
    } catch {
      return; // the ErrorBoundary below shows the failure
    }
    if (!loaded) return;
    scrolledToToday = true;
    // Wait a frame so the "today" id is in the DOM and laid out.
    requestAnimationFrame(() => {
      document.getElementById("today")?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  });

  return (
    <>
      <div class="mx-auto max-w-lg px-4 py-6">
        <h1 class="sr-only">Trip timeline</h1>
        <ErrorBoundary fallback={<LoadError />}>
          <Suspense>
            <For each={days()}>
              {(day) => (
                <DaySection day={day} status={statusFor(day.date)} onActivityClick={setSelected} />
              )}
            </For>
          </Suspense>
        </ErrorBoundary>
      </div>

      <CountdownDialog />
      <ActivityDialog activity={selected()} onClose={() => setSelected(null)} />
    </>
  );
}
