import { createEffect, createSignal, For, on, Show } from "solid-js";
import { lyftLink, uberLink, type PhonePosition } from "~/lib/ride-places";
import type { PositionState } from "~/lib/client/position";
import {
  CAR_KINDS,
  formatCents,
  parseFare,
  ridersIn,
  splitFare,
  type CarView,
  type RideProvider,
  type RideView,
} from "~/lib/rides";
import { CarOutline } from "./CarOutline";
import { createLongPress, type DragState, type SeatTarget } from "./drag";
import { Face, focusRing, primaryButton, secondaryButton, textButton, type CrewLookup } from "./ui";

export interface CarActions {
  book: (carId: number, provider: RideProvider) => void;
  release: (carId: number) => void;
  setFare: (carId: number, cents: number | null) => void;
  setSettled: (carId: number, riderId: string, settled: boolean) => void;
}

const PROVIDER = { uber: "Uber", lyft: "Lyft" } as const;

/** What to pick in the app: Lyft's link sets it, Uber's can't. */
const appCarName = (provider: RideProvider, kind: CarView["kind"]) =>
  provider === "uber" ? (kind === "xl" ? "UberXL" : "UberX") : kind === "xl" ? "Lyft XL" : "Lyft";

/**
 * One car in a ride: its outline with seats, the size badge (tap, or
 * long-press the car, to change it), the Uber and Lyft buttons, and once
 * booked, the fare split.
 */
export function CarBox(props: {
  ride: RideView;
  car: CarView;
  carNo: number;
  me: string;
  crew: CrewLookup;
  busy: boolean;
  drag: DragState | null;
  over: SeatTarget | null;
  picked: string | null;
  /** The phone's position for Lyft's pickup, and whether it's coming. */
  pickup: PhonePosition | null;
  positionState: PositionState;
  onSeatTap: (seat: number) => void;
  onSeatPointerDown: (e: PointerEvent, guestId: string) => void;
  wasDrag: () => boolean;
  onOpenKind: () => void;
  actions: CarActions;
}) {
  const to = () => props.ride.destination;
  const riders = () => ridersIn(props.car);
  const open = () => props.car.booking === null;
  // After "Open in Uber", ask whether they booked it there.
  const [opened, setOpened] = createSignal<RideProvider | null>(null);
  // Once the car's booked (by them or someone else), the question's answered.
  createEffect(() => {
    if (props.car.booking) setOpened(null);
  });
  const longPress = createLongPress(() => {
    if (open()) props.onOpenKind();
  });

  return (
    <section
      aria-label={`Car ${props.carNo}, ${CAR_KINDS[props.car.kind].label}, ${riders().length} of ${props.car.seats.length} seats taken`}
      class={`rounded-2xl p-3 ring-1 ${open() ? "bg-cream/40 ring-charcoal/10" : "bg-teal/5 ring-teal/60"}`}
    >
      <div class="flex items-center justify-between gap-2">
        <h4 class="text-sm font-black text-charcoal">Car {props.carNo}</h4>
        <button
          type="button"
          disabled={!open()}
          onClick={props.onOpenKind}
          aria-label={`${CAR_KINDS[props.car.kind].label}, ${props.car.seats.length} seats. Change size`}
          class={`inline-flex min-h-9 items-center gap-1.5 rounded-full bg-charcoal px-3 text-[11px] font-black uppercase
                  tracking-wide text-cream disabled:opacity-70 ${focusRing}`}
        >
          {CAR_KINDS[props.car.kind].label}
          <span class="font-semibold normal-case tracking-normal text-cream/80">· {props.car.seats.length} seats</span>
          <Show when={open()}>
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </Show>
        </button>
      </div>

      {/* The car. A long press anywhere on it opens the size picker; the
          click that follows is swallowed so a seat doesn't open too. */}
      <div {...longPress.handlers} class="mt-1">
        <CarOutline
          rideId={props.ride.id}
          car={props.car}
          crew={props.crew}
          me={props.me}
          drag={props.drag}
          over={props.over}
          picked={props.picked}
          onSeatTap={props.onSeatTap}
          onSeatPointerDown={props.onSeatPointerDown}
          swallowClick={() => {
            const a = props.wasDrag();
            const b = longPress.swallow();
            return a || b;
          }}
        />
      </div>

      <Show
        when={props.car.booking}
        fallback={
          <Show
            when={riders().length > 0}
            fallback={<p class="mt-1 text-center text-xs text-charcoal/75">Drag people in, or tap a seat.</p>}
          >
            <div class="mt-2 grid grid-cols-2 gap-2">
              <a
                href={uberLink(to())}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpened("uber")}
                class={primaryButton}
              >
                Open in Uber
              </a>
              <a
                href={lyftLink(to(), props.car.kind, props.pickup)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpened("lyft")}
                class={primaryButton}
              >
                Open in Lyft
              </a>
            </div>
            <p class="mt-1.5 text-xs text-charcoal/75">
              {riders().length} {riders().length === 1 ? "rider" : "riders"} to {to().name}, picked up where your phone is.
              Lyft opens on {appCarName("lyft", props.car.kind)}; in Uber pick {appCarName("uber", props.car.kind)}.
              <Show when={props.pickup === null}>
                {" "}
                {props.positionState === "denied"
                  ? "Location is off for Bach, so Lyft opens without the destination; Uber still works."
                  : props.positionState === "unavailable"
                    ? "Without your location Lyft opens without the destination; Uber still works."
                    : "Finding your location for Lyft…"}
              </Show>
            </p>
            <Show
              when={opened()}
              fallback={
                <div class="mt-1 flex flex-wrap gap-1">
                  <button type="button" class={textButton} disabled={props.busy} onClick={() => props.actions.book(props.car.id, "uber")}>
                    I booked it on Uber
                  </button>
                  <button type="button" class={textButton} disabled={props.busy} onClick={() => props.actions.book(props.car.id, "lyft")}>
                    on Lyft
                  </button>
                </div>
              }
            >
              {(provider) => (
                <div role="group" aria-label="Did you book it?" class="mt-2 rounded-xl bg-orange/10 p-2.5">
                  <p class="text-sm font-semibold text-charcoal">Did you book this car on {PROVIDER[provider()]}?</p>
                  <div class="mt-2 flex gap-2">
                    <button
                      type="button"
                      class={primaryButton}
                      disabled={props.busy}
                      onClick={() => {
                        props.actions.book(props.car.id, provider());
                        setOpened(null);
                      }}
                    >
                      Yes, I booked it
                    </button>
                    <button type="button" class={secondaryButton} onClick={() => setOpened(null)}>
                      Not yet
                    </button>
                  </div>
                </div>
              )}
            </Show>
          </Show>
        }
      >
        {(booking) => (
          <Booked car={props.car} booking={booking()} me={props.me} crew={props.crew} busy={props.busy} actions={props.actions} />
        )}
      </Show>
    </section>
  );
}

