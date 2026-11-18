import { For, Show } from "solid-js";
import { CAR_KINDS, ridersIn, type CarKind, type CarView, type RideView } from "~/lib/rides";
import type { CrewMemberView } from "~/lib/types";
import { Sheet } from "./Sheet";
import { Face, focusRing, listNames, type CrewLookup } from "./ui";

const rowClass = `flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-sm font-semibold text-charcoal
                  hover:bg-charcoal/5 disabled:opacity-50 ${focusRing}`;

/** Where someone is in this ride, for the picker's second line. */
function whereIs(ride: RideView, guestId: string): string | null {
  const i = ride.cars.findIndex((c) => c.seats.includes(guestId));
  if (i < 0) return null;
  const car = ride.cars[i];
  return `Car ${i + 1}${car.booking ? " (booked)" : ""}`;
}

/** Who goes in a seat: the crew, with where each one already is. */
export function SeatPicker(props: {
  open: { car: CarView; seat: number } | null;
  ride: RideView;
  me: string;
  roster: readonly CrewMemberView[];
  crew: CrewLookup;
  busy: boolean;
  onPick: (guestId: string) => void;
  onEmpty: (guestId: string) => void;
  onClose: () => void;
}) {
  const carNo = () => (props.open ? props.ride.cars.findIndex((c) => c.id === props.open!.car.id) + 1 : 0);
  const occupant = () => props.open?.car.seats[props.open.seat] ?? null;
  const title = () => (props.open ? `Car ${carNo()}, seat ${props.open.seat + 1}` : "");
  // Me first, then everyone with no seat yet, then the rest.
  const ordered = () => {
    const free = (id: string) => whereIs(props.ride, id) === null;
    return [...props.roster].sort((a, b) =>
      a.id === props.me ? -1 : b.id === props.me ? 1 : Number(free(b.id)) - Number(free(a.id)),
    );
  };

  return (
    <Sheet open={props.open !== null} title={title()} onClose={props.onClose}>
      <Show when={occupant()}>
        {(id) => (
          <button type="button" class={`${rowClass} mb-1 bg-charcoal/5`} disabled={props.busy} onClick={() => props.onEmpty(id())}>
            <span class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-charcoal/40 text-charcoal/75" aria-hidden="true">
              –
            </span>
            Take {id() === props.me ? "yourself" : props.crew(id()).name} out of this seat
          </button>
        )}
      </Show>
      <ul>
        <For each={ordered()}>
          {(person) => {
            const where = () => whereIs(props.ride, person.id);
            const here = () => occupant() === person.id;
            const locked = () => {
              const car = props.ride.cars.find((c) => c.seats.includes(person.id));
              return car?.booking !== null && car?.booking !== undefined;
            };
            return (
              <li>
                <button
                  type="button"
                  class={rowClass}
                  disabled={props.busy || here() || locked()}
                  aria-current={here() ? "true" : undefined}
                  onClick={() => props.onPick(person.id)}
                >
                  <Face initials={person.initials} image={person.image} size="md" />
                  <span class="flex-1">
                    {person.id === props.me ? `${person.name} (you)` : person.name}
                    <Show when={where()}>
                      <span class="block text-xs font-normal text-charcoal/75">
                        {here() ? "In this seat" : locked() ? `${where()}, can't move` : `In ${where()}, will move here`}
                      </span>
                    </Show>
                  </span>
                  <Show when={occupant() && !here() && !locked()}>
                    <span class="text-xs font-normal text-charcoal/75">
                      {where() ? "swap" : "takes the seat"}
                    </span>
                  </Show>
                </button>
              </li>
            );
          }}
        </For>
      </ul>
    </Sheet>
  );
}

/** Standard or XL for a car; says who'd lose their seat going down. */
export function KindPicker(props: {
  open: CarView | null;
  carNo: number;
  crew: CrewLookup;
  busy: boolean;
  onPick: (kind: CarKind) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const kicked = (kind: CarKind) =>
    props.open ? props.open.seats.slice(CAR_KINDS[kind].seats).filter((s): s is string => s !== null) : [];
  return (
    <Sheet open={props.open !== null} title={`Car ${props.carNo}`} onClose={props.onClose}>
      <ul class="space-y-1">
        <For each={Object.entries(CAR_KINDS) as [CarKind, (typeof CAR_KINDS)[CarKind]][]}>
          {([kind, info]) => {
            const current = () => props.open?.kind === kind;
            const out = () => kicked(kind);
            return (
              <li>
                <button
                  type="button"
                  class={rowClass}
                  disabled={props.busy || current()}
                  aria-current={current() ? "true" : undefined}
                  onClick={() => props.onPick(kind)}
                >
                  <span class="flex h-9 min-w-9 items-center justify-center rounded-full bg-charcoal px-2 text-[11px] font-black uppercase text-cream" aria-hidden="true">
                    {info.label === "Standard" ? "Std" : info.label}
                  </span>
                  <span class="flex-1">
                    {info.label} · {info.seats} seats
                    <span class="block text-xs font-normal text-charcoal/75">
                      {current()
                        ? "This car now"
                        : kind === "xl"
                          ? "UberXL or Lyft XL, about 60% more than a Standard"
                          : out().length
                            ? `UberX or Lyft. ${listNames(out().map((id) => props.crew(id).name))} would lose ${out().length === 1 ? "their seat" : "their seats"}.`
                            : "UberX or Lyft"}
                    </span>
                  </span>
                </button>
              </li>
            );
          }}
        </For>
      </ul>
      <div class="mt-3 border-t border-charcoal/10 pt-3">
        <button type="button" class={rowClass} disabled={props.busy} onClick={props.onRemove}>
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-orange/15 text-charcoal" aria-hidden="true">
            ✕
          </span>
          <span>
            Remove this car
            <Show when={props.open && ridersIn(props.open).length > 0}>
              <span class="block text-xs font-normal text-charcoal/75">Everyone in it goes back to the bench.</span>
            </Show>
          </span>
        </button>
      </div>
    </Sheet>
  );
}
