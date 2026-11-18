import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";
import type { PhonePosition } from "~/lib/ride-places";

// Where the phone is, for the Lyft link's pickup (ADR 0012). Uber's link can
// say "my location" and work it out itself; Lyft's needs coordinates to take
// a destination at all. The page asks once while it's open and keeps
// following, so the link is ready the moment someone taps it: a link built
// after an async lookup would open outside the tap and get blocked.

export type PositionState = "idle" | "asking" | "ready" | "denied" | "unavailable";

const [position, setPosition] = createSignal<PhonePosition | null>(null);
const [state, setState] = createSignal<PositionState>("idle");
let users = 0;
let watch: number | undefined;

function start() {
  if (watch !== undefined) return;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    setState("unavailable");
    return;
  }
  setState((s) => (s === "ready" ? s : "asking"));
  watch = navigator.geolocation.watchPosition(
    (p) => {
      setPosition({ lat: Math.round(p.coords.latitude * 1e6) / 1e6, lng: Math.round(p.coords.longitude * 1e6) / 1e6 });
      setState("ready");
    },
    (err) => {
      setState(err.code === err.PERMISSION_DENIED ? "denied" : position() ? "ready" : "unavailable");
    },
    { enableHighAccuracy: false, maximumAge: 30_000, timeout: 15_000 },
  );
}

function stop() {
  if (watch !== undefined) navigator.geolocation?.clearWatch(watch);
  watch = undefined;
}

/**
 * The phone's position while any page that calls this is mounted. Asks for
 * permission on mount (only in the browser).
 */
export function usePhonePosition(): { position: Accessor<PhonePosition | null>; state: Accessor<PositionState> } {
  onMount(() => {
    users++;
    start();
    onCleanup(() => {
      users--;
      if (users === 0) stop();
    });
  });
  return { position, state };
}
