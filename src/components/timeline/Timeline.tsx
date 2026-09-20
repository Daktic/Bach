import { createAsync } from "@solidjs/router";
import { createSignal, For, onMount, Suspense } from "solid-js";
import type { Activity, TripDay } from "~/lib/types";
import { getDayStatus } from "~/lib/time";
import { getActivityDays } from "~/lib/api/activities";
import { ActivityCard } from "./ActivityCard";
import { ActivityDialog } from "./ActivityDialog";
import { DaySection } from "./DaySection";

export function Timeline() {
  const rawDays = createAsync(() => getActivityDays());
  const [selected, setSelected] = createSignal<Activity | null>(null);

  onMount(() => {
    document.getElementById("today")?.scrollIntoView({ block: "start", behavior: "instant" });
  });

  const days = (): TripDay[] =>
    (rawDays() ?? []).map((day) => ({
      ...day,
      status: getDayStatus(day.date),
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

      <ActivityDialog activity={selected()} onClose={() => setSelected(null)} />
    </>
  );
}
