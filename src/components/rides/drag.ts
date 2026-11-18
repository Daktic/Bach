import { createSignal, onCleanup, type Accessor } from "solid-js";

// Dragging people into seats, and long-pressing a car (ADR 0012). Pointer
// events, so one code path covers fingers and mice. A chip that starts a
// drag captures the pointer; the seat under the finger is found with
// elementFromPoint, by the data attributes CarOutline puts on each seat.
//
// On a phone the page still has to scroll. Chips and seats leave vertical
// panning to the browser (touch-action: pan-y); a finger that holds still
// for a moment picks the person up instead, and from then on the page is
// held in place until they're dropped.

export interface SeatTarget {
  rideId: number;
  carId: number;
  seat: number;
}

export interface DragState {
  guestId: string;
  x: number;
  y: number;
}

/** How far a finger moves before a touch is a drag, not a tap. */
const DRAG_SLOP = 8;
/** How long a finger holds still before it picks the person up. */
export const LIFT_MS = 150;
/** How long after a gesture its follow-up click is still swallowed. */
const SWALLOW_MS = 300;

/** The seat under a point, if that seat takes drops. */
export function seatAt(x: number, y: number): SeatTarget | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-seat]");
  if (!el || el.dataset.open !== "true") return null;
  return { rideId: Number(el.dataset.rideId), carId: Number(el.dataset.carId), seat: Number(el.dataset.seat) };
}

const holdPage = (e: TouchEvent) => {
  if (e.cancelable) e.preventDefault();
};

/**
 * The drag of one ride's people. `start` goes on a chip's pointerdown; when
 * the pointer lifts over a seat, `onDrop` fires. A press that never moved
 * far is a tap, left to the chip's own click handler, except that a click
 * right after a drag is swallowed (browsers fire one on the captured chip).
 */
export function createSeatDrag(rideId: number, onDrop: (guestId: string, target: SeatTarget) => void) {
  const [drag, setDrag] = createSignal<DragState | null>(null);
  const [over, setOver] = createSignal<SeatTarget | null>(null);
  let pending: { guestId: string; pointerId: number; x0: number; y0: number; el: HTMLElement; lifted: boolean } | null =
    null;
  let liftTimer: ReturnType<typeof setTimeout> | undefined;
  let swallowClick = false;
  let swallowTimer: ReturnType<typeof setTimeout> | undefined;

  function hit(x: number, y: number): SeatTarget | null {
    const t = seatAt(x, y);
    return t && t.rideId === rideId ? t : null;
  }

  function stop() {
    clearTimeout(liftTimer);
    liftTimer = undefined;
    if (pending?.el.hasPointerCapture(pending.pointerId)) pending.el.releasePointerCapture(pending.pointerId);
    pending = null;
    setDrag(null);
    setOver(null);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("touchmove", holdPage);
  }

  function lift(x: number, y: number) {
    if (!pending) return;
    pending.lifted = true;
    // The browser hasn't started scrolling yet, and now it won't.
    window.addEventListener("touchmove", holdPage, { passive: false });
    setDrag({ guestId: pending.guestId, x, y });
    setOver(hit(x, y));
  }

  function onMove(e: PointerEvent) {
    if (!pending || e.pointerId !== pending.pointerId) return;
    if (!pending.lifted) {
      if (Math.hypot(e.clientX - pending.x0, e.clientY - pending.y0) < DRAG_SLOP) return;
      // Moved before the hold was up: with a finger that's a scroll, so let go.
      if (e.pointerType === "touch") return stop();
      lift(e.clientX, e.clientY);
      return;
    }
    setDrag({ guestId: pending.guestId, x: e.clientX, y: e.clientY });
    setOver(hit(e.clientX, e.clientY));
  }

  function onUp(e: PointerEvent) {
    if (!pending || e.pointerId !== pending.pointerId) return;
    if (pending.lifted) {
      swallowClick = true;
      clearTimeout(swallowTimer);
      swallowTimer = setTimeout(() => (swallowClick = false), SWALLOW_MS);
      const target = hit(e.clientX, e.clientY);
      if (target) onDrop(pending.guestId, target);
    }
    stop();
  }

  const onCancel = (e: PointerEvent) => {
    if (pending && e.pointerId === pending.pointerId) stop();
  };

  function start(e: PointerEvent, guestId: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (pending) stop();
    swallowClick = false;
    const el = e.currentTarget as HTMLElement;
    pending = { guestId, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, el, lifted: false };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers refuse capture for a pointer that's already gone.
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    // A finger picks someone up by holding still; a mouse just drags.
    if (e.pointerType === "touch") liftTimer = setTimeout(() => lift(e.clientX, e.clientY), LIFT_MS);
  }

  /** True once, for the click that follows a drag; chips call it first in onClick. */
  function wasDrag(): boolean {
    const was = swallowClick;
    swallowClick = false;
    return was;
  }

  onCleanup(() => {
    stop();
    clearTimeout(swallowTimer);
  });
  return { drag, over, start, wasDrag };
}

/** How long a finger holds before it counts as a long press. */
export const LONG_PRESS_MS = 500;

/**
 * Long-press on an element: `handlers` go on it, `fire` runs after the hold
 * if the finger stayed put. The click that follows a long press is swallowed
 * (check `consumed()` first in any onClick inside), so a seat under the
 * finger doesn't open as well. A press that starts a drag (the seat stops
 * the event) never reaches here.
 */
export function createLongPress(fire: () => void): {
  handlers: {
    onPointerDown: (e: PointerEvent) => void;
    onPointerMove: (e: PointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onContextMenu: (e: Event) => void;
  };
  consumed: Accessor<boolean>;
  swallow: () => boolean;
} {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number } | null = null;
  const [consumed, setConsumed] = createSignal(false);

  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
    origin = null;
  };
  /** The finger's up: whatever click belongs to this press comes right away. */
  const release = () => {
    clear();
    if (consumed()) {
      clearTimeout(expiry);
      expiry = setTimeout(() => setConsumed(false), SWALLOW_MS);
    }
  };

  onCleanup(() => {
    clear();
    clearTimeout(expiry);
  });
  return {
    handlers: {
      onPointerDown(e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        clear();
        setConsumed(false);
        origin = { x: e.clientX, y: e.clientY };
        timer = setTimeout(() => {
          timer = undefined;
          setConsumed(true);
          fire();
        }, LONG_PRESS_MS);
      },
      onPointerMove(e) {
        if (origin && Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > DRAG_SLOP) clear();
      },
      onPointerUp: release,
      onPointerCancel: release,
      // iOS shows a callout for a long press otherwise; Android fires contextmenu.
      onContextMenu(e) {
        e.preventDefault();
      },
    },
    consumed,
    swallow() {
      const was = consumed();
      setConsumed(false);
      return was;
    },
  };
}