function Booked(props: {
  car: CarView;
  booking: NonNullable<CarView["booking"]>;
  me: string;
  crew: CrewLookup;
  busy: boolean;
  actions: CarActions;
}) {
  const booker = () => props.crew(props.booking.bookerId);
  const mine = () => props.booking.bookerId === props.me;
  const shares = () => (props.booking.fareCents === null ? null : splitFare(props.booking.fareCents, props.booking.riders));
  const owers = () => props.booking.riders.filter((r) => r !== props.booking.bookerId);
  const [fareText, setFareText] = createSignal("");
  // Shows the saved fare, and follows it when the booker changes it (also on
  // their other phone); a half-typed figure stays while the fare's the same.
  createEffect(on(() => props.booking.fareCents, (cents) => setFareText(cents === null ? "" : (cents / 100).toFixed(2))));
  const [fareError, setFareError] = createSignal(false);

  function saveFare(e: SubmitEvent) {
    e.preventDefault();
    const cents = fareText().trim() === "" ? null : parseFare(fareText());
    if (fareText().trim() !== "" && cents === null) {
      setFareError(true);
      return;
    }
    setFareError(false);
    props.actions.setFare(props.car.id, cents);
  }

  return (
    <div class="mt-2 space-y-3">
      <p class="text-sm text-charcoal">
        <span class="font-black">{mine() ? "You" : booker().name}</span> booked this car on{" "}
        {PROVIDER[props.booking.provider]}.
        <Show when={props.booking.fareCents !== null}>
          {" "}Fare <span class="font-black">{formatCents(props.booking.fareCents!)}</span>.
        </Show>
      </p>

      <Show
        when={mine()}
        fallback={
          <Show when={props.booking.fareCents === null}>
            <p class="text-xs text-charcoal/75">{booker().name} adds the fare once the ride's done.</p>
          </Show>
        }
      >
        <form onSubmit={saveFare} class="flex items-end gap-2">
          <label class="flex-1 text-xs font-semibold text-charcoal/75">
            What it cost, with tip
            <div class="mt-1 flex items-center rounded-xl border border-charcoal/20 bg-cream px-3">
              <span aria-hidden="true" class="text-sm text-charcoal/75">$</span>
              <input
                inputmode="decimal"
                autocomplete="off"
                placeholder="0.00"
                value={fareText()}
                onInput={(e) => setFareText(e.currentTarget.value)}
                aria-invalid={fareError()}
                class="min-h-11 w-full bg-transparent px-1 text-base text-charcoal outline-none"
              />
            </div>
          </label>
          <button type="submit" class={primaryButton} disabled={props.busy}>
            Save
          </button>
        </form>
        <Show when={fareError()}>
          <p role="alert" class="text-xs font-semibold text-charcoal">Enter the fare in dollars, like 48.20.</p>
        </Show>
      </Show>

      <Show when={shares()}>
        {(split) => (
          <ul class="space-y-1">
            <For each={owers()}>
              {(id) => {
                const person = () => props.crew(id);
                const settled = () => props.booking.settled.includes(id);
                const canMark = () => mine() || id === props.me;
                return (
                  <li class="flex min-h-11 items-center gap-2 text-sm text-charcoal">
                    <Face initials={person().initials} image={person().image} />
                    <span class={`flex-1 ${settled() ? "line-through" : ""}`}>
                      {id === props.me ? "You owe" : `${person().name} owes`} {mine() ? "you" : booker().name}{" "}
                      <span class="font-black">{formatCents(split().get(id) ?? 0)}</span>
                    </span>
                    <label class={`flex min-h-11 items-center gap-1.5 px-2 text-xs font-semibold ${canMark() ? "text-charcoal" : "text-charcoal/75"}`}>
                      <input
                        type="checkbox"
                        checked={settled()}
                        disabled={!canMark() || props.busy}
                        onChange={(e) => props.actions.setSettled(props.car.id, id, e.currentTarget.checked)}
                        aria-label={`${id === props.me ? "You" : person().name} paid back ${formatCents(split().get(id) ?? 0)}`}
                        class="h-5 w-5 accent-teal"
                      />
                      Paid back
                    </label>
                  </li>
                );
              }}
            </For>
          </ul>
        )}
      </Show>

      <Show when={mine()}>
        <button type="button" class={textButton} disabled={props.busy} onClick={() => props.actions.release(props.car.id)}>
          Give up this booking
        </button>
      </Show>
    </div>
  );
}
