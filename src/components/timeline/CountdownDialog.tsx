import { createSignal, Index, onCleanup, onMount, Show } from "solid-js";
import { DEPARTURE_DATE } from "~/lib/config";
import { getCurrentDate, isBeforeTrip } from "~/lib/time";

const SESSION_KEY = "bach_countdown_dismissed";

interface CountdownUnit {
  value: number;
  label: string;
  pad?: boolean;
}

const unit = (value: number, singular: string, pad = false): CountdownUnit => ({
  value,
  label: value === 1 ? singular : `${singular}s`,
  pad,
});

/** Time left until departure (Arizona midnight, Apr 8), coarsest first. */
function computeCountdown(): CountdownUnit[] | null {
  const diff = DEPARTURE_DATE.getTime() - getCurrentDate().getTime();
  if (diff <= 0) return null;

  const totalSecs = Math.floor(diff / 1000);
  const totalMins = Math.floor(totalSecs / 60);
  const totalHrs = Math.floor(totalMins / 60);
  const totalDays = Math.floor(totalHrs / 24);

  if (totalDays > 30) return [unit(Math.floor(totalDays / 30.44), "month")];
  if (totalDays > 7) {
    const weeks = Math.floor(totalDays / 7);
    return [unit(weeks, "week"), unit(totalDays - weeks * 7, "day")];
  }
  if (totalDays >= 1) return [unit(totalDays, "day"), unit(totalHrs % 24, "hour", true)];
  return [
    unit(totalHrs, "hour", true),
    unit(totalMins % 60, "minute", true),
    unit(totalSecs % 60, "second", true),
  ];
}

// Private browsing or blocked storage can make sessionStorage throw.
function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Shows again next visit; harmless.
  }
}

function Unit(props: { value: number; label: string; pad?: boolean }) {
  const display = () =>
    props.pad ? String(props.value).padStart(2, "0") : String(props.value);

  // Orange misses even the large-text minimum on paper (2.9:1), so the number
  // is charcoal and the orange sits in a bar along its foot.
  return (
    <div class="flex flex-col items-center gap-1">
      <span
        class="relative font-bold tabular-nums text-charcoal
               after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:rounded-full after:bg-orange"
        style="font-size: 3.5rem; line-height: 1"
      >
        {display()}
      </span>
      <span class="text-xs uppercase tracking-widest text-charcoal/75">{props.label}</span>
    </div>
  );
}

export function CountdownDialog() {
  const [countdown, setCountdown] = createSignal<CountdownUnit[] | null>(null);
  let ref!: HTMLDialogElement;
  // Shared with dismiss(), so closing the dialog also stops the ticking.
  let timer: ReturnType<typeof setInterval> | undefined;

  // Client-only: reads the clock and sessionStorage, so SSR renders it closed.
  onMount(() => {
    if (!isBeforeTrip()) return;
    if (wasDismissed()) return;

    const initial = computeCountdown();
    if (!initial) return;

    setCountdown(initial);
    ref.showModal();

    timer = setInterval(() => {
      const next = computeCountdown();
      setCountdown(next);
      if (!next) dismiss();
    }, 1000);

    onCleanup(() => clearInterval(timer));
  });

  // Runs for "I'm ready", Escape (via the close event) and reaching zero.
  function dismiss() {
    clearInterval(timer);
    rememberDismissed();
    if (ref.open) ref.close();
    setCountdown(null);
  }

  return (
    <dialog
      ref={ref}
      onClose={dismiss}
      aria-label="Countdown to the trip"
      class="w-full max-w-xs rounded-2xl paper-card p-0 backdrop:bg-charcoal/50 backdrop:backdrop-blur-sm"
    >
      <Show when={countdown()}>
        {(units) => (
          <div class="flex flex-col items-center px-8 py-10 text-center">
            <p class="text-sm font-semibold uppercase tracking-widest text-charcoal/75">
              The bach trip is in
            </p>

            {/* Three units on the final day: a tighter gap keeps them inside 320px. */}
            <div class={`mt-8 flex items-end ${units().length > 2 ? "gap-3" : "gap-8"}`}>
              <Index each={units()}>
                {(u) => <Unit value={u().value} label={u().label} pad={u().pad} />}
              </Index>
            </div>

            <button
              type="button"
              onClick={dismiss}
              class="mt-10 min-h-11 w-full rounded-xl bg-charcoal py-3 text-sm font-bold uppercase tracking-wider text-cream"
            >
              I'm ready
            </button>
          </div>
        )}
      </Show>
    </dialog>
  );
}
