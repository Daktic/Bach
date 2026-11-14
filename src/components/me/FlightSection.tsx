import { createAsync, useLocation } from "@solidjs/router";
import { createEffect, createSignal, on, onCleanup, Show, Suspense } from "solid-js";
import { getFlightBoard } from "~/lib/api/flights";
import { loadMyTravel, onMyTravelChange, saveMyTravel, type MyTravel } from "~/lib/client/my-travel";
import { DEFAULT_INBOUND_DATE, DEFAULT_OUTBOUND_DATE } from "~/lib/config";
import type { Me } from "~/lib/types";
import { sameTravel, toFlightLeg } from "./flight-entry";
import { LegPanel } from "./LegPanel";
import { CarIcon, ErrorNote, SectionHeading } from "./ui";

const STORAGE_ERROR = "Couldn't save on this device. Storage may be full or turned off (private browsing).";

/**
 * ME-3 / FL-1 / FL-9: the guest's own flights, saved on this device until
 * flights are stored server-side. Mirrors how /flights resolves "my arrival":
 * driving beats any flight, a flight saved here beats the tracker's record.
 */
export function FlightSection(props: { me: Me }) {
  const guestId = () => props.me.id;
  const [travel, setTravel] = createSignal<MyTravel>(loadMyTravel(guestId()));
  const [saveError, setSaveError] = createSignal<string | null>(null);
  // The shared tracker's view. Failures just mean no "On the tracker" card.
  const board = createAsync(() => getFlightBoard().catch(() => null));
  let sectionEl: HTMLElement | undefined;

  // Follow saves from other tabs, and reload if a different guest signs in.
  createEffect(
    on(guestId, (id, previousId) => {
      if (previousId !== undefined) setTravel(loadMyTravel(id));
      onCleanup(onMyTravelChange(id, () => setTravel(loadMyTravel(id))));
    }),
  );

  // Other pages link to /me#flight-section. The section renders after data
  // loads, so the browser's own jump has already missed it.
  const location = useLocation();
  createEffect(() => {
    if (location.hash !== "#flight-section") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      sectionEl?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }),
    );
  });

  /** Saves, then shows what was actually stored so a failed write isn't hidden. */
  function save(next: MyTravel) {
    const id = guestId();
    saveMyTravel(id, next);
    const stored = loadMyTravel(id);
    setTravel(stored);
    setSaveError(sameTravel(stored, next) ? null : STORAGE_ERROR);
  }

  // The inbound flight stays saved while "driving" is on. Driving wins wherever
  // the arrival is worked out (/flights, "Who's here"), and switching it off
  // brings the flight back, even after a reload or from another tab.
  function setDriving(driving: boolean) {
    save({ ...travel(), driving });
  }

  // A plain accessor, not a memo: a memo would read `board` right here and make
  // the whole page wait. This way only the inbound <Suspense> below waits, and
  // only when nothing is saved locally.
  const tracker = () => {
    const b = board();
    if (!b) return null;
    const flight = b.flights.find((f) => f.guestId === guestId());
    if (flight) return { kind: "flight" as const, leg: toFlightLeg(flight) };
    if (b.driving.some((g) => g.id === guestId())) return { kind: "driving" as const };
    return null;
  };

  // Whether the tracker has this guest driving in, for the switch. Copied in an
  // effect (keep it one): effects don't trigger Suspense, so the switch never
  // holds up the page. It shows what's saved here and catches up when the
  // board loads.
  const [trackerDriving, setTrackerDriving] = createSignal(false);
  createEffect(() => setTrackerDriving(tracker()?.kind === "driving"));
  // On the organiser's driving list with nothing saved here. The switch can't
  // turn that off; only adding a flight replaces it (as on /flights).
  const seededDriving = () => !travel().driving && !travel().inbound && trackerDriving();

  return (
    <section
      ref={sectionEl}
      id="flight-section"
      aria-labelledby="flight-section-title"
      class="paper-card scroll-mt-20 space-y-4 rounded-xl p-4"
    >
      <SectionHeading id="flight-section-title">My flights</SectionHeading>

      <DrivingToggle
        checked={travel().driving || seededDriving()}
        locked={seededDriving()}
        onChange={setDriving}
      />

      <Show
        when={!travel().driving}
        fallback={
          <div class="flex items-start gap-3 rounded-xl bg-teal/10 p-3">
            <CarIcon class="mt-0.5 h-5 w-5 shrink-0 text-charcoal/60" />
            <div>
              <p class="text-sm font-bold text-charcoal">Driving in</p>
              <p class="text-xs text-charcoal/80">No inbound flight needed. You can still add your flight home.</p>
              <Show when={travel().inbound}>
                {(leg) => (
                  <p class="mt-1 text-xs text-charcoal/80">
                    Your {leg().flightNumber} flight is kept in case you switch this off.
                  </p>
                )}
              </Show>
            </div>
          </div>
        }
      >
        <Suspense fallback={<div aria-hidden="true" class="h-28 animate-pulse rounded-xl bg-charcoal/[0.06]" />}>
          <LegPanel
            direction="in"
            label="Flying in"
            defaultDate={DEFAULT_INBOUND_DATE}
            leg={travel().inbound}
            tracker={tracker()}
            onSave={(leg) => save({ ...travel(), inbound: leg, driving: false })}
            onRemove={() => save({ ...travel(), inbound: null })}
          />
        </Suspense>
      </Show>

      <div class="h-px w-full bg-charcoal/10" />

      <LegPanel
        direction="out"
        label="Flying home"
        addLabel="Add your flight home"
        defaultDate={DEFAULT_OUTBOUND_DATE}
        leg={travel().outbound}
        onSave={(leg) => save({ ...travel(), outbound: leg })}
        onRemove={() => save({ ...travel(), outbound: null })}
      />

      <Show when={saveError()}>{(message) => <ErrorNote>{message()}</ErrorNote>}</Show>

      <p class="text-xs text-charcoal/75">
        Flight details are saved on this device until the shared tracker is connected.
      </p>
    </section>
  );
}

