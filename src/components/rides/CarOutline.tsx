import { For, Show } from "solid-js";
import { CAR_KINDS, type CarView } from "~/lib/rides";
import type { DragState, SeatTarget } from "./drag";
import { Face, focusRing, holdable, type CrewLookup } from "./ui";

/**
 * A car seen from above: a long rounded body with a hood and headlights at
 * the top, the driver and seats in the cabin, a trunk and taillights at the
 * bottom, and wheels either side. Empty seats are dashed; a seat with someone
 * in it shows their face and first name. Seats carry data attributes so a
 * drag can find the one under the finger (see drag.ts).
 */
export function CarOutline(props: {
  rideId: number;
  car: CarView;
  crew: CrewLookup;
  me: string;
  /** Who's being dragged, so their old seat looks empty meanwhile. */
  drag: DragState | null;
  /** The seat the drag is over. */
  over: SeatTarget | null;
  /** A person picked on the bench, waiting for a seat tap. */
  picked: string | null;
  onSeatTap: (seat: number) => void;
  onSeatPointerDown: (e: PointerEvent, guestId: string) => void;
  /** Called first in a seat's click; a true return means the click was the end of a drag or long press. */
  swallowClick: () => boolean;
}) {
  const open = () => props.car.booking === null;
  const occupant = (seat: number) => {
    const id = props.car.seats[seat];
    return id && id !== props.drag?.guestId ? id : null;
  };
  const isOver = (seat: number) =>
    props.over !== null && props.over.carId === props.car.id && props.over.seat === seat;
  const line = () => (open() ? "bg-charcoal/60" : "bg-teal");
  const lamp = () => (open() ? "bg-charcoal/35" : "bg-teal");

  return (
    <div class={`relative mx-auto w-full max-w-[250px] px-3 py-1 ${holdable}`}>
      {/* Wheels: front pair by the hood, rear pair by the trunk */}
      <For each={["left-0 top-[13%]", "right-0 top-[13%]", "left-0 bottom-[11%]", "right-0 bottom-[11%]"]}>
        {(pos) => <span aria-hidden="true" class={`absolute ${pos} h-14 w-3.5 rounded-[3px] bg-charcoal/75`} />}
      </For>

      <div
        class={`relative flex flex-col rounded-[3.25rem_3.25rem_2.5rem_2.5rem] border-[3px] px-2.5 pb-3 pt-3
                ${open() ? "border-charcoal/60 bg-cream/70" : "border-teal bg-teal/10"}`}
      >
        {/* Hood: headlights and the bonnet line */}
        <div aria-hidden="true" class="relative h-12">
          <span class={`absolute left-3 top-0 h-2.5 w-7 rounded-full ${lamp()}`} />
          <span class={`absolute right-3 top-0 h-2.5 w-7 rounded-full ${lamp()}`} />
          <span class={`absolute inset-x-6 bottom-3 h-px rounded-full ${line()}`} />
        </div>
        {/* Windscreen */}
        <div aria-hidden="true" class="mx-auto mb-3 h-2.5 w-[70%] rounded-full bg-charcoal/15" />

        {/* Cabin */}
        <div class="space-y-2">
          <For each={CAR_KINDS[props.car.kind].rows}>
            {(row, rowIndex) => (
              <div class="flex items-start justify-center gap-2">
                <Show when={rowIndex() === 0}>
                  <Driver />
                </Show>
                <For each={row}>
                  {(seat) => {
                    const id = () => occupant(seat);
                    const person = () => (id() ? props.crew(id()!) : null);
                    const label = () =>
                      person()
                        ? `Seat ${seat + 1}: ${person()!.name}${id() === props.me ? " (you)" : ""}`
                        : `Seat ${seat + 1}, empty`;
                    return (
                      <button
                        type="button"
                        data-seat={seat}
                        data-car-id={props.car.id}
                        data-ride-id={props.rideId}
                        data-open={open()}
                        aria-label={label()}
                        disabled={!open()}
                        // Flicks still scroll; a held finger picks the person up (drag.ts).
                        style={{ "touch-action": id() && open() ? "pan-y" : undefined }}
                        onPointerDown={(e) => {
                          const g = id();
                          if (g && open()) {
                            // This press is a drag, not a long press on the car.
                            e.stopPropagation();
                            props.onSeatPointerDown(e, g);
                          }
                        }}
                        onClick={(e) => {
                          if (props.swallowClick()) {
                            e.preventDefault();
                            return;
                          }
                          props.onSeatTap(seat);
                        }}
                        class={`flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl
                                text-[11px] font-semibold leading-none transition-[background-color,box-shadow,transform]
                                ${focusRing}
                                ${isOver(seat) ? "scale-105 bg-orange/25 ring-2 ring-orange" : ""}
                                ${
                                  person()
                                    ? "bg-cream text-charcoal ring-1 ring-charcoal/20"
                                    : props.picked && open()
                                      ? "border-2 border-dashed border-orange/70 bg-orange/10 text-charcoal/75"
                                      : "border-2 border-dashed border-charcoal/25 text-charcoal/75"
                                }
                                ${open() ? "active:scale-95" : "cursor-default"}`}
                      >
                        <Show when={person()} fallback={<span aria-hidden="true">{props.picked && open() ? "Tap" : "Empty"}</span>}>
                          {(p) => (
                            <>
                              <Face initials={p().initials} image={p().image} size="md" />
                              <span class="max-w-full truncate px-1">{id() === props.me ? "You" : p().name}</span>
                            </>
                          )}
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </div>
            )}
          </For>
        </div>

        {/* Rear window and trunk with taillights */}
        <div aria-hidden="true" class="mx-auto mt-3 h-2 w-[60%] rounded-full bg-charcoal/15" />
        <div aria-hidden="true" class="relative h-9">
          <span class={`absolute inset-x-6 top-3 h-px rounded-full ${line()}`} />
          <span class={`absolute bottom-0 left-3 h-2 w-6 rounded-full ${open() ? "bg-orange/60" : "bg-teal"}`} />
          <span class={`absolute bottom-0 right-3 h-2 w-6 rounded-full ${open() ? "bg-orange/60" : "bg-teal"}`} />
        </div>
      </div>
    </div>
  );
}

function Driver() {
  return (
    <div
      aria-hidden="true"
      class="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-2xl bg-charcoal/8 text-[10px] font-semibold text-charcoal/75"
    >
      <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M3.5 10.5h6M14.5 10.5h6M12 14.5V21" />
      </svg>
      Driver
    </div>
  );
}
