import { createMemo, createSignal, Match, onMount, Show, Switch } from "solid-js";
import { lookupFlight } from "~/lib/api/aviationstack";
import { DESTINATION_AIRPORT } from "~/lib/config";
import type { FlightLeg } from "~/lib/types";
import {
  legDateLabel,
  normalizeFlightNumber,
  offRouteAirport,
  shortDateLabel,
  toFlightLeg,
  type LegDirection,
} from "./flight-entry";
import {
  accentBtn,
  dateFieldCls,
  fieldCls,
  FieldError,
  labelCls,
  LegSummary,
  primaryBtn,
  quietBtn,
  secondaryBtn,
} from "./ui";

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "found"; leg: FlightLeg }
  | { kind: "not_found"; flightNumber: string; date: string }
  | { kind: "error" };

/** FL-1: find a flight by number + date. The number and date live in the parent. */
export function FlightLookupForm(props: {
  idPrefix: string;
  direction: LegDirection;
  flightNumber: string;
  date: string;
  onFlightNumberChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onUse: (leg: FlightLeg) => void;
  onManual: () => void;
  autoFocus?: boolean;
}) {
  const id = (name: string) => `${props.idPrefix}-lookup-${name}`;
  const [state, setState] = createSignal<LookupState>({ kind: "idle" });
  const [numberError, setNumberError] = createSignal<string | null>(null);
  let numberInput: HTMLInputElement | undefined;
  let resultEl: HTMLDivElement | undefined;
  let requestId = 0;

  onMount(() => {
    if (props.autoFocus) numberInput?.focus();
  });

  /** Back to the form, dropping any lookup still in flight. */
  function reset() {
    requestId++;
    setState({ kind: "idle" });
    setNumberError(null);
  }

  /** The result can render under the fold on a phone: bring it up once it's there. */
  function revealResult() {
    requestAnimationFrame(() => {
      if (!resultEl?.isConnected || resultEl.getBoundingClientRect().top < window.innerHeight * 0.6) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const flightNumber = normalizeFlightNumber(props.flightNumber);
    if (!flightNumber) {
      setNumberError("Use a flight number like AA 321.");
      numberInput?.focus();
      return;
    }
    if (!props.date) return;
    // Close the phone keyboard; it would cover the result. Only on touch
    // screens: on a desktop, blurring would drop keyboard focus to <body>.
    if (numberInput && document.activeElement === numberInput && window.matchMedia("(pointer: coarse)").matches) {
      numberInput.blur();
    }
    const request = ++requestId;
    const date = props.date;
    setNumberError(null);
    setState({ kind: "loading" });
    try {
      const result = await lookupFlight(flightNumber, date);
      if (request !== requestId) return;
      if (result.status === "found") setState({ kind: "found", leg: toFlightLeg(result.leg) });
      else if (result.status === "not_found") setState({ kind: "not_found", flightNumber, date });
      // The lookup service couldn't answer: don't claim the flight doesn't exist.
      else setState({ kind: "error" });
    } catch {
      if (request !== requestId) return;
      setState({ kind: "error" });
    }
    revealResult();
  }

  const found = createMemo(() => {
    const s = state();
    return s.kind === "found" ? s.leg : null;
  });
  const notFound = createMemo(() => {
    const s = state();
    return s.kind === "not_found" ? s : null;
  });
  const loading = () => state().kind === "loading";
  const hasResult = () => state().kind !== "idle" && !loading();

  const announcement = () => {
    const s = state();
    if (s.kind === "found") return `Found ${s.leg.flightNumber}, ${s.leg.origin} to ${s.leg.destination}.`;
    if (s.kind === "not_found") return `No flight found for ${s.flightNumber}.`;
    if (s.kind === "error") return "Flight lookup isn't available right now.";
    return "";
  };

  return (
    <div class="space-y-3">
      {/* Screen reader updates; absolutely positioned, so it never adds a gap. */}
      <p class="sr-only" aria-live="polite">
        {announcement()}
      </p>
      <form onSubmit={submit} novalidate class="space-y-3">
        <div class="grid grid-cols-2 gap-2">
          <div class="min-w-0 space-y-1.5">
            <label for={id("number")} class={labelCls}>
              Flight number
            </label>
            <input
              ref={numberInput}
              id={id("number")}
              type="text"
              value={props.flightNumber}
              onInput={(e) => {
                props.onFlightNumberChange(e.currentTarget.value);
                reset();
              }}
              placeholder="AA 321"
              maxLength={10}
              autocomplete="off"
              autocapitalize="characters"
              spellcheck={false}
              enterkeyhint="search"
              aria-invalid={numberError() ? "true" : undefined}
              aria-describedby={numberError() ? id("number-error") : undefined}
              class={`${fieldCls} uppercase`}
            />
          </div>
          <div class="min-w-0 space-y-1.5">
            <label for={id("date")} class={labelCls}>
              Date
            </label>
            <input
              id={id("date")}
              type="date"
              required
              value={props.date}
              onInput={(e) => {
                props.onDateChange(e.currentTarget.value);
                reset();
              }}
              class={dateFieldCls}
            />
          </div>
        </div>
        <FieldError id={id("number-error")} message={numberError()} />
        <button
          type="submit"
          disabled={loading() || !props.flightNumber.trim() || !props.date}
          class={`${primaryBtn} w-full`}
        >
          {loading() ? "Looking up…" : "Look up"}
        </button>
      </form>

      {/* scroll-mt clears the fixed header when the result is scrolled into view. */}
      <Show when={hasResult()}>
        <div ref={resultEl} class="scroll-mt-20">
          <Switch>
            <Match when={found()}>
              {(leg) => (
                <FoundFlight
                  leg={leg()}
                  direction={props.direction}
                  onUse={() => props.onUse(leg())}
                  onRetry={() => {
                    reset();
                    numberInput?.focus();
                  }}
                />
              )}
            </Match>
            <Match when={notFound()}>
              {(miss) => (
                <div class="space-y-3 rounded-xl bg-charcoal/[0.04] p-3">
                  <p class="text-sm text-charcoal/80">
                    No flight found for <span class="font-bold">{miss().flightNumber}</span> on{" "}
                    {shortDateLabel(miss().date)}. Flights a few months out often aren't listed yet.
                  </p>
                  <button type="button" class={`${secondaryBtn} w-full`} onClick={props.onManual}>
                    Enter it manually
                  </button>
                </div>
              )}
            </Match>
            <Match when={state().kind === "error"}>
              <div class="space-y-3 rounded-xl bg-charcoal/[0.04] p-3">
                <p class="text-sm text-charcoal/80">
                  Flight lookup isn't available right now. Enter the details yourself.
                </p>
                <button type="button" class={`${secondaryBtn} w-full`} onClick={props.onManual}>
                  Enter it manually
                </button>
              </div>
            </Match>
          </Switch>
        </div>
      </Show>

      <Show when={state().kind === "idle" || loading()}>
        <button type="button" class={`${quietBtn} w-full`} onClick={props.onManual}>
          Enter details manually instead
        </button>
      </Show>
    </div>
  );
}

function FoundFlight(props: {
  leg: FlightLeg;
  direction: LegDirection;
  onUse: () => void;
  onRetry: () => void;
}) {
  const offRoute = () => offRouteAirport(props.direction, props.leg);

  return (
    <div class="space-y-3 rounded-xl border-2 border-teal/40 bg-teal/5 p-3">
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-semibold text-charcoal/80">{legDateLabel(props.leg)}</p>
        <span class="rounded-lg bg-teal/20 px-2 py-1 text-xs font-bold text-charcoal">Found</span>
      </div>
      <LegSummary leg={props.leg} />
      <Show when={offRoute()}>
        {(code) => (
          <p class="text-xs text-charcoal/80">
            Heads up: this flight {props.direction === "in" ? "lands at" : "leaves from"} {code()}, not{" "}
            {DESTINATION_AIRPORT}.
          </p>
        )}
      </Show>
      <div class="flex gap-2">
        <button type="button" class={`${accentBtn} flex-1`} onClick={props.onUse}>
          Use this flight
        </button>
        <button type="button" class={secondaryBtn} onClick={props.onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}
