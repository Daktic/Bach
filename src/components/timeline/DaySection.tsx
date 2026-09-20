import { For } from "solid-js";
import type { Activity, TripDay } from "~/lib/types";
import { ActivityCard } from "./ActivityCard";

interface Props {
  day: TripDay;
  onActivityClick: (activity: Activity) => void;
}

const labelClass: Record<TripDay["status"], string> = {
  past: "text-charcoal/35",
  current: "font-bold text-charcoal",
  future: "text-charcoal/50",
};

export function DaySection(props: Props) {
  return (
    <div
      id={props.day.status === "current" ? "today" : undefined}
      class="flex gap-3"
    >
      {/* Rail column */}
      <div class="flex w-8 shrink-0 flex-col items-center">

        {props.day.status === "current" ? (
          /* ── Current day: radiant node + dissipating rings ── */
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
        ) : (
          /* ── Past / future: simple circle ── */
          <div
            class={`mt-[1.35rem] h-3 w-3 shrink-0 rounded-full border-2 ${
              props.day.status === "past"
                ? "border-teal bg-teal"
                : "border-charcoal/20 bg-transparent"
            }`}
          />
        )}

        {/* Connecting line — teal for completed days, dim for future */}
        <div
          class={`mt-1 w-px flex-1 ${
            props.day.status === "past" ? "bg-teal/35" : "bg-charcoal/12"
          }`}
        />
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
