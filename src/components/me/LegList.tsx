import { createSignal, For, Index, Show } from "solid-js";
import { MAX_LEGS } from "~/lib/flight-leg";
import { sortLegs } from "~/lib/flights";
import type { FlightLeg } from "~/lib/types";
import { wallDate } from "~/lib/zoned-time";
import { sameLeg, tripProblems, type LegDirection } from "./flight-entry";
import { LegPanel } from "./LegPanel";
import { quietBtn } from "./ui";

/**
 * Every leg of one direction of the guest's trip ("Flying in" / "Flying
 * home"). Each leg is edited on its own; "Add a connecting flight" adds
 * another. Legs are kept in departure order, so they can be added in any order.
 */
export function LegList(props: {
  direction: LegDirection;
  label: string;
  defaultDate: string;
  legs: FlightLeg[];
  /** With no legs saved: the tracker's entry, as LegPanel shows it. */
  tracker?: Parameters<typeof LegPanel>[0]["tracker"];
  /** With no legs saved: start collapsed behind this button (optional directions). */
  addLabel?: string;
  onChange: (legs: FlightLeg[]) => void;
}) {
  const [removed, setRemoved] = createSignal<FlightLeg | null>(null);
  let undoEl: HTMLButtonElement | undefined;

  const save = (legs: FlightLeg[]) => {
    setRemoved(null);
    props.onChange(sortLegs(legs));
  };
  const replace = (old: FlightLeg, leg: FlightLeg) => save(props.legs.map((l) => (sameLeg(l, old) ? leg : l)));
  const remove = (old: FlightLeg) => {
    props.onChange(props.legs.filter((l) => !sameLeg(l, old)));
    setRemoved(old);
    queueMicrotask(() => undoEl?.focus());
  };

  const legLabel = (i: number) =>
    props.legs.length > 1 ? `${props.label} · flight ${i + 1} of ${props.legs.length}` : props.label;
  // A new connection most likely leaves the day the last one lands.
  const nextDate = () => {
    const last = props.legs.at(-1);
    return last ? wallDate(last.arrivesAt) : props.defaultDate;
  };
  const problems = () => tripProblems(props.direction, props.legs);
  const removedNoteId = `${props.direction}-legs-removed-note`;

  return (
    <div class="space-y-3">
      <Show
        when={props.legs.length > 0}
        fallback={
          <LegPanel
            direction={props.direction}
            label={props.label}
            defaultDate={props.defaultDate}
            leg={null}
            tracker={props.tracker}
            addLabel={props.addLabel}
            onSave={(leg) => save([leg])}
            onRemove={() => {}}
          />
        }
      >
        {/* Index, not For: a saved leg is a new object, and keying by position
            keeps focus and editing state in place while the list updates. */}
        <Index each={props.legs}>
          {(leg, i) => (
            <LegPanel
              direction={props.direction}
              idPrefix={`${props.direction}-${i}`}
              label={legLabel(i)}
              defaultDate={props.defaultDate}
              leg={leg()}
              onSave={(next) => replace(leg(), next)}
              onRemove={() => remove(leg())}
            />
          )}
        </Index>

        <Show when={problems().length > 0}>
          <ul class="space-y-1 rounded-xl bg-orange/10 px-3 py-2">
            <For each={problems()}>{(p) => <li class="text-xs font-semibold text-charcoal/80">{p}</li>}</For>
          </ul>
        </Show>

        <Show when={props.legs.length < MAX_LEGS}>
          <LegPanel
            direction={props.direction}
            idPrefix={`${props.direction}-new`}
            label={`Add another flight to ${props.label.toLowerCase()}`}
            hideLabel
            defaultDate={nextDate()}
            leg={null}
            addLabel="Add a connecting flight"
            onSave={(leg) => save([...props.legs, leg])}
            onRemove={() => {}}
          />
        </Show>
      </Show>

      <Show when={removed()}>
        {(leg) => (
          <div class="flex items-center justify-between gap-2 rounded-xl bg-charcoal/[0.05] pl-3">
            <p id={removedNoteId} class="min-w-0 truncate text-xs font-semibold text-charcoal/80">
              Removed {leg().flightNumber}.
            </p>
            <button
              ref={undoEl}
              type="button"
              aria-describedby={removedNoteId}
              class={quietBtn}
              onClick={() => save([...props.legs, leg()])}
            >
              Undo
            </button>
          </div>
        )}
      </Show>
    </div>
  );
}
