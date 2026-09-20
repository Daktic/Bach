import { createAsync } from "@solidjs/router";
import { createSignal, For, onMount, Suspense } from "solid-js";
import type { Activity, TripDay } from "~/lib/types";
import { getDayStatus, getTodayString } from "~/lib/time";
import { getActivityDays } from "~/lib/api/activities";
import { ActivityDialog } from "./ActivityDialog";
import { CountdownDialog } from "./CountdownDialog";
import { DaySection } from "./DaySection";

export function Timeline() {
  const rawDays = createAsync(() => getActivityDays());
  const [selected, setSelected] = createSignal<Activity | null>(null);

  // null on the server and during initial client render — keeps the SSR and
  // hydration trees identical (all days "future"). Populated in onMount so
  // statuses and the scroll anchor resolve after hydration completes.
  const [todayStr, setTodayStr] = createSignal<string | null>(null);

  onMount(() => {
    setTodayStr(getTodayString());
    // Defer scroll one frame so the "today" id has been applied to the DOM.
    requestAnimationFrame(() => {
      document.getElementById("today")?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  });

  const days = (): TripDay[] =>
    (rawDays() ?? []).map((day) => ({
      ...day,
      status: todayStr() ? getDayStatus(day.date) : "future",
    }));

  return (
    <>
      <div class="mx-auto max-w-lg px-4 py-6">
        <Suspense>
          <For each={days()}>
            {(day) => (
              <DaySection day={day} onActivityClick={setSelected} />
            )}
          </For>
        </Suspense>
      </div>

      <CountdownDialog />
      <ActivityDialog activity={selected()} onClose={() => setSelected(null)} />
    </>
  );
}
