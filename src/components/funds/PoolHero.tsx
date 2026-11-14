import { Show } from "solid-js";
import type { PoolView } from "~/lib/types";

interface Props {
  pool: Pick<PoolView, "image" | "placeholderGradient">;
  /** Shows the PAID stamp. Only for a share above $0 that's paid up. */
  paid: boolean;
  /** Height and any corner rounding, e.g. "h-36". */
  class: string;
}

function PaidStamp() {
  // Decorative: the paid status is also spelled out in text next to it. The
  // word is charcoal (teal is too light for small text); teal stays on the frame.
  return (
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-4 top-4 z-10 -rotate-[18deg] select-none"
    >
      <div class="rounded-[3px] border-[3px] border-teal/80 bg-cream/80 px-3 py-1
                  shadow-[inset_0_0_0_1.5px_rgba(98,216,199,0.25)]">
        <div class="rounded-[1px] border border-teal/30 px-1">
          <span class="block text-[11px] font-black uppercase leading-tight tracking-[0.3em] text-charcoal">
            Paid
          </span>
        </div>
      </div>
    </div>
  );
}

/** Pool image, or its placeholder gradient until a real image is set. */
export function PoolHero(props: Props) {
  return (
    <div
      class={`relative overflow-hidden ${props.class}`}
      style={{ background: props.pool.image ? undefined : props.pool.placeholderGradient }}
    >
      <Show when={props.pool.image}>
        {(src) => (
          <img
            src={src()}
            alt=""
            loading="lazy"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </Show>

      {/* Subtle vignette so the stamp reads on light images */}
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

      <Show when={props.paid}>
        <PaidStamp />
      </Show>
    </div>
  );
}
