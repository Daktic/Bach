import { For, Show } from "solid-js";
import type { ActivityView, DayStatus, TripDay } from "~/lib/types";
import { ActivityCard } from "./ActivityCard";

interface Props {
  day: Pick<TripDay, "date" | "label" | "activities">;
  status: DayStatus;
  onActivityClick: (activity: ActivityView) => void;
}

// Past and future read the same; the rail shows which days are done.
const labelClass: Record<DayStatus, string> = {
  past: "text-charcoal/75",
  current: "font-bold text-charcoal",
  future: "text-charcoal/75",
};

export function DaySection(props: Props) {
  const isCurrent = () => props.status === "current";
  const isPast = () => props.status === "past";

  return (
    <section
      id={isCurrent() ? "today" : undefined}
      aria-current={isCurrent() ? "date" : undefined}
      // Clears the fixed header when the timeline scrolls today into view.
      class="flex scroll-mt-14 gap-3"
    >
      {/* Rail column */}
      <div class="flex w-8 shrink-0 flex-col items-center">
        <Show
          when={isCurrent()}
          fallback={
            /* ── Past / future: simple circle ── */
            <div
              class={`mt-[1.35rem] h-3 w-3 shrink-0 rounded-full border-2 ${
                isPast() ? "border-teal bg-teal" : "border-charcoal/20 bg-transparent"
              }`}
            />
          }
        >
          {/* ── Current day: radiant node + dissipating rings ── */}
          <div class="relative mt-[1.2rem] flex h-4 w-4 shrink-0 items-center justify-center">
            {/* Ring 1 */}
            <div class="absolute inset-0 rounded-full bg-teal animate-ripple" />
            {/* Ring 2 — offset by half the duration so one is always visible */}
            <div class="absolute inset-0 rounded-full bg-teal animate-ripple [animation-delay:1s]" />
            {/* Node */}
            <div
              class="relative flex h-4 w-4 items-center justify-center rounded-full bg-teal"
              style="filter: brightness(1.25) saturate(1.1)"
            >
              <div class="h-1.5 w-1.5 rounded-full bg-white/80" />
            </div>
          </div>
        </Show>

        {/* Connecting line — teal for completed days, dim for future */}
        <div class={`mt-1 w-px flex-1 ${isPast() ? "bg-teal/35" : "bg-charcoal/12"}`} />
      </div>

      {/* Day content */}
      <div class="min-w-0 flex-1 pb-6">
        <h2
          class={`flex items-center gap-2 pt-4 text-xs uppercase tracking-wider ${labelClass[props.status]}`}
        >
          {props.day.label}
          <Show when={isCurrent()}>
            <span class="rounded-full bg-teal/15 px-2 text-[10px] font-bold leading-4 tracking-widest text-charcoal">
              Today
            </span>
          </Show>
        </h2>

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
    </section>
  );
}