/**
 * `locked`: on because of the tracker, so tapping it can't turn it off. That
 * uses aria-disabled rather than disabled, so the switch stays focusable and
 * the hint saying why is still read out.
 */
function DrivingToggle(props: { checked: boolean; locked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-disabled={props.locked || undefined}
      aria-labelledby="driving-toggle-label"
      aria-describedby="driving-toggle-hint"
      onClick={() => {
        if (!props.locked) props.onChange(!props.checked);
      }}
      class={`flex min-h-11 w-full items-center gap-3 rounded-xl border border-charcoal/10 bg-white/40 px-3
             py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2
             focus-visible:outline-charcoal ${props.locked ? "cursor-default" : "hover:border-charcoal/25"}`}
    >
      <CarIcon class="h-5 w-5 shrink-0 text-charcoal/50" />
      <span class="min-w-0 flex-1">
        <span id="driving-toggle-label" class="block text-sm font-bold text-charcoal">
          I'm driving in
        </span>
        <span id="driving-toggle-hint" class="block text-xs text-charcoal/75">
          {props.locked
            ? "The organiser has you down as driving. Add a flight below to change it."
            : "Not flying to PHX"}
        </span>
      </span>
      {/* The charcoal outline and knob carry the state at ≥ 3:1 (WCAG 1.4.11);
          teal and white alone are too faint on paper. On: teal track, knob
          right. Off: empty track, knob left. */}
      <span
        aria-hidden="true"
        class={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors ${
          props.locked ? "border-charcoal/50" : "border-charcoal"
        } ${props.checked ? (props.locked ? "bg-teal/50" : "bg-teal") : "bg-white/40"}`}
      >
        <span
          class={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full transition-transform ${
            props.locked ? "bg-charcoal/50" : "bg-charcoal"
          } ${props.checked ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}
