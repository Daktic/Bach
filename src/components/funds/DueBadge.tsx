import { Show } from "solid-js";
import { Dot } from "./Dot";
import { formatDueDate } from "./pool-status";

interface Props {
  dueDate: string; // "YYYY-MM-DD", end of day Arizona time
  /** Unpaid after the due date (FN-8). Pass false until mounted. */
  overdue: boolean;
  /** Quieter when the viewer has nothing left to pay. */
  muted?: boolean;
  /** "Due Mon, Mar 1, 2027" instead of "Due Mar 1". */
  long?: boolean;
}

export function DueBadge(props: Props) {
  return (
    <span class="inline-flex flex-wrap items-center gap-1.5">
      {/* Neither white nor charcoal text passes on solid orange at this size,
          so the pill is charcoal and the orange goes on the dot. */}
      <Show when={props.overdue}>
        <span class="rounded-full bg-charcoal px-2.5 py-0.5 text-xs font-black text-cream">
          <Dot class="bg-orange" />
          Overdue
        </span>
      </Show>
      <span
        class={`rounded-full px-2.5 py-0.5 text-xs
                ${props.overdue
                  ? "bg-orange/15 font-semibold text-charcoal"
                  : props.muted
                    ? "bg-charcoal/5 font-medium text-charcoal/80"
                    : "bg-charcoal/8 font-semibold text-charcoal"}`}
      >
        Due {formatDueDate(props.dueDate, props.long ? "long" : "short")}
      </span>
    </span>
  );
}
