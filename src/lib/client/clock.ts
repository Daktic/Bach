import { type Accessor, createSignal, onCleanup, onMount } from "solid-js";
import { getCurrentDate } from "~/lib/time";

/** How often clock-driven state is refreshed, unless a caller asks otherwise. */
const REFRESH_MS = 60_000;

/**
 * "Now" for anything that changes with the clock: which timeline day is today,
 * flight status and progress, and whether a pool is overdue (FN-8).
 *
 * null on the server and during hydration, so both renders match. Set after
 * mount (the dev ?mockDate param is honoured), then refreshed every
 * `refreshMs` and whenever the page is shown again. A page left open, or a
 * home-screen app resumed, then catches up without a reload.
 *
 * Call it while setting up a component; the timer and listener stop when the
 * component unmounts.
 */
export function createNow(refreshMs = REFRESH_MS): Accessor<Date | null> {
  const [now, setNow] = createSignal<Date | null>(null);

  onMount(() => {
    const tick = () => setNow(getCurrentDate());
    tick();
    const timer = setInterval(tick, refreshMs);
    // Phones pause timers in the background; catch up when the page is back.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    onCleanup(() => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    });
  });

  return now;
}
