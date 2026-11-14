import { createSignal, For, type JSX, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { findAirport } from "~/lib/airports";
import type { FlightLeg } from "~/lib/types";
import {
  airlineFromFlightNumber,
  isAirportCode,
  needsZonePick,
  normalizeAirportCode,
  timeZoneOptions,
  validateManualLeg,
  type ManualLegErrors,
  type ManualLegField,
  type ManualLegInput,
  type TimeZoneChoice,
} from "./flight-entry";
import {
  accentBtn,
  ChevronDownIcon,
  dateFieldCls,
  fieldCls,
  FieldError,
  labelCls,
  secondaryBtn,
} from "./ui";

// Focus order when the form has errors.
const FIELD_ORDER: ManualLegField[] = [
  "airline",
  "flightNumber",
  "origin",
  "originZone",
  "destination",
  "destinationZone",
  "departDate",
  "departTime",
  "arriveDate",
  "arriveTime",
];

/**
 * FL-1 fallback for flights the lookup doesn't know yet (common months out).
 * Times are entered as each airport's local time and saved with its offset.
 */
export function ManualFlightForm(props: {
  idPrefix: string;
  initial: ManualLegInput;
  onSave: (leg: FlightLeg) => void;
  onBack: () => void;
  autoFocus?: boolean;
}) {
  const id = (field: string) => `${props.idPrefix}-manual-${field}`;
  const [form, setForm] = createStore<ManualLegInput>({ ...props.initial });
  const [errors, setErrors] = createSignal<ManualLegErrors>({});
  const [submitted, setSubmitted] = createSignal(false);
  // The airline follows the flight number ("AA …" → American) until it's typed in.
  let airlineTouched =
    props.initial.airline.trim() !== "" &&
    props.initial.airline !== airlineFromFlightNumber(props.initial.flightNumber);
  // The arrival date follows the departure date until it's changed.
  let arriveDateTouched = props.initial.arriveDate !== props.initial.departDate;

  onMount(() => {
    if (!props.autoFocus) return;
    // Start at the first blank field (zone pickers only exist when shown).
    const blank = FIELD_ORDER.find((field) => !form[field] && document.getElementById(id(field)));
    document.getElementById(id(blank ?? "airline"))?.focus();
  });

  function update(field: ManualLegField, value: string) {
    setForm(field, value);
    if (field === "airline") airlineTouched = value.trim() !== "";
    if (field === "flightNumber" && !airlineTouched) setForm("airline", airlineFromFlightNumber(value) ?? "");
    if (field === "arriveDate") arriveDateTouched = true;
    if (field === "departDate" && !arriveDateTouched) setForm("arriveDate", value);
    // After the first save attempt, errors update as they're fixed.
    if (submitted()) {
      const result = validateManualLeg({ ...form });
      setErrors(result.ok ? {} : result.errors);
    }
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    setSubmitted(true);
    const result = validateManualLeg({ ...form });
    if (result.ok) {
      props.onSave(result.leg);
      return;
    }
    setErrors(result.errors);
    const first = FIELD_ORDER.find((field) => result.errors[field]);
    if (first) document.getElementById(id(first))?.focus();
  }

  const invalid = (field: ManualLegField) => (errors()[field] ? ("true" as const) : undefined);
  const describedBy = (field: ManualLegField) => (errors()[field] ? id(`${field}-error`) : undefined);
  const codeOr = (raw: string, fallback: string) => {
    const code = normalizeAirportCode(raw);
    return isAirportCode(code) ? code : fallback;
  };

  return (
    <form onSubmit={submit} novalidate class="space-y-4">
      <div class="grid grid-cols-2 gap-x-2 gap-y-3">
        <Field label="Airline" id={id("airline")} error={errors().airline}>
          <input
            id={id("airline")}
            type="text"
            value={form.airline}
            onInput={(e) => update("airline", e.currentTarget.value)}
            placeholder="American"
            maxLength={40}
            autocomplete="off"
            aria-invalid={invalid("airline")}
            aria-describedby={describedBy("airline")}
            class={fieldCls}
          />
        </Field>
        <Field label="Flight number" id={id("flightNumber")} error={errors().flightNumber}>
          <input
            id={id("flightNumber")}
            type="text"
            value={form.flightNumber}
            onInput={(e) => update("flightNumber", e.currentTarget.value)}
            placeholder="AA 1105"
            maxLength={10}
            autocomplete="off"
            autocapitalize="characters"
            spellcheck={false}
            aria-invalid={invalid("flightNumber")}
            aria-describedby={describedBy("flightNumber")}
            class={`${fieldCls} uppercase`}
          />
        </Field>

        <AirportField
          label="From"
          id={id("origin")}
          zoneId={id("originZone")}
          placeholder="LAX"
          value={form.origin}
          zone={form.originZone}
          zoneOptions={timeZoneOptions(props.initial.originZone)}
          error={errors().origin}
          zoneError={errors().originZone}
          onInput={(value) => update("origin", value)}
          onZoneChange={(zone) => update("originZone", zone)}
        />
        <AirportField
          label="To"
          id={id("destination")}
          zoneId={id("destinationZone")}
          placeholder="PHX"
          value={form.destination}
          zone={form.destinationZone}
          zoneOptions={timeZoneOptions(props.initial.destinationZone)}
          error={errors().destination}
          zoneError={errors().destinationZone}
          onInput={(value) => update("destination", value)}
          onZoneChange={(zone) => update("destinationZone", zone)}
        />
      </div>

      <fieldset class="min-w-0 space-y-1.5">
        <legend class={labelCls}>
          Departs <span class="font-normal text-charcoal/75">· local time at {codeOr(form.origin, "origin")}</span>
        </legend>
        <div class="grid grid-cols-2 gap-2">
          <div class="min-w-0">
            <label for={id("departDate")} class="sr-only">
              Departure date
            </label>
            <input
              id={id("departDate")}
              type="date"
              value={form.departDate}
              onInput={(e) => update("departDate", e.currentTarget.value)}
              aria-invalid={invalid("departDate")}
              aria-describedby={describedBy("departDate")}
              class={dateFieldCls}
            />
          </div>
          <div class="min-w-0">
            <label for={id("departTime")} class="sr-only">
              Departure time
            </label>
            <input
              id={id("departTime")}
              type="time"
              value={form.departTime}
              onInput={(e) => update("departTime", e.currentTarget.value)}
              aria-invalid={invalid("departTime")}
              aria-describedby={describedBy("departTime")}
              class={dateFieldCls}
            />
          </div>
        </div>
        <FieldError id={id("departDate-error")} message={errors().departDate} />
        <FieldError id={id("departTime-error")} message={errors().departTime} />
      </fieldset>

      <fieldset class="min-w-0 space-y-1.5">
        <legend class={labelCls}>
          Arrives{" "}
          <span class="font-normal text-charcoal/75">
            · local time at {codeOr(form.destination, "destination")}
          </span>
        </legend>
        <div class="grid grid-cols-2 gap-2">
          <div class="min-w-0">
            <label for={id("arriveDate")} class="sr-only">
              Arrival date
            </label>
            <input
              id={id("arriveDate")}
              type="date"
              value={form.arriveDate}
              onInput={(e) => update("arriveDate", e.currentTarget.value)}
              aria-invalid={invalid("arriveDate")}
              aria-describedby={describedBy("arriveDate")}
              class={dateFieldCls}
            />
          </div>
          <div class="min-w-0">
            <label for={id("arriveTime")} class="sr-only">
              Arrival time
            </label>
            <input
              id={id("arriveTime")}
              type="time"
              value={form.arriveTime}
              onInput={(e) => update("arriveTime", e.currentTarget.value)}
              aria-invalid={invalid("arriveTime")}
              aria-describedby={describedBy("arriveTime")}
              class={dateFieldCls}
            />
          </div>
        </div>
        <FieldError id={id("arriveDate-error")} message={errors().arriveDate} />
        <FieldError id={id("arriveTime-error")} message={errors().arriveTime} />
      </fieldset>

      <div class="flex gap-2">
        <button type="submit" class={`${accentBtn} flex-1`}>
          Save flight
        </button>
        <button type="button" class={secondaryBtn} onClick={props.onBack}>
          Look up instead
        </button>
      </div>
    </form>
  );
}

/** Label, control and error for one grid cell. The error's id is `${id}-error`. */
function Field(props: { label: string; id: string; error?: string; children: JSX.Element }) {
  return (
    <div class="min-w-0 space-y-1.5">
      <label for={props.id} class={labelCls}>
        {props.label}
      </label>
      {props.children}
      <FieldError id={`${props.id}-error`} message={props.error} />
    </div>
  );
}

/** A 3-letter airport code, plus a time zone picker when we don't know the airport. */
function AirportField(props: {
  label: string;
  id: string;
  zoneId: string;
  placeholder: string;
  value: string;
  zone: string;
  zoneOptions: TimeZoneChoice[];
  error?: string;
  zoneError?: string;
  onInput: (value: string) => void;
  onZoneChange: (zone: string) => void;
}) {
  const code = () => normalizeAirportCode(props.value);
  const airport = () => findAirport(code());

  return (
    <div class="min-w-0 space-y-1.5">
      <label for={props.id} class={labelCls}>
        {props.label}
      </label>
      <input
        id={props.id}
        type="text"
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        placeholder={props.placeholder}
        maxLength={3}
        autocomplete="off"
        autocapitalize="characters"
        spellcheck={false}
        aria-invalid={props.error ? "true" : undefined}
        aria-describedby={props.error ? `${props.id}-error` : undefined}
        class={`${fieldCls} uppercase`}
      />
      <FieldError id={`${props.id}-error`} message={props.error} />
      <Show when={airport()}>{(a) => <p class="truncate text-xs text-charcoal/75">{a().city}</p>}</Show>
      <Show when={needsZonePick(props.value)}>
        <label for={props.zoneId} class={`${labelCls} pt-1`}>
          Time zone at {code()}
        </label>
        <div class="relative">
          <select
            id={props.zoneId}
            value={props.zone}
            onChange={(e) => props.onZoneChange(e.currentTarget.value)}
            aria-invalid={props.zoneError ? "true" : undefined}
            aria-describedby={props.zoneError ? `${props.zoneId}-error` : undefined}
            class={`${fieldCls} appearance-none pr-8`}
          >
            <option value="">Pick one</option>
            <For each={props.zoneOptions}>{(zone) => <option value={zone.id}>{zone.label}</option>}</For>
          </select>
          {/* The only sign this is a dropdown, so it needs 3:1. */}
          <ChevronDownIcon class="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/75" />
        </div>
        <FieldError id={`${props.zoneId}-error`} message={props.zoneError} />
      </Show>
    </div>
  );
}
