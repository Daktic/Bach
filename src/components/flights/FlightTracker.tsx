import { createAsync, query } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { getFlightBoard } from "~/lib/api/flights";
import { createNow } from "~/lib/client/clock";
import { EMPTY_TRAVEL, loadMyTravel, onMyTravelChange, type MyTravel } from "~/lib/client/my-travel";
import { meQuery } from "~/lib/queries";
import { DrivingCard } from "./DrivingCard";
import { FlightCard } from "./FlightCard";
import { MyFlightCard } from "./MyFlightCard";
import { NoFlightCard } from "./NoFlightCard";
import { buildFlightView, type FlightGroup } from "./flight-board";

// Status and progress depend on the clock, so they're computed here after
// mount (?mockDate works in dev) and refreshed every minute.
const REFRESH_MS = 60_000;

const flightBoardQuery = query(() => getFlightBoard(), "flightBoard");

const GROUP_LABEL: Record<FlightGroup, string> = {
  in_air:   "In the air",
  layover:  "Layover",
  boarding: "Boarding",
  upcoming: "Upcoming",
  landed:   "Landed",
};

function SectionLabel(props: { label: string; count?: number }) {
  return (
    <div class="mb-2 flex items-baseline justify-between gap-2">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">{props.label}</h2>
      <Show when={props.count}>
        <span class="text-xs font-semibold text-charcoal/75">{props.count}</span>
      </Show>
    </div>
  );
}

function readMyTravel(guestId: string): MyTravel {
  try {
    return loadMyTravel(guestId);
  } catch {
    return EMPTY_TRAVEL; // storage blocked
  }
}

export function FlightTracker() {
  const board = createAsync(() => flightBoardQuery());
  const me = createAsync(() => meQuery());
  const [travel, setTravel] = createSignal<MyTravel>(EMPTY_TRAVEL);

  // The viewer's own entry from /me overrides the board; follow edits made
  // in another tab while this page is open.
  createEffect(() => {
    const id = me()?.id;
    if (!id) return;
    setTravel(readMyTravel(id));
    onCleanup(onMyTravelChange(id, () => setTravel(readMyTravel(id))));
  });

  // null until mount, then ticks every REFRESH_MS and when the page is shown again.
  const now = createNow(REFRESH_MS);

  const view = createMemo(() => {
    const b = board();
    const viewer = me();
    const at = now();
    return b && viewer && at ? buildFlightView(b, viewer, travel(), at) : null;
  });

  return (
    <Show when={view()}>
      {(v) => (
        <div class="mx-auto max-w-lg space-y-6 px-4 py-6">
          <section>
            <SectionLabel label={v().mine.kind === "driving" ? "Your trip" : "Your flight"} />
            <MyFlightCard arrival={v().mine} />
          </section>

          <For each={v().groups}>
            {(g) => (
              <section>
                <SectionLabel label={GROUP_LABEL[g.group]} count={g.flights.length} />
                <div class="space-y-3">
                  <For each={g.flights}>{(f) => <FlightCard flight={f} />}</For>
                </div>
              </section>
            )}
          </For>

          <Show when={v().driving.length > 0}>
            <section>
              <SectionLabel label="Driving in" count={v().driving.length} />
              <div class="space-y-2">
                <For each={v().driving}>{(g) => <DrivingCard guest={g} />}</For>
              </div>
            </section>
          </Show>

          <Show when={v().noFlight.length > 0}>
            <section>
              <SectionLabel label="No flight yet" count={v().noFlight.length} />
              <div class="space-y-2">
                <For each={v().noFlight}>{(g) => <NoFlightCard guest={g} />}</For>
              </div>
            </section>
          </Show>

          <Show when={v().mine.kind === "flight" || v().groups.length > 0}>
            <p class="text-center text-xs text-charcoal/75">
              Times are local to each airport.
            </p>
          </Show>
        </div>
      )}
    </Show>
  );
}
