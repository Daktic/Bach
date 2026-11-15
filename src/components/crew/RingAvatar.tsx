import { createSignal, Show, type JSX } from "solid-js";

/**
 * A guest's circle, as on the "Who's here" bar and in the chat: their photo
 * or initials inside a coloured ring, with an optional round badge at the
 * bottom. Decorative: callers always write the name and state out in text. A
 * faded circle (no flight, offline) fades on its own, never its text.
 */
export function RingAvatar(props: {
  initials: string;
  photo?: string | null;
  /** The ring's border colour, e.g. "border-teal". */
  ring: string;
  faded?: boolean;
  size?: "sm" | "md";
  badge?: { class: string; content?: JSX.Element };
}) {
  const [broken, setBroken] = createSignal(false);
  const size = () => (props.size === "sm" ? "h-10 w-10 border-[2.5px]" : "h-12 w-12 border-[3px]");

  return (
    <div class="relative" aria-hidden="true">
      <div
        class={`paper-card flex ${size()} items-center justify-center overflow-hidden rounded-full
                transition-colors duration-300 ${props.ring} ${props.faded ? "opacity-40" : ""}`}
      >
        <Show
          when={props.photo && !broken()}
          fallback={<span class="select-none text-xs font-bold text-charcoal/75">{props.initials}</span>}
        >
          <img
            src={props.photo!}
            alt=""
            referrerpolicy="no-referrer"
            onError={() => setBroken(true)}
            class="h-full w-full object-cover"
          />
        </Show>
      </div>

      <Show when={props.badge}>
        {(badge) => (
          <div
            class={`absolute -bottom-[11px] left-1/2 flex h-[22px] w-[22px] -translate-x-1/2
                    items-center justify-center rounded-full border-[1.5px]
                    transition-colors duration-300 ${badge().class}`}
          >
            {badge().content}
          </div>
        )}
      </Show>
    </div>
  );
}
