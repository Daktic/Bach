import { createSignal, For, onMount, Show } from "solid-js";
import { enrichFlight, sortFlights } from "~/lib/flights";
import { mockFlights, mockGuestsWithoutFlight } from "~/lib/data/flights";
import type { GuestFlightWithStatus } from "~/lib/types";
import { FlightCard } from "./FlightCard";
import { MyFlightCard } from "./MyFlightCard";
import { NoFlightCard } from "./NoFlightCard";

// Replaced with session.user.id once auth is wired up
const CURRENT_USER_ID = "gberg";

function SectionLabel(props: { label: string }) {
  return (
    <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-charcoal/40">
      {props.label}
    </p>
  );
}

export function FlightTracker() {
  const [flights, setFlights] = createSignal<GuestFlightWithStatus[]>([]);

  onMount(() => {
    setFlights(sortFlights(mockFlights.map(enrichFlight)));
  });

  const myFlight    = () => flights().find(f => f.guestId === CURRENT_USER_ID) ?? null;
  const otherFlights= () => flights().filter(f => f.guestId !== CURRENT_USER_ID);

  const active   = () => otherFlights().filter(f => f.status === "in_air" || f.status === "boarding");
  const upcoming = () => otherFlights().filter(f => f.status === "upcoming" || f.status === "delayed");
  const landed   = () => otherFlights().filter(f => f.status === "landed");

  return (
    <div class="mx-auto max-w-lg px-4 py-6 space-y-6">

      {/* My flight — always shown, collapses to "book now" if null */}
      <section>
        <SectionLabel label="Your flight" />
        <MyFlightCard flight={myFlight()} />
      </section>

      {/* Use <Show> not && — SolidJS needs Show for stable SSR hydration markers */}
      <Show when={active().length > 0}>
        <section>
          <SectionLabel label="In the air" />
          <div class="space-y-3">
            <For each={active()}>{(f) => <FlightCard flight={f} />}</For>
          </div>
        </section>
      </Show>

      <Show when={upcoming().length > 0}>
        <section>
          <SectionLabel label="Upcoming" />
          <div class="space-y-3">
            <For each={upcoming()}>{(f) => <FlightCard flight={f} />}</For>
          </div>
        </section>
      </Show>

      <Show when={landed().length > 0}>
        <section>
          <SectionLabel label="Landed" />
          <div class="space-y-3">
            <For each={landed()}>{(f) => <FlightCard flight={f} />}</For>
          </div>
        </section>
      </Show>

      <Show when={mockGuestsWithoutFlight.length > 0}>
        <section>
          <SectionLabel label="No flight yet" />
          <div class="space-y-3">
            <For each={mockGuestsWithoutFlight}>
              {(g) => <NoFlightCard guest={g} />}
            </For>
          </div>
        </section>
      </Show>

    </div>
  );
}
