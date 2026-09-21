import { Show } from "solid-js";
import type { GuestFlightWithStatus } from "~/lib/types";
import { formatTime } from "~/lib/flights";
import { FlightStatusBadge } from "./FlightStatusBadge";

interface Props {
  flight: GuestFlightWithStatus | null;
}

const RING: Record<string, string> = {
  in_air:   "border-teal",
  boarding: "border-orange",
  upcoming: "border-charcoal/20",
  delayed:  "border-orange",
  landed:   "border-charcoal/10",
};

function PlaneIcon(props: { class?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class={props.class ?? "w-5 h-5"}>
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function FlightRoute(props: { flight: GuestFlightWithStatus }) {
  const f = props.flight;
  const isActive = () => f.status === "in_air" || f.status === "boarding";
  const pct = () => Math.max(4, f.progressFraction * 100);

  return (
    <div class="px-4 pb-5 pt-4">
      {/* Airport codes */}
      <div class="flex justify-between items-baseline">
        <p class="text-3xl font-black text-charcoal leading-none">{f.origin}</p>
        <p class="text-3xl font-black text-charcoal leading-none">{f.destination}</p>
      </div>

      {/* Track with plane */}
      <div class="relative mt-4 h-5">
        {/* Background line */}
        <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-charcoal/12" />
        {/* Progress fill */}
        <div
          class={`absolute top-1/2 left-0 -translate-y-1/2 h-px transition-all
                  ${isActive() ? "bg-teal" : f.status === "landed" ? "bg-charcoal/25" : "bg-charcoal/10"}`}
          style={{ width: `${f.progressFraction * 100}%` }}
        />
        {/* Plane marker */}
        <div
          class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all"
          style={{ left: `${pct()}%` }}
        >
          <PlaneIcon class={`w-5 h-5 rotate-90 ${isActive() ? "text-teal" : "text-charcoal/25"}`} />
        </div>
      </div>

      {/* Times */}
      <div class="flex justify-between mt-2">
        <p class="text-xs font-medium text-charcoal/50">{formatTime(f.departsAt)}</p>
        <p class="text-xs font-medium text-charcoal/50">{formatTime(f.arrivesAt)}</p>
      </div>

      {/* Status lines */}
      <Show when={f.status === "in_air" && f.minutesUntilArrival > 0}>
        <p class="mt-3 text-xs font-semibold text-teal">
          Lands in {f.minutesUntilArrival} min
        </p>
      </Show>
      <Show when={f.status === "boarding"}>
        <p class="mt-3 text-xs font-semibold text-orange">
          Departing {formatTime(f.departsAt)}
        </p>
      </Show>
      <Show when={f.status === "landed"}>
        <p class="mt-3 text-xs font-semibold text-charcoal/40">Landed · Welcome!</p>
      </Show>
    </div>
  );
}

function NoFlight() {
  return (
    <div class="flex flex-col items-center justify-center gap-5 py-10 px-6 text-center min-h-[172px]">
      <div class="space-y-1">
        <p class="text-sm font-bold text-charcoal/50">No flight details provided</p>
        <a
          href="/me#flight-section"
          class="text-xs text-charcoal/35 hover:text-teal transition-colors underline underline-offset-2"
        >
          Have a flight number?
        </a>
      </div>

      <a
        href="/flights/book"
        class="rounded-xl bg-orange px-6 py-2.5 text-sm font-bold text-cream
               hover:bg-orange/90 active:scale-[0.97] transition-all"
      >
        Book Now
      </a>
    </div>
  );
}

export function MyFlightCard(props: Props) {
  const f = () => props.flight;
  const ring = () => (f() ? (RING[f()!.status] ?? "border-charcoal/20") : "border-dashed border-charcoal/20");

  return (
    <div class={`paper-card rounded-xl border-2 ${ring()} overflow-hidden`}>
      <Show when={f()} fallback={<NoFlight />} keyed>
        {(flight) => (
          <>
            {/* Header */}
            <div class="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-charcoal/8">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-charcoal/40">
                  {flight.airline}
                </p>
                <p class="text-xl font-black text-charcoal leading-tight">
                  {flight.flightNumber}
                </p>
              </div>
              <FlightStatusBadge status={flight.status} />
            </div>

            <FlightRoute flight={flight} />
          </>
        )}
      </Show>
    </div>
  );
}
