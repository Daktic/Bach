import { createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { PhonePosition } from "~/lib/ride-places";
import type { PositionState } from "~/lib/client/position";
import { MAX_CARS, ridersOf, type CarKind, type CarView, type RideView } from "~/lib/rides";
import type { CrewMemberView } from "~/lib/types";
import { CarBox, type CarActions } from "./CarBox";
import { createSeatDrag } from "./drag";
import { KindPicker, SeatPicker } from "./pickers";
import { Face, focusRing, holdable, rideTime, secondaryButton, textButton, type CrewLookup } from "./ui";

export interface RideActions extends CarActions {
  seat: (guestId: string, carId: number, seat: number) => void;
  unseat: (guestId: string) => void;
  addCar: (kind: CarKind) => void;
  removeCar: (carId: number) => void;
  setKind: (carId: number, kind: CarKind) => void;
  autoArrange: () => void;
  remove: () => void;
}

/**
 * One ride: where and when, the bench of people with no seat yet, and a car
 * outline per car. People get into seats by dragging, or by tapping them
 * on the bench and then a seat, or by tapping a seat and picking a name.
 */
export function RideCard(props: {
  ride: RideView;
  me: string;
  roster: readonly CrewMemberView[];
  crew: CrewLookup;
  busy: boolean;
  pickup: PhonePosition | null;
  positionState: PositionState;
  actions: RideActions;
}) {
  const to = () => props.ride.destination.name;
  const seated = () => new Set(ridersOf(props.ride));
  const bench = () => props.roster.filter((p) => !seated().has(p.id));
  const openCars = () => props.ride.cars.filter((c) => !c.booking);
  const allBooked = () => props.ride.cars.length > 0 && openCars().length === 0;

  // A bench person picked by tap, waiting for a seat tap.
  const [picked, setPicked] = createSignal<string | null>(null);
  const [seatSheet, setSeatSheet] = createSignal<{ car: CarView; seat: number } | null>(null);
  const [kindSheet, setKindSheet] = createSignal<CarView | null>(null);

  const drag = createSeatDrag(props.ride.id, (guestId, target) => {
    setPicked(null);
    props.actions.seat(guestId, target.carId, target.seat);
  });

  function onSeatTap(car: CarView, seat: number) {
    if (car.booking) return;
    const who = picked();
    if (who) {
      setPicked(null);
      props.actions.seat(who, car.id, seat);
      return;
    }
    setSeatSheet({ car, seat });
  }

  // The sheet shows the live seat, not the one captured when it opened.
  const liveSeatSheet = () => {
    const s = seatSheet();
    if (!s) return null;
    const car = props.ride.cars.find((c) => c.id === s.car.id);
    return car && !car.booking ? { car, seat: s.seat } : null;
  };
  const liveKindSheet = () => {
    const k = kindSheet();
    const car = k && props.ride.cars.find((c) => c.id === k.id);
    return car && !car.booking ? car : null;
  };
  const carNo = (car: CarView) => props.ride.cars.findIndex((c) => c.id === car.id) + 1;


  return (
    <article class="paper-card rounded-2xl p-4" aria-busy={props.busy}>
      <header class="min-w-0">
        <p class="text-xs font-black uppercase tracking-wide text-charcoal/75">
          {props.ride.departAt ? rideTime(props.ride.departAt) : "Whenever"}
        </p>
        <h3 class="mt-0.5 text-base font-black leading-snug text-charcoal">
          <span aria-hidden="true">→ </span>
          <span class="sr-only">To </span>
          {to()}
        </h3>
        <Show when={props.ride.destination.address}>
          <p class="mt-0.5 truncate text-xs text-charcoal/75">{props.ride.destination.address}</p>
        </Show>
        <Show when={props.ride.note}>
          <p class="mt-0.5 text-sm text-charcoal/75">{props.ride.note}</p>
        </Show>
      </header>

      {/* The bench: everyone without a seat. Drag a chip onto a seat, or tap
          it and then tap a seat. */}
      <Show when={!allBooked()}>
        <section aria-label="Not in a car yet" class="mt-3">
          <div class="flex items-baseline justify-between">
            <h4 class="text-xs font-black uppercase tracking-wide text-charcoal/75">
              Not in a car yet · {bench().length}
            </h4>
            <Show when={picked()}>
              {(who) => (
                <p class="text-xs font-semibold text-charcoal" role="status">
                  Now tap a seat for {who() === props.me ? "yourself" : props.crew(who()).name}.{" "}
                  <button type="button" class="underline" onClick={() => setPicked(null)}>
                    Cancel
                  </button>
                </p>
              )}
            </Show>
          </div>
          <Show
            when={bench().length > 0}
            fallback={<p class="mt-1 text-sm text-charcoal/75">Everyone's got a seat.</p>}
          >
            {/* No context menu: a held chip is being picked up, not inspected. */}
            <ul class="mt-1.5 flex flex-wrap gap-1.5" onContextMenu={(e) => e.preventDefault()}>
              <For each={bench()}>
                {(person) => {
                  const isPicked = () => picked() === person.id;
                  const hidden = () => drag.drag()?.guestId === person.id;
                  return (
                    <li>
                      <button
                        type="button"
                        aria-pressed={isPicked()}
                        aria-label={`${person.id === props.me ? `${person.name} (you)` : person.name}. ${isPicked() ? "Picked; tap a seat" : "Pick, then tap a seat"}`}
                        disabled={openCars().length === 0}
                        style={{ "touch-action": "pan-y" }}
                        onPointerDown={(e) => drag.start(e, person.id)}
                        onClick={() => {
                          if (drag.wasDrag()) return;
                          setPicked(isPicked() ? null : person.id);
                        }}
                        class={`inline-flex min-h-10 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold
                                text-charcoal ring-1 transition-[background-color,box-shadow,opacity] ${holdable} ${focusRing}
                                ${hidden() ? "opacity-30" : ""}
                                ${isPicked() ? "bg-orange/20 ring-2 ring-orange" : "bg-cream/80 ring-charcoal/15 hover:bg-charcoal/5"}`}
                      >
                        <Face initials={person.initials} image={person.image} size="md" />
                        {person.id === props.me ? "You" : person.name}
                      </button>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
        </section>
      </Show>

      {/* The cars */}
      <div class="mt-3 space-y-3">
        <For each={props.ride.cars}>
          {(car, i) => (
            <CarBox
              ride={props.ride}
              car={car}
              carNo={i() + 1}
              me={props.me}
              crew={props.crew}
              busy={props.busy}
              drag={drag.drag()}
              over={drag.over()}
              picked={picked()}
              pickup={props.pickup}
              positionState={props.positionState}
              onSeatTap={(seat) => onSeatTap(car, seat)}
              onSeatPointerDown={(e, g) => drag.start(e, g)}
              wasDrag={drag.wasDrag}
              onOpenKind={() => setKindSheet(car)}
              actions={props.actions}
            />
          )}
        </For>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <Show when={props.ride.cars.length < MAX_CARS}>
          <button type="button" class={secondaryButton} disabled={props.busy} onClick={() => props.actions.addCar("standard")}>
            + Standard car
          </button>
          <button type="button" class={secondaryButton} disabled={props.busy} onClick={() => props.actions.addCar("xl")}>
            + XL car
          </button>
        </Show>
        <Show when={openCars().some((c) => c.seats.some(Boolean))}>
          <button
            type="button"
            class={textButton}
            disabled={props.busy}
            onClick={props.actions.autoArrange}
          >
            Auto-arrange
          </button>
        </Show>
        <span class="flex-1" />
        <Show when={!props.ride.cars.some((c) => c.booking)}>
          <button
            type="button"
            class={textButton}
            disabled={props.busy}
            onClick={() => {
              if (confirm(`Remove the ride to ${to()}?`)) props.actions.remove();
            }}
          >
            Remove ride
          </button>
        </Show>
      </div>
      <p class="mt-1 text-xs text-charcoal/75">
        Tap a seat to pick who sits there, or hold someone and drag them in. Long-press a car to make it Standard or XL.
      </p>

      {/* The chip that follows the finger during a drag */}
      <Show when={drag.drag()}>
        {(d) => (
          <Portal>
            <div
              aria-hidden="true"
              class="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2 scale-110"
              style={{ left: `${d().x}px`, top: `${d().y}px` }}
            >
              <span class="paper-card inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold text-charcoal shadow-xl ring-2 ring-orange">
                <Face initials={props.crew(d().guestId).initials} image={props.crew(d().guestId).image} size="md" />
                {d().guestId === props.me ? "You" : props.crew(d().guestId).name}
              </span>
            </div>
          </Portal>
        )}
      </Show>

      <SeatPicker
        open={liveSeatSheet()}
        ride={props.ride}
        me={props.me}
        roster={props.roster}
        crew={props.crew}
        busy={props.busy}
        onPick={(g) => {
          const s = liveSeatSheet();
          if (s) props.actions.seat(g, s.car.id, s.seat);
          setSeatSheet(null);
        }}
        onEmpty={(g) => {
          props.actions.unseat(g);
          setSeatSheet(null);
        }}
        onClose={() => setSeatSheet(null)}
      />
      <KindPicker
        open={liveKindSheet()}
        carNo={liveKindSheet() ? carNo(liveKindSheet()!) : 0}
        crew={props.crew}
        busy={props.busy}
        onPick={(kind) => {
          const car = liveKindSheet();
          if (car) props.actions.setKind(car.id, kind);
          setKindSheet(null);
        }}
        onRemove={() => {
          const car = liveKindSheet();
          if (car) props.actions.removeCar(car.id);
          setKindSheet(null);
        }}
        onClose={() => setKindSheet(null)}
      />
    </article>
  );
}
