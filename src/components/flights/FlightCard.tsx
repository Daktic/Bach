import { Match, Show, Switch, type JSX } from "solid-js";
import type { GuestFlightWithStatus } from "~/lib/types";
import { formatTime } from "~/lib/flights";
import { FlightStatusBadge } from "./FlightStatusBadge";
import { arrivalDayOffset, formatDayOffset, formatDuration, formatFlightDate } from "./flight-format";
import { PlaneIcon } from "./icons";

interface Props {
  flight: GuestFlightWithStatus;
}

// Times are each airport's local wall clock (departure at the origin, arrival
// at the destination), straight from the flight data. Never the viewer's zone.

/**
 * Arrival time, marked "+1" when it lands on a later local day than it left,
 * or "−1" when it crosses the date line and lands on an earlier one.
 */
export function ArrivalTime(props: { flight: GuestFlightWithStatus }) {
  const days = () => arrivalDayOffset(props.flight.departsAt, props.flight.arrivesAt);
  return (
    <>
      {formatTime(props.flight.arrivesAt)}
      <Show when={days() !== 0}>
        <span class="ml-0.5 align-super text-[9px] font-bold" title="Lands on a different day">
          {formatDayOffset(days())}
        </span>
      </Show>
    </>
  );
}

/**
 * Colour marker for a status line. Teal and orange are too light for small
 * text on cream, so the line itself stays charcoal.
 */
export function StatusDot(props: { class: string }) {
  return <span class={`h-1.5 w-1.5 shrink-0 rounded-full ${props.class}`} aria-hidden="true" />;
}

/** Plane marker position along the route, kept inside the track. */
export function markerPercent(flight: GuestFlightWithStatus): number {
  return Math.min(96, Math.max(4, flight.progressFraction * 100));
}

export const isActive = (flight: GuestFlightWithStatus) =>
  flight.status === "in_air" || flight.status === "boarding";

/** "LAX → DFW → PHX · flight 1 of 2", for trips with a connection. */
export function TripRoute(props: { flight: GuestFlightWithStatus; class?: string }) {
  const stops = () => {
    const legs = props.flight.legs ?? [];
    return legs.length > 1 ? [legs[0].origin, ...legs.map((l) => l.destination)] : [];
  };
  return (
    <Show when={stops().length > 0}>
      <p class={`truncate text-xs font-semibold text-charcoal/75 ${props.class ?? ""}`}>
        <span class="sr-only">Route: </span>
        {stops().join(" → ")} · flight {props.flight.legIndex + 1} of {props.flight.legCount}
      </p>
    </Show>
  );
}

/** The line under the route: time to landing, the layover, or when it leaves. */
export function TripStatusLine(props: { flight: GuestFlightWithStatus; class: string; landed?: JSX.Element }) {
  const f = () => props.flight;
  const finalLeg = () => f().legIndex === f().legCount - 1;
  return (
    <Switch>
      <Match when={f().status === "in_air" && f().minutesUntilArrival > 0}>
        <p class={`flex items-center gap-1.5 text-xs font-semibold text-charcoal ${props.class}`}>
          <StatusDot class="bg-teal" />
          <span>
            Lands {finalLeg() ? "" : `at ${f().destination} `}in {formatDuration(f().minutesUntilArrival)}
          </span>
        </p>
      </Match>
      <Match when={f().status === "layover"}>
        <p class={`flex items-center gap-1.5 text-xs font-semibold text-charcoal ${props.class}`}>
          <StatusDot class="bg-orange" />
          <span>
            Layover in {f().layoverAt} · {f().flightNumber} departs {formatTime(f().departsAt)}
          </span>
        </p>
      </Match>
      <Match when={f().status === "boarding"}>
        <p class={`flex items-center gap-1.5 text-xs font-semibold text-charcoal ${props.class}`}>
          <StatusDot class="bg-orange" />
          <span>
            Departing {f().legIndex > 0 ? `${f().origin} ` : ""}
            {formatTime(f().departsAt)}
          </span>
        </p>
      </Match>
      <Match when={f().status === "upcoming" || f().status === "delayed"}>
        <p class={`text-xs font-medium text-charcoal/75 ${props.class}`}>Departs {formatFlightDate(f().departsAt)}</p>
      </Match>
      <Match when={f().status === "landed" && props.landed}>{props.landed}</Match>
    </Switch>
  );
}

function RouteBar(props: Props) {
  const f = () => props.flight;

  return (
    <div class="mt-3">
      <div class="mb-1 flex items-center justify-between text-xs font-bold text-charcoal/80">
        <span>{f().origin}</span>
        <span>{f().destination}</span>
      </div>
      <div class="relative h-1 w-full rounded-full bg-charcoal/10" aria-hidden="true">
        {/* Filled progress track */}
        <div
          class={`absolute inset-y-0 left-0 rounded-full transition-all ${isActive(f()) ? "bg-teal" : f().status === "landed" ? "bg-charcoal/25" : "bg-charcoal/10"}`}
          style={{ width: `${f().progressFraction * 100}%` }}
        />
        {/* Plane marker */}
        <div
          class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all"
          style={{ left: `${markerPercent(f())}%` }}
        >
          <PlaneIcon class={`h-3 w-3 rotate-90 ${isActive(f()) ? "text-teal" : "text-charcoal/30"}`} />
        </div>
      </div>
      <div class="mt-1 flex justify-between text-xs text-charcoal/75">
        <span>{formatTime(f().departsAt)}</span>
        <span><ArrivalTime flight={f()} /></span>
      </div>
    </div>
  );
}

// Landed flights are muted through the grey track and badge, never by fading
// the card: names and times stay readable.
export function FlightCard(props: Props) {
  const f = () => props.flight;

  return (
    <div class="paper-card rounded-xl p-4">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="truncate text-xs font-medium uppercase tracking-widest text-charcoal/75">
            {f().airline} · {f().flightNumber}
          </p>
          <p class="mt-0.5 truncate text-base font-bold text-charcoal">{f().guestName}</p>
        </div>
        <FlightStatusBadge status={f().status} />
      </div>

      <TripRoute flight={f()} class="mt-2" />

      <RouteBar flight={f()} />

      <TripStatusLine flight={f()} class="mt-2" />
    </div>
  );
}
