import { type Accessor, createSignal, onCleanup, onMount } from "solid-js";
import { leave, pulse } from "~/lib/api/pulse";
import { PULSE_MS } from "~/lib/presence";

// The app's check-in (ADR 0011). While any page that uses it is mounted and
// on screen, it checks in every PULSE_MS: that marks this guest as having the
// app open, and brings back who else does and the chat's unread count. When
// the page is hidden it stops and tells the server, so the guest shows as
// offline straight away.
//
// NavBar keeps it running on every page but /sign-in.

// Only ever set in the browser (after mount), so the server always renders empty.
const [unread, setUnread] = createSignal(0);
const [online, setOnline] = createSignal<ReadonlySet<string>>(new Set());
let users = 0;
let timer: ReturnType<typeof setInterval> | undefined;
let inFlight: Promise<void> | undefined;

/** Checks in now. Failures (offline, signed out) keep the last known values. */
export function refreshPulse(): Promise<void> {
  if (document.visibilityState !== "visible") return Promise.resolve();
  inFlight ??= pulse()
    .then((p) => {
      setUnread(p.unreadChat);
      setOnline(new Set(p.online));
    })
    .catch(() => {})
    .finally(() => (inFlight = undefined));
  return inFlight;
}

function startBeating() {
  clearInterval(timer);
  void refreshPulse();
  timer = setInterval(() => void refreshPulse(), PULSE_MS);
}

const onVisibility = () => {
  if (document.visibilityState === "visible") {
    startBeating();
  } else {
    clearInterval(timer);
    void leave().catch(() => {});
  }
};

export interface PulseState {
  /** Chat messages from others not read yet. */
  unread: Accessor<number>;
  /** Guest ids with the app open, this guest included. */
  online: Accessor<ReadonlySet<string>>;
}

/** Keeps the check-in running while the calling component is mounted. */
export function usePulse(): PulseState {
  onMount(() => {
    if (users++ === 0) {
      startBeating();
      document.addEventListener("visibilitychange", onVisibility);
    }
    onCleanup(() => {
      if (--users > 0) return;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    });
  });
  return { unread, online };
}

/** The chat page has shown everything: no badge. */
export function clearChatUnread(): void {
  setUnread(0);
}
