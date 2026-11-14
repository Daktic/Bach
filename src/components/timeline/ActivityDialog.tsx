import { createEffect, Show } from "solid-js";
import type { ActivityView } from "~/lib/types";
import { ActivityDetails, activityTitleId } from "./ActivityDetails";
import { ShareButton } from "./ShareButton";

interface Props {
  activity: ActivityView | null;
  onClose: () => void;
}

export function ActivityDialog(props: Props) {
  let ref!: HTMLDialogElement;
  let pressedBackdrop = false;

  createEffect(() => {
    const wantOpen = props.activity !== null;
    if (wantOpen && !ref.open) ref.showModal();
    else if (!wantOpen && ref.open) ref.close();
  });

  return (
    <dialog
      ref={ref}
      onClose={props.onClose}
      // Tapping the backdrop closes it. The backdrop reports the dialog itself
      // as the target; the press must start there too, so a text selection
      // dragged outside doesn't count.
      onPointerDown={(e) => (pressedBackdrop = e.target === ref)}
      onClick={(e) => {
        if (pressedBackdrop && e.target === ref) ref.close();
        pressedBackdrop = false;
      }}
      aria-labelledby={props.activity ? activityTitleId(props.activity.id) : undefined}
      class="w-[calc(100%-2rem)] max-w-sm max-h-[calc(100dvh-2rem)] overflow-hidden rounded-xl paper-card p-0 backdrop:bg-charcoal/50 backdrop:backdrop-blur-sm"
    >
      <Show when={props.activity}>
        {(activity) => (
          <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
            {/* Long details scroll inside the card; the actions stay put. */}
            <div class="min-h-0 flex-auto overflow-y-auto overscroll-contain">
              <ActivityDetails activity={activity()} />
            </div>

            <div class="flex shrink-0 gap-2 border-t border-charcoal/10 p-4">
              <ShareButton
                path={`/activity/${encodeURIComponent(activity().id)}`}
                title={activity().title}
                class="flex-1"
              />
              <button
                type="button"
                autofocus
                onClick={() => ref.close()}
                class="min-h-11 flex-1 rounded-lg bg-charcoal px-4 text-sm font-semibold text-cream transition-transform active:scale-[0.99]"
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
