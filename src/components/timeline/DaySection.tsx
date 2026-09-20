import { For } from "solid-js";
import type { Activity, TripDay } from "~/lib/types";
import { ActivityCard } from "./ActivityCard";

interface Props {
  day: TripDay;
  onActivityClick: (activity: Activity) => void;
}

const nodeClass: Record<TripDay["status"], string> = {
  past: "bg-teal border-teal",
  current: "bg-orange border-orange ring-4 ring-orange/20",
  future: "border-charcoal/25 bg-cream",
};

const labelClass: Record<TripDay["status"], string> = {
  past: "text-charcoal/35",
  current: "font-bold text-charcoal",
  future: "text-charcoal/55",
};

export function DaySection(props: Props) {
  return (
    <div
      id={props.day.status === "current" ? "today" : undefined}
      class="flex gap-3"
    >
      {/* Rail column — node + connecting line */}
      <div class="flex w-8 shrink-0 flex-col items-center">
        <div
          class={`mt-[1.35rem] h-3 w-3 shrink-0 rounded-full border-2 ${nodeClass[props.day.status]}`}
        />
        <div class="mt-1 w-px flex-1 bg-charcoal/15" />
      </div>

      {/* Day content */}
      <div class="flex-1 pb-6">
        <p class={`pt-4 text-xs uppercase tracking-wider ${labelClass[props.day.status]}`}>
          {props.day.label}
        </p>

        <div class="mt-3 flex flex-col gap-2">
          <For each={props.day.activities}>
            {(activity) => (
              <ActivityCard
                activity={activity}
                onClick={() => props.onActivityClick(activity)}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
