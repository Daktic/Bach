import { createSignal, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { DEPARTURE_DATE } from "~/lib/config";
import { getCurrentDate, isBeforeTrip } from "~/lib/time";

const SESSION_KEY = "bach_countdown_dismissed";

type CountdownPhase =
  | { phase: "months"; months: number }
  | { phase: "weeks"; weeks: number; days: number }
  | { phase: "days"; days: number; hours: number }
  | { phase: "hours"; hours: number; seconds: number };

function computeCountdown(): CountdownPhase | null {
  const diff = DEPARTURE_DATE.getTime() - getCurrentDate().getTime();
  if (diff <= 0) return null;

  const totalSecs = Math.floor(diff / 1000);
  const totalHrs = Math.floor(totalSecs / 3600);
  const totalDays = Math.floor(totalHrs / 24);

  if (totalDays > 30) {
    return { phase: "months", months: Math.floor(totalDays / 30.44) };
  }
  if (totalDays > 7) {
    const weeks = Math.floor(totalDays / 7);
    return { phase: "weeks", weeks, days: totalDays - weeks * 7 };
  }
  if (totalDays >= 1) {
    return { phase: "days", days: totalDays, hours: totalHrs - totalDays * 24 };
  }
  return { phase: "hours", hours: totalHrs, seconds: totalSecs % 60 };
}

function Unit(props: { value: number; label: string; pad?: boolean }) {
  const display = () =>
    props.pad ? String(props.value).padStart(2, "0") : String(props.value);

  return (
    <div class="flex flex-col items-center gap-1">
      <span class="font-bold tabular-nums text-orange" style="font-size: 3.5rem; line-height: 1">
        {display()}
      </span>
      <span class="text-xs uppercase tracking-widest text-charcoal/50">{props.label}</span>
    </div>
  );
}

export function CountdownDialog() {
  const [countdown, setCountdown] = createSignal<CountdownPhase | null>(null);
  let ref!: HTMLDialogElement;

  onMount(() => {
    if (!isBeforeTrip()) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const initial = computeCountdown();
    if (!initial) return;

    setCountdown(initial);
    ref.showModal();

    const timer = setInterval(() => {
      const next = computeCountdown();
      setCountdown(next);
      if (!next) { clearInterval(timer); dismiss(); }
    }, 1000);

    onCleanup(() => clearInterval(timer));
  });

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, "1");
    ref.close();
    setCountdown(null);
  }

  return (
    <dialog
      ref={ref!}
      onClose={dismiss}
      class="w-full max-w-xs rounded-2xl bg-cream p-0 shadow-2xl backdrop:bg-charcoal/50 backdrop:backdrop-blur-sm"
    >
      <Show when={countdown()}>
        {(cd) => (
          <div class="flex flex-col items-center px-8 py-10 text-center">
            <p class="text-sm font-semibold uppercase tracking-widest text-charcoal/40">
              The bach trip is in
            </p>

            <div class="mt-8 flex items-end gap-8">
              <Switch>
                <Match when={cd().phase === "months" && cd()}>
                  {(d) => <Unit value={(d() as { months: number }).months} label="months" />}
                </Match>

                <Match when={cd().phase === "weeks" && cd()}>
                  {(d) => {
                    const w = d() as { weeks: number; days: number };
                    return (
                      <>
                        <Unit value={w.weeks} label="weeks" />
                        <Unit value={w.days} label="days" />
                      </>
                    );
                  }}
                </Match>

                <Match when={cd().phase === "days" && cd()}>
                  {(d) => {
                    const w = d() as { days: number; hours: number };
                    return (
                      <>
                        <Unit value={w.days} label="days" />
                        <Unit value={w.hours} label="hours" pad />
                      </>
                    );
                  }}
                </Match>

                <Match when={cd().phase === "hours" && cd()}>
                  {(d) => {
                    const w = d() as { hours: number; seconds: number };
                    return (
                      <>
                        <Unit value={w.hours} label="hours" pad />
                        <Unit value={w.seconds} label="seconds" pad />
                      </>
                    );
                  }}
                </Match>
              </Switch>
            </div>

            <button
              type="button"
              onClick={dismiss}
              class="mt-10 w-full rounded-xl bg-charcoal py-3 text-sm font-bold uppercase tracking-wider text-cream"
            >
              I'm ready
            </button>
          </div>
        )}
      </Show>
    </dialog>
  );
}
