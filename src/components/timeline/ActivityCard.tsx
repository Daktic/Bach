import type { Activity } from "~/lib/types";

interface Props {
  activity: Activity;
  onClick: () => void;
}

export function ActivityCard(props: Props) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class="flex w-full items-center gap-3 rounded-lg paper-card p-3 text-left transition-all hover:brightness-[1.02] active:scale-[0.99]"
    >
      <div class="h-16 w-16 shrink-0 overflow-hidden rounded-md">
        {props.activity.image ? (
          <img
            src={props.activity.image}
            alt={props.activity.title}
            class="h-full w-full object-cover"
          />
        ) : (
          <div class="h-full w-full bg-gradient-to-br from-teal/40 to-orange/20" />
        )}
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-baseline gap-2">
          <p class="truncate text-sm font-semibold text-charcoal">
            {props.activity.title}
          </p>
          {props.activity.startTime && (
            <span class="shrink-0 text-xs text-charcoal/50">
              {props.activity.startTime}
            </span>
          )}
        </div>
        <p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-charcoal/60">
          {props.activity.description}
        </p>
      </div>
    </button>
  );
}
