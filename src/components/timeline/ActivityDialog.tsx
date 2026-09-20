import { createEffect, Show } from "solid-js";
import type { Activity } from "~/lib/types";

interface Props {
  activity: Activity | null;
  onClose: () => void;
}

function formatDialogDate(dateStr: string, time?: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const label = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return time ? `${label} · ${time}` : label;
}

export function ActivityDialog(props: Props) {
  let ref!: HTMLDialogElement;

  createEffect(() => {
    if (props.activity) ref.showModal();
    else if (!ref.open) return;
    else ref.close();
  });

  return (
    <dialog
      ref={ref!}
      onClose={props.onClose}
      class="w-full max-w-sm rounded-xl bg-cream p-0 shadow-xl backdrop:bg-charcoal/40 backdrop:backdrop-blur-sm"
    >
      <Show when={props.activity}>
        {(activity) => (
          <div>
            <div class="h-48 w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-teal/40 to-orange/20">
              {activity().image && (
                <img
                  src={activity().image}
                  alt={activity().title}
                  class="h-full w-full object-cover"
                />
              )}
            </div>

            <div class="p-5">
              <p class="text-xs font-semibold uppercase tracking-widest text-orange">
                {formatDialogDate(activity().day, activity().startTime)}
              </p>
              <h2 class="mt-1 text-xl font-bold text-charcoal">
                {activity().title}
              </h2>
              <p class="mt-2 text-sm leading-relaxed text-charcoal/70">
                {activity().details ?? activity().description}
              </p>

              <button
                type="button"
                onClick={props.onClose}
                class="mt-5 w-full rounded-lg bg-charcoal py-2.5 text-sm font-semibold text-cream"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Show>
    </dialog>
  );
}
