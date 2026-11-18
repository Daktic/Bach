import { createSignal, For, Show } from "solid-js";
import { getRidePlace, lyftLink, uberLink } from "~/lib/ride-places";
import {
  CAR_KINDS,
  formatCents,
  parseFare,
  splitFare,
  type CarView,
  type RideProvider,
  type RideView,
} from "~/lib/rides";
import { Face, focusRing, primaryButton, secondaryButton, textButton, type CrewLookup } from "./ui";

export interface CarActions {
  book: (car: number, provider: RideProvider) => void;
  release: (car: number) => void;
  setFare: (car: number, cents: number | null) => void;
  setSettled: (car: number, riderId: string, settled: boolean) => void;
  move: (guestId: string, car: number) => void;
}

const PROVIDER = { uber: "Uber", lyft: "Lyft" } as const;

/** What to pick in the app, since a link can't choose the car type for Uber. */
const appCarName = (provider: RideProvider, kind: CarView["kind"]) =>
  provider === "uber" ? (kind === "xl" ? "UberXL" : "UberX") : kind === "xl" ? "Lyft XL" : "Lyft";

/** One car in a ride: who's in it, the app buttons, and once booked, the fare split. */
export function CarBox(props: {
  ride: RideView;
  car: CarView;
  me: string;
  crew: CrewLookup;
  busy: boolean;
  /** The rider picked to move, if any. */
  moving: string | null;
  setMoving: (guestId: string | null) => void;
  actions: CarActions;
}) {
  const from = () => getRidePlace(props.ride.fromId)!;
  const to = () => getRidePlace(props.ride.toId)!;
  const full = () => props.car.riders.length >= props.car.seats;
  const canMove = () => !props.ride.locked && props.ride.cars.length > 1;
  const movingHere = () => props.moving !== null && !props.car.riders.includes(props.moving);
  // After "Open in Uber", ask whether they booked it there.
  const [opened, setOpened] = createSignal<RideProvider | null>(null);

  return (
    <section
      aria-label={`Car ${props.car.index + 1}, ${CAR_KINDS[props.car.kind].label}`}
      class={`rounded-xl border p-3 ${props.car.booking ? "border-teal bg-teal/10" : "border-charcoal/15 bg-cream/50"}`}
    >
      <div class="flex items-center justify-between gap-2">
        <h4 class="text-sm font-black text-charcoal">
          Car {props.car.index + 1}
          <span class="ml-2 rounded-full bg-charcoal px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-cream">
            {CAR_KINDS[props.car.kind].label}
          </span>
        </h4>
        <span class="text-xs font-semibold text-charcoal/75">
          {props.car.riders.length} of {props.car.seats} seats
        </span>
      </div>

      {/* Riders. Tap one, then "Move here" on another car. */}
      <ul class="mt-2 flex flex-wrap gap-1.5">
        <For each={props.car.riders}>
          {(id) => {
            const person = () => props.crew(id);
            const picked = () => props.moving === id;
            return (
              <li>
                <Show
                  when={canMove()}
                  fallback={
                    <span class="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-cream/80 py-1 pl-1 pr-3 text-sm font-semibold text-charcoal ring-1 ring-charcoal/10">
                      <Face initials={person().initials} image={person().image} />
                      {person().name}
                    </span>
                  }
                >
                  <button
                    type="button"
                    aria-pressed={picked()}
                    aria-label={picked() ? `${person().name}, picked to move` : `Move ${person().name}`}
                    onClick={() => props.setMoving(picked() ? null : id)}
                    class={`inline-flex min-h-9 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-semibold
                            text-charcoal ring-1 transition-colors ${focusRing}
                            ${picked() ? "bg-orange/20 ring-orange" : "bg-cream/80 ring-charcoal/10 hover:bg-charcoal/5"}`}
                  >
                    <Face initials={person().initials} image={person().image} />
                    {person().name}
                  </button>
                </Show>
              </li>
            );
          }}
        </For>
        <Show when={props.car.riders.length === 0}>
          <li class="text-sm text-charcoal/75">Empty</li>
        </Show>
      </ul>

      <Show when={canMove() && movingHere()}>
        <button
          type="button"
          disabled={props.busy}
          onClick={() => {
            props.actions.move(props.moving!, props.car.index);
            props.setMoving(null);
          }}
          class={`${secondaryButton} mt-2 w-full border-dashed`}
        >
          Move {props.crew(props.moving!).name} here{full() ? " (swaps one rider)" : ""}
        </button>
      </Show>

      <Show
        when={props.car.booking}
        fallback={
          <Show when={props.car.riders.length > 0}>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <a
                href={uberLink(from(), to())}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpened("uber")}
                class={primaryButton}
              >
                Open in Uber
              </a>
              <a
                href={lyftLink(from(), to(), props.car.kind)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpened("lyft")}
                class={primaryButton}
              >
                Open in Lyft
              </a>
            </div>
            <p class="mt-1.5 text-xs text-charcoal/75">
              Pick {appCarName("uber", props.car.kind)} or {appCarName("lyft", props.car.kind)} in the app.
              <Show when={!from().lat}> Pickup is wherever your phone is.</Show>
            </p>
            <Show
              when={opened()}
              fallback={
                <div class="mt-1 flex gap-1">
                  <button type="button" class={textButton} disabled={props.busy} onClick={() => props.actions.book(props.car.index, "uber")}>
                    I booked it on Uber
                  </button>
                  <button type="button" class={textButton} disabled={props.busy} onClick={() => props.actions.book(props.car.index, "lyft")}>
                    on Lyft
                  </button>
                </div>
              }
            >
              {(provider) => (
                <div role="group" aria-label="Did you book it?" class="mt-2 rounded-lg bg-orange/10 p-2.5">
                  <p class="text-sm font-semibold text-charcoal">Did you book this car on {PROVIDER[provider()]}?</p>
                  <div class="mt-2 flex gap-2">
                    <button
                      type="button"
                      class={primaryButton}
                      disabled={props.busy}
                      onClick={() => {
                        props.actions.book(props.car.index, provider());
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
        {(booking) => <Booked car={props.car} booking={booking()} me={props.me} crew={props.crew} busy={props.busy} actions={props.actions} />}
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
  const [fareText, setFareText] = createSignal(
    props.booking.fareCents === null ? "" : (props.booking.fareCents / 100).toFixed(2),
  );
  const [fareError, setFareError] = createSignal(false);

  function saveFare(e: SubmitEvent) {
    e.preventDefault();
    const cents = fareText().trim() === "" ? null : parseFare(fareText());
    if (fareText().trim() !== "" && cents === null) {
      setFareError(true);
      return;
    }
    setFareError(false);
    props.actions.setFare(props.car.index, cents);
  }

  return (
    <div class="mt-3 space-y-3">
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
                    <span class={`flex-1 ${settled() ? "text-charcoal/60 line-through" : ""}`}>
                      {id === props.me ? "You owe" : `${person().name} owes`} {mine() ? "you" : booker().name}{" "}
                      <span class="font-black">{formatCents(split().get(id) ?? 0)}</span>
                    </span>
                    <label class={`flex items-center gap-1.5 text-xs font-semibold ${canMark() ? "text-charcoal" : "text-charcoal/60"}`}>
                      <input
                        type="checkbox"
                        checked={settled()}
                        disabled={!canMark() || props.busy}
                        onChange={(e) => props.actions.setSettled(props.car.index, id, e.currentTarget.checked)}
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
        <button type="button" class={textButton} disabled={props.busy} onClick={() => props.actions.release(props.car.index)}>
          Give up this booking
        </button>
      </Show>
    </div>
  );
}
