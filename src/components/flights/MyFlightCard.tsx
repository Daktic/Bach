import { Match, Switch } from "solid-js";
import type { FlightStatus, GuestFlightWithStatus } from "~/lib/types";
import { formatTime } from "~/lib/flights";
import { ArrivalTime, isActive, markerPercent, TripRoute, TripStatusLine } from "./FlightCard";
import { FlightStatusBadge } from "./FlightStatusBadge";
import type { MyArrival } from "./flight-board";

import { CarIcon, PlaneIcon } from "./icons";

interface Props {
  arrival: MyArrival<GuestFlightWithStatus>;
}

const RING: Record<FlightStatus, string> = {
  in_air:   "border-teal",
  layover:  "border-orange",
  boarding: "border-orange",
  upcoming: "border-charcoal/20",
  delayed:  "border-orange",
  landed:   "border-charcoal/10",
};

const linkCls = `inline-flex min-h-11 items-center px-2 text-xs text-charcoal/75
  underline underline-offset-2 hover:text-charcoal hover:decoration-teal transition-colors`;

function FlightRoute(props: { flight: GuestFlightWithStatus }) {
  const f = () => props.flight;

  return (
    <div class="px-4 pb-5 pt-4">
      {/* Airport codes */}
      <div class="flex items-baseline justify-between">
        <p class="text-3xl font-black leading-none text-charcoal">{f().origin}</p>
        <p class="text-3xl font-black leading-none text-charcoal">{f().destination}</p>
      </div>

      {/* Track with plane */}
      <div class="relative mt-4 h-5" aria-hidden="true">
        <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-charcoal/12" />
        <div
          class={`absolute left-0 top-1/2 h-px -translate-y-1/2 transition-all
                  ${isActive(f()) ? "bg-teal" : f().status === "landed" ? "bg-charcoal/25" : "bg-charcoal/10"}`}
          style={{ width: `${f().progressFraction * 100}%` }}
        />
        <div
          class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all"
          style={{ left: `${markerPercent(f())}%` }}
        >
          <PlaneIcon class={`h-5 w-5 rotate-90 ${isActive(f()) ? "text-teal" : "text-charcoal/25"}`} />
        </div>
      </div>

      {/* Local times at each airport */}
      <div class="mt-2 flex justify-between">
        <p class="text-xs font-medium text-charcoal/75">{formatTime(f().departsAt)}</p>
        <p class="text-xs font-medium text-charcoal/75"><ArrivalTime flight={f()} /></p>
      </div>

      {/* Status line */}
      <TripStatusLine
        flight={f()}
        class="mt-3"
        landed={<p class="mt-3 text-xs font-semibold text-charcoal/75">Landed · Welcome!</p>}
      />
    </div>
  );
}

function NoFlight() {
  return (
    <div class="flex min-h-[172px] flex-col items-center justify-center gap-4 px-6 py-8 text-center">
      <p class="text-sm font-bold text-charcoal/75">No flight details yet</p>

      {/* Charcoal on orange only passes contrast as large text, hence 20px bold. */}
      <a
        href="/flights/book"
        class="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange px-6
               text-xl font-bold text-charcoal hover:bg-orange/90 active:scale-[0.97] transition-all"
      >
        Book Now
      </a>

      <div class="-my-2 flex flex-wrap items-center justify-center">
        <a href="/me#flight-section" class={linkCls}>Have a flight number?</a>
        <span class="text-xs text-charcoal/25" aria-hidden="true">·</span>
        <a href="/me#flight-section" class={linkCls}>Driving instead?</a>
      </div>
    </div>
  );
}

function Driving() {
  return (
    <div class="flex min-h-[172px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-full bg-orange/10 text-orange">
        <CarIcon class="h-6 w-6" />
      </span>
      <div>
        <p class="text-base font-black text-charcoal">You're driving in</p>
        <p class="mt-0.5 text-xs text-charcoal/75">No flight needed. Safe travels!</p>
      </div>
      <a href="/me#flight-section" class={`-my-2 ${linkCls}`}>Flying instead?</a>
    </div>
  );
}

export function MyFlightCard(props: Props) {
  const flight = () => (props.arrival.kind === "flight" ? props.arrival.flight : null);
  const ring = () => {
    const f = flight();
    if (f) return RING[f.status];
    return props.arrival.kind === "driving" ? "border-orange/40" : "border-dashed border-charcoal/20";
  };

  return (
    <div class={`paper-card overflow-hidden rounded-xl border-2 ${ring()}`}>
      <Switch fallback={<NoFlight />}>
        <Match when={flight()}>
          {(f) => (
            <>
              {/* Header */}
              <div class="flex items-center justify-between gap-2 border-b border-charcoal/8 px-4 pb-3 pt-4">
                <div class="min-w-0">
                  <p class="truncate text-[10px] font-bold uppercase tracking-widest text-charcoal/75">
                    {f().airline}
                  </p>
                  <p class="truncate text-xl font-black leading-tight text-charcoal">
                    {f().flightNumber}
                  </p>
                </div>
                <FlightStatusBadge status={f().status} />
              </div>

              <TripRoute flight={f()} class="px-4 pt-3" />
              <FlightRoute flight={f()} />
            </>
          )}
        </Match>
        <Match when={props.arrival.kind === "driving"}>
          <Driving />
        </Match>
      </Switch>
    </div>
  );
}
