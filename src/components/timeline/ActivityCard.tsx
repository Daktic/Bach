import { Show } from "solid-js";
import { formatActivityTime } from "~/lib/activity-time";
import type { ActivityView } from "~/lib/types";

interface Props {
  activity: ActivityView;
  onClick: () => void;
}

export function ActivityCard(props: Props) {
  const startTime = () => formatActivityTime(props.activity.startTime);

  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-haspopup="dialog"
      class="flex w-full items-center gap-3 rounded-lg paper-card p-3 text-left transition-all hover:brightness-[1.02] active:scale-[0.99]"
    >
      <div class="h-16 w-16 shrink-0 overflow-hidden rounded-md">
        <Show
          when={props.activity.image}
          fallback={<div class="h-full w-full bg-gradient-to-br from-teal/40 to-orange/20" />}
        >
          {(src) => <img src={src()} alt="" loading="lazy" class="h-full w-full object-cover" />}
        </Show>
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <p class="truncate text-sm font-semibold text-charcoal">
            {props.activity.title}
          </p>
          <Show when={startTime()}>
            {(time) => <span class="shrink-0 text-xs text-charcoal/75">{time()}</span>}
          </Show>
        </div>
        <p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-charcoal/75">
          {props.activity.description}
        </p>
      </div>
    </button>
  );
}
