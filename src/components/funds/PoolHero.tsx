import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { PoolView } from "~/lib/types";

interface Props {
  pool: Pick<PoolView, "title" | "photos" | "placeholderGradient">;
  /** Shows the PAID stamp. Only for a share above $0 that's paid up. */
  paid: boolean;
  /** Height and any corner rounding, e.g. "h-36". */
  class: string;
  /**
   * Pool page: swipe between photos, with next/previous buttons and dots.
   * Cards (which are links) show the first photo and a photo count instead.
   */
  carousel?: boolean;
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

function ChevronIcon(props: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6" aria-hidden="true">
      <path
        d={props.direction === "left"
          ? "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
          : "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"}
      />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </svg>
  );
}

/** Round, high-contrast button floating over a photo (44px tap target). */
const overlayButton =
  "flex h-11 w-11 items-center justify-center rounded-full bg-cream/90 text-charcoal shadow-md " +
  "transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-charcoal";

function Carousel(props: { pool: Props["pool"] }) {
  const photos = () => props.pool.photos;
  const [index, setIndex] = createSignal(0);
  let track: HTMLDivElement | undefined;

  const count = () => photos().length;

  /** Scroll to photo `i`, wrapping past either end. */
  function goTo(i: number) {
    if (!track) return;
    const next = ((i % count()) + count()) % count();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: next * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    setIndex(next);
  }

  // Swiping scrolls the track directly; keep the dots in step with it.
  onMount(() => {
    if (!track) return;
    const el = track;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    });
  });

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index() + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index() - 1);
    }
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`Photos of ${props.pool.title}`}
      onKeyDown={onKeyDown}
      class="absolute inset-0"
    >
      <div
        ref={track}
        class="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain
               [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <For each={photos()}>
          {(photo, i) => (
            <div
              role="group"
              aria-roledescription="slide"
              aria-label={`${i() + 1} of ${count()}`}
              aria-hidden={i() !== index()}
              class="relative h-full w-full shrink-0 snap-center snap-always"
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading={i() === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                class="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}
        </For>
      </div>

      {/* Vignette so the controls and stamp read on light photos */}
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

      <div class="absolute inset-y-0 left-2 flex items-center">
        <button type="button" class={overlayButton} aria-label="Previous photo" onClick={() => goTo(index() - 1)}>
          <ChevronIcon direction="left" />
        </button>
      </div>
      <div class="absolute inset-y-0 right-2 flex items-center">
        <button type="button" class={overlayButton} aria-label="Next photo" onClick={() => goTo(index() + 1)}>
          <ChevronIcon direction="right" />
        </button>
      </div>

      {/* Dots: which photo you're on. Each is a 44px-tall target. */}
      <div class="absolute inset-x-0 bottom-0 flex justify-center">
        <For each={photos()}>
          {(_, i) => (
            <button
              type="button"
              aria-label={`Show photo ${i() + 1} of ${count()}`}
              aria-current={i() === index() ? "true" : undefined}
              onClick={() => goTo(i())}
              class="group flex h-11 w-7 items-center justify-center focus-visible:outline-none"
            >
              <span
                class={`block h-2 rounded-full ring-1 ring-black/40 transition-all
                        group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-cream
                        ${i() === index() ? "w-5 bg-cream" : "w-2 bg-cream/55"}`}
              />
            </button>
          )}
        </For>
      </div>

      <p class="sr-only" aria-live="polite">
        Photo {index() + 1} of {count()}: {photos()[index()]?.alt}
      </p>
    </section>
  );
}

/**
 * The pool's photos, or its placeholder gradient when there are none. On the
 * pool page (`carousel`) several photos can be swiped through; on a card the
 * first photo shows with a count of how many there are.
 */
export function PoolHero(props: Props) {
  const first = () => props.pool.photos[0];
  const many = () => props.pool.photos.length > 1;

  return (
    <div
      class={`relative overflow-hidden ${props.class}`}
      style={{ background: first() ? undefined : props.pool.placeholderGradient }}
    >
      <Show
        when={props.carousel && many()}
        fallback={
          <>
            <Show when={first()}>
              {(photo) => (
                <img
                  src={photo().src}
                  alt={props.carousel ? photo().alt : ""}
                  loading="lazy"
                  decoding="async"
                  class="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </Show>
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <Show when={!props.carousel && many()}>
              <span class="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-cream/90 px-2 py-0.5
                           text-xs font-bold text-charcoal shadow">
                <PhotoIcon />
                {props.pool.photos.length}
                <span class="sr-only"> photos</span>
              </span>
            </Show>
          </>
        }
      >
        <Carousel pool={props.pool} />
      </Show>

      <Show when={props.paid}>
        <PaidStamp />
      </Show>
    </div>
  );
}
