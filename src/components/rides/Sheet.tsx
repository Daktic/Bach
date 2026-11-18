import { createEffect, Show, type JSX } from "solid-js";
import { focusRing } from "./ui";

/**
 * A bottom sheet for picking something on a phone: a native <dialog>, so
 * the browser traps focus, keeps the page behind it inert, closes on Escape
 * and puts focus back where it was. Tapping the backdrop closes it too.
 */
export function Sheet(props: { open: boolean; title: string; onClose: () => void; children: JSX.Element }) {
  let ref!: HTMLDialogElement;
  let pressedBackdrop = false;

  createEffect(() => {
    if (props.open && !ref.open) ref.showModal();
    else if (!props.open && ref.open) ref.close();
  });

  return (
    <dialog
      ref={ref}
      // Escape. Told to the caller directly rather than through the close
      // event, which some embedded browsers never send.
      onCancel={(e) => {
        e.preventDefault();
        props.onClose();
      }}
      onClose={() => {
        if (props.open) props.onClose();
      }}
      // The backdrop reports the dialog itself as the target; the press must
      // start there too, so a drag out of the panel doesn't count.
      onPointerDown={(e) => (pressedBackdrop = e.target === ref)}
      onClick={(e) => {
        if (pressedBackdrop && e.target === ref) props.onClose();
        pressedBackdrop = false;
      }}
      aria-label={props.title}
      // app.css centres every dialog; this one sits at the bottom on a phone.
      class="paper-panel mx-auto mb-0! mt-auto! w-full max-w-lg rounded-t-2xl p-0 shadow-xl backdrop:bg-charcoal/50
             backdrop:backdrop-blur-sm sm:my-auto! sm:rounded-2xl"
    >
      <Show when={props.open}>
        <div class="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-charcoal/20 sm:hidden" aria-hidden="true" />
          <div class="mb-3 flex items-center justify-between gap-3">
            <h3 class="text-base font-black text-charcoal">{props.title}</h3>
            <button
              type="button"
              onClick={props.onClose}
              class={`-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-charcoal/75 hover:text-charcoal ${focusRing}`}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5" aria-hidden="true">
                <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
          <div class="max-h-[70vh] overflow-y-auto overscroll-contain">{props.children}</div>
        </div>
      </Show>
    </dialog>
  );
}
