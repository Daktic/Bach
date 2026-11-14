import { type JSX, Show } from "solid-js";
import { formatDayOffset } from "~/components/flights/flight-format";
import { PlaneIcon } from "~/components/flights/icons";
import { formatTime } from "~/lib/flights";
import type { FlightLeg } from "~/lib/types";
import { arrivalDayOffset } from "./flight-entry";

// Shared styles and small pieces for the /me page. The travel icons are the
// same ones /flights uses.
export { CarIcon, CheckIcon, PlaneIcon } from "~/components/flights/icons";

// ─── Styles ───────────────────────────────────────────────────────────────────

// 16px text so iOS Safari doesn't zoom in when a field gets focus.
// Teal is too light to mark focus on its own, so a charcoal outline sits
// around the teal halo (an outline, so an invalid field's orange border can't hide it).
export const fieldCls = `block w-full min-w-0 min-h-11 rounded-xl border border-charcoal/15 bg-white/60
  px-3 py-2 text-base font-medium text-charcoal placeholder:text-charcoal/30
  focus:outline-2 focus:outline-offset-2 focus:outline-charcoal
  focus:ring-2 focus:ring-teal/40 focus:border-teal/50 transition-all
  aria-[invalid=true]:border-orange`;

// Date/time inputs: drop iOS's native chrome and left-align the value like other fields.
export const dateFieldCls = `${fieldCls} appearance-none [&::-webkit-date-and-time-value]:text-left`;

export const labelCls = "block text-xs font-semibold text-charcoal/80";

const btnBase = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm
  transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40
  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal`;

export const primaryBtn = `${btnBase} bg-charcoal font-bold text-cream hover:bg-charcoal/85`;
export const accentBtn = `${btnBase} bg-teal font-bold text-charcoal hover:bg-teal/85`;
// /80 rather than /75: these also sit on the tinted panels, where /75 drops under 4.5:1.
export const secondaryBtn = `${btnBase} border border-charcoal/15 font-semibold text-charcoal/80
  hover:border-charcoal/30 hover:text-charcoal`;
export const quietBtn = `${btnBase} px-3 font-semibold text-charcoal/80 decoration-teal decoration-2
  underline-offset-2 hover:text-charcoal hover:underline`;

// ─── Icons ────────────────────────────────────────────────────────────────────

type IconProps = { class?: string };

export function CameraIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={props.class ?? "h-5 w-5"}>
      <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={props.class ?? "h-4 w-4"}>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={props.class ?? "h-4 w-4"}>
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
    </svg>
  );
}

function AlertIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class={props.class ?? "h-4 w-4"}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

// Orange is too light for small text on cream, so messages are charcoal with
// an orange marker.

/** Inline error under a field; `id` is what the field's aria-describedby points at. */
export function FieldError(props: { id: string; message?: string | null }) {
  return (
    <Show when={props.message}>
      <p id={props.id} class="flex items-start gap-1.5 text-xs font-semibold text-charcoal/80">
        <AlertIcon class="mt-px h-3.5 w-3.5 shrink-0 text-orange" />
        <span>{props.message}</span>
      </p>
    </Show>
  );
}

export function ErrorNote(props: { children: JSX.Element }) {
  return (
    <p role="alert" class="flex items-start gap-2 rounded-xl bg-orange/10 px-3 py-2.5 text-xs font-semibold text-charcoal/80">
      <AlertIcon class="mt-px h-4 w-4 shrink-0 text-orange" />
      <span>{props.children}</span>
    </p>
  );
}

export function SectionHeading(props: { id?: string; children: JSX.Element }) {
  return (
    <h2 id={props.id} class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">
      {props.children}
    </h2>
  );
}

// ─── Flight leg ───────────────────────────────────────────────────────────────

/**
 * LAX 1:30 PM ──✈── PHX 3:45 PM. Times are each airport's local wall clock,
 * never converted to the viewer's zone. Secondary text is /80, not /75: this
 * also renders on the teal-tinted "Found" panel.
 */
export function LegSummary(props: { leg: FlightLeg }) {
  const dayOffset = () => arrivalDayOffset(props.leg);
  const carrier = () => [props.leg.airline, props.leg.flightNumber].filter(Boolean).join(" · ");

  return (
    <div class="flex items-center gap-3">
      <div class="shrink-0 text-center">
        <p class="text-xl font-black leading-none text-charcoal">{props.leg.origin}</p>
        <p class="mt-1 text-xs font-medium text-charcoal/80">{formatTime(props.leg.departsAt)}</p>
      </div>
      <div class="flex min-w-0 flex-1 flex-col items-center gap-1">
        <div class="flex w-full items-center gap-1.5 text-charcoal/35">
          <span class="h-px flex-1 bg-charcoal/15" />
          <PlaneIcon class="h-4 w-4 rotate-90" />
          <span class="h-px flex-1 bg-charcoal/15" />
        </div>
        <p class="max-w-full truncate text-[11px] font-bold text-charcoal/80">{carrier()}</p>
      </div>
      <div class="shrink-0 text-center">
        <p class="text-xl font-black leading-none text-charcoal">{props.leg.destination}</p>
        <p class="mt-1 text-xs font-medium text-charcoal/80">
          {formatTime(props.leg.arrivesAt)}
          <Show when={dayOffset() !== 0}>
            <sup class="ml-0.5 font-bold" title="Lands on a different day">
              {formatDayOffset(dayOffset())}
            </sup>
          </Show>
        </p>
      </div>
    </div>
  );
}
