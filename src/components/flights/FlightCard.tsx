import { Show } from "solid-js";
import type { GuestFlightWithStatus } from "~/lib/types";
import { formatTime } from "~/lib/flights";
import { FlightStatusBadge } from "./FlightStatusBadge";

interface Props {
  flight: GuestFlightWithStatus;
}

function RouteBar(props: { flight: GuestFlightWithStatus }) {
  const f = props.flight;
  const isActive = () => f.status === "in_air" || f.status === "boarding";

  return (
    <div class="mt-3">
      <div class="flex items-center justify-between text-xs text-charcoal/50 mb-1">
        <span class="font-bold text-charcoal/70">{f.origin}</span>
        <span class="font-bold text-charcoal/70">{f.destination}</span>
      </div>
      <div class="relative h-1 w-full rounded-full bg-charcoal/10">
        {/* Filled progress track */}
        <div
          class={`absolute inset-y-0 left-0 rounded-full transition-all ${isActive() ? "bg-teal" : f.status === "landed" ? "bg-charcoal/25" : "bg-charcoal/10"}`}
          style={{ width: `${f.progressFraction * 100}%` }}
        />
        {/* Plane marker */}
        <div
          class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all"
          style={{ left: `${Math.max(4, f.progressFraction * 100)}%` }}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
            class={isActive() ? "text-teal" : "text-charcoal/30"}
          >
            <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
      </div>
      <div class="flex justify-between mt-1 text-xs text-charcoal/40">
        <span>{formatTime(f.departsAt)}</span>
        <span>{formatTime(f.arrivesAt)}</span>
      </div>
    </div>
  );
}

export function FlightCard(props: Props) {
  const f = () => props.flight;
  const muted = () => f().status === "landed";

  return (
    <div class={`paper-card rounded-xl p-4 transition-opacity ${muted() ? "opacity-60" : ""}`}>
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="text-xs font-medium uppercase tracking-widest text-charcoal/40">
            {f().airline} · {f().flightNumber}
          </p>
          <p class="mt-0.5 text-base font-bold text-charcoal">{f().guestName}</p>
        </div>
        <FlightStatusBadge status={f().status} />
      </div>

      <RouteBar flight={f()} />

      <Show when={f().status === "in_air" && f().minutesUntilArrival > 0}>
        <p class="mt-2 text-xs font-semibold text-teal">
          Lands in {f().minutesUntilArrival} min
        </p>
      </Show>

      <Show when={f().status === "boarding"}>
        <p class="mt-2 text-xs font-semibold text-orange">
          Departing {formatTime(f().departsAt)}
        </p>
      </Show>
    </div>
  );
}
