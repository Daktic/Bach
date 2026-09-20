import { createSignal, For, onMount, Show } from "solid-js";
import { enrichFlight, sortFlights } from "~/lib/flights";
import { mockFlights, mockGuestsWithoutFlight } from "~/lib/data/flights";
import type { GuestFlightWithStatus } from "~/lib/types";
import { FlightCard } from "./FlightCard";
import { NoFlightCard } from "./NoFlightCard";

function SectionLabel(props: { label: string }) {
  return (
    <p class="mb-2 text-xs font-semibold uppercase tracking-widest text-charcoal/40">
      {props.label}
    </p>
  );
}

export function FlightTracker() {
  // Empty on the server — populated after mount so getCurrentDate() can read
  // ?mockDate from the URL. Keeps SSR and initial client renders identical.
  const [flights, setFlights] = createSignal<GuestFlightWithStatus[]>([]);

  onMount(() => {
    setFlights(sortFlights(mockFlights.map(enrichFlight)));
  });

  const active   = () => flights().filter(f => f.status === "in_air" || f.status === "boarding");
  const upcoming = () => flights().filter(f => f.status === "upcoming" || f.status === "delayed");
  const landed   = () => flights().filter(f => f.status === "landed");

  return (
    <div class="mx-auto max-w-lg px-4 py-6 space-y-6">

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
