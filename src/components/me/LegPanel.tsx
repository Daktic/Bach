import { createSignal, Match, Show, Switch } from "solid-js";
import type { FlightLeg } from "~/lib/types";
import { wallDate } from "~/lib/zoned-time";
import { FlightLookupForm } from "./FlightLookupForm";
import { ManualFlightForm } from "./ManualFlightForm";
import {
  airlineFromFlightNumber,
  emptyManualInput,
  legDateLabel,
  manualInputFromLeg,
  type LegDirection,
  type ManualLegInput,
} from "./flight-entry";
import { CarIcon, LegSummary, PlusIcon, quietBtn, secondaryBtn } from "./ui";

/**
 * One leg of the guest's trip ("Flying in" / "Flying home"): what's saved,
 * else what the shared tracker has, else the lookup / manual entry forms.
 */
export function LegPanel(props: {
  direction: LegDirection;
  label: string;
  /** Keeps form ids unique when a direction has several legs. Defaults to the direction. */
  idPrefix?: string;
  /** Keep the heading for screen readers (and focus) but don't show it. */
  hideLabel?: boolean;
  defaultDate: string;
  /** Saved on this device. */
  leg: FlightLeg | null;
  /** The shared tracker's entry for this guest, shown when nothing's saved here. */
  tracker?: { kind: "flight"; leg: FlightLeg } | { kind: "driving" } | null;
  /** Optional legs start collapsed behind an "add" button. */
  addLabel?: string;
  onSave: (leg: FlightLeg) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = createSignal(false);
  const [mode, setMode] = createSignal<"lookup" | "manual">("lookup");
  // Only move focus into the form when the guest opened it.
  const [autoFocus, setAutoFocus] = createSignal(false);
  const [flightNumber, setFlightNumber] = createSignal("");
  const [date, setDate] = createSignal(props.defaultDate);
  const [manualInitial, setManualInitial] = createSignal<ManualLegInput>(
    emptyManualInput(props.direction, props.defaultDate),
  );
  const [removed, setRemoved] = createSignal<FlightLeg | null>(null);
  const idPrefix = () => props.idPrefix ?? props.direction;

  const trackerLeg = () => {
    const t = props.tracker;
    return t?.kind === "flight" ? t.leg : null;
  };
  /** The leg the forms start from when changing an existing flight. */
  const base = () => props.leg ?? trackerLeg();
  const canCancel = () => Boolean(props.leg || props.tracker || props.addLabel);

  function openEditor() {
    const leg = base();
    setFlightNumber(leg?.flightNumber ?? "");
    setDate(leg ? wallDate(leg.departsAt) : props.defaultDate);
    setMode("lookup");
    setAutoFocus(true);
    setEditing(true);
  }

  function closeEditor() {
    setEditing(false);
    setMode("lookup");
    setAutoFocus(false);
  }

  function switchToManual() {
    const leg = base();
    const day = date() || props.defaultDate;
    const unchanged = leg && flightNumber() === leg.flightNumber && day === wallDate(leg.departsAt);
    setManualInitial(
      unchanged
        ? manualInputFromLeg(leg)
        : {
            ...emptyManualInput(props.direction, day),
            flightNumber: flightNumber().trim(),
            airline: airlineFromFlightNumber(flightNumber()) ?? "",
          },
    );
    setAutoFocus(true);
    setMode("manual");
  }

  // The control the guest used disappears with the form, so focus moves to
  // the heading (or the Undo button) instead of falling back to <body>.
  let headingEl: HTMLHeadingElement | undefined;
  let undoEl: HTMLButtonElement | undefined;

  function cancel() {
    closeEditor();
    headingEl?.focus();
  }

  function save(leg: FlightLeg) {
    props.onSave(leg);
    setRemoved(null);
    cancel();
  }

  function remove() {
    if (!props.leg) return;
    setRemoved(props.leg);
    props.onRemove();
    closeEditor();
    undoEl?.focus();
  }

  const editor = () => (
    <div class="space-y-3">
      <Show
        when={mode() === "manual"}
        fallback={
          <FlightLookupForm
            idPrefix={idPrefix()}
            direction={props.direction}
            flightNumber={flightNumber()}
            date={date()}
            onFlightNumberChange={setFlightNumber}
            onDateChange={setDate}
            onUse={save}
            onManual={switchToManual}
            autoFocus={autoFocus()}
          />
        }
      >
        <ManualFlightForm
          idPrefix={idPrefix()}
          initial={manualInitial()}
          onSave={save}
          onBack={() => {
            setAutoFocus(true);
            setMode("lookup");
          }}
          autoFocus={autoFocus()}
        />
      </Show>
      <Show when={canCancel()}>
        <button type="button" class={`${quietBtn} w-full`} onClick={cancel}>
          Cancel
        </button>
      </Show>
    </div>
  );

  return (
    <div class="space-y-3">
      <h3
        ref={headingEl}
        tabIndex={-1}
        class={props.hideLabel ? "sr-only" : "text-[11px] font-bold uppercase tracking-wider text-charcoal/75 outline-none"}
      >
        {props.label}
      </h3>

      <Show when={!props.leg && removed()}>
        {(leg) => (
          <div class="flex items-center justify-between gap-2 rounded-xl bg-charcoal/[0.05] pl-3">
            <p id={`${idPrefix()}-removed-note`} class="min-w-0 truncate text-xs font-semibold text-charcoal/80">
              Removed {leg().flightNumber}.
            </p>
            <button
              ref={undoEl}
              type="button"
              aria-describedby={`${idPrefix()}-removed-note`}
              class={quietBtn}
              onClick={() => save(leg())}
            >
              Undo
            </button>
          </div>
        )}
      </Show>

      <Switch fallback={editor()}>
        <Match when={!editing() && props.leg}>
          {(leg) => (
            <div class="space-y-3 rounded-xl border border-charcoal/10 bg-white/40 p-3">
              <p class="text-xs font-semibold text-charcoal/75">{legDateLabel(leg())}</p>
              <LegSummary leg={leg()} />
              <div class="flex gap-2">
                <button type="button" class={`${secondaryBtn} flex-1`} onClick={openEditor}>
                  Change
                </button>
                <button
                  type="button"
                  class={`${secondaryBtn} flex-1`}
                  onClick={remove}
                  aria-label={`Remove flight ${leg().flightNumber}`}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </Match>
        <Match when={!editing() && trackerLeg()}>
          {(leg) => (
            <div class="space-y-3 rounded-xl border border-dashed border-charcoal/25 p-3">
              <div class="flex items-center justify-between gap-2">
                <TrackerBadge />
                <p class="text-xs font-semibold text-charcoal/75">{legDateLabel(leg())}</p>
              </div>
              <LegSummary leg={leg()} />
              <p class="text-xs text-charcoal/75">This is the flight the crew sees on Flights.</p>
              <button type="button" class={`${secondaryBtn} w-full`} onClick={openEditor}>
                Change
              </button>
            </div>
          )}
        </Match>
        <Match when={!editing() && props.tracker?.kind === "driving"}>
          <div class="space-y-3 rounded-xl border border-dashed border-charcoal/25 p-3">
            <TrackerBadge />
            <p class="flex items-center gap-2 text-sm font-bold text-charcoal">
              <CarIcon class="h-5 w-5 text-charcoal/50" />
              Driving in
            </p>
            <button type="button" class={`${secondaryBtn} w-full`} onClick={openEditor}>
              Add a flight instead
            </button>
          </div>
        </Match>
        <Match when={!editing() && props.addLabel}>
          {(label) => (
            <button
              type="button"
              onClick={openEditor}
              class="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed
                     border-charcoal/20 px-4 text-sm font-semibold text-charcoal/80 transition-colors
                     hover:border-teal/60 hover:text-charcoal focus-visible:outline-2
                     focus-visible:outline-offset-2 focus-visible:outline-charcoal"
            >
              <PlusIcon />
              {label()}
            </button>
          )}
        </Match>
      </Switch>
    </div>
  );
}

function TrackerBadge() {
  return (
    <span class="inline-block rounded-md bg-charcoal/[0.07] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-charcoal/80">
      On the tracker
    </span>
  );
}
