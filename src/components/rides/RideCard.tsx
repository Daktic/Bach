import { createSignal, For, Show } from "solid-js";
import { getRidePlace } from "~/lib/ride-places";
import { costOf, describePlan, formatPlan, type CarKind, type RideView } from "~/lib/rides";
import type { CrewMemberView } from "~/lib/types";
import { CarBox, type CarActions } from "./CarBox";
import { Face, focusRing, primaryButton, rideTime, secondaryButton, textButton, type CrewLookup } from "./ui";

export interface RideActions extends CarActions {
  setRider: (guestId: string, inRide: boolean) => void;
  choosePlan: (plan: CarKind[] | null) => void;
  remove: () => void;
}

/** One ride: where and when, who's in it, which cars, and each car. */
export function RideCard(props: {
  ride: RideView;
  me: string;
  roster: readonly CrewMemberView[];
  crew: CrewLookup;
  busy: boolean;
  actions: RideActions;
}) {
  const from = () => getRidePlace(props.ride.fromId)?.name ?? props.ride.fromId;
  const to = () => getRidePlace(props.ride.toId)?.name ?? props.ride.toId;
  const imIn = () => props.ride.riders.includes(props.me);
  const [editing, setEditing] = createSignal(false);
  const [moving, setMoving] = createSignal<string | null>(null);
  const cheapest = () => props.ride.options[0];

  return (
    <article class="paper-card rounded-2xl p-4">
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-black uppercase tracking-wide text-charcoal/75">{rideTime(props.ride.departAt)}</p>
          <h3 class="mt-0.5 text-base font-black leading-snug text-charcoal">
            {from()} <span aria-label="to">→</span> {to()}
          </h3>
          <Show when={props.ride.note}>
            <p class="mt-0.5 text-sm text-charcoal/75">{props.ride.note}</p>
          </Show>
        </div>
        <Show when={!props.ride.locked}>
          <button
            type="button"
            class={imIn() ? secondaryButton : primaryButton}
            disabled={props.busy}
            onClick={() => props.actions.setRider(props.me, !imIn())}
          >
            {imIn() ? "I'm out" : "I'm in"}
          </button>
        </Show>
      </header>

      {/* Who's riding */}
      <div class="mt-3 flex items-center gap-2">
        <div class="flex -space-x-2" aria-hidden="true">
          <For each={props.ride.riders.slice(0, 8)}>
            {(id) => <Face initials={props.crew(id).initials} image={props.crew(id).image} class="ring-2 ring-cream" />}
          </For>
        </div>
        <p class="flex-1 text-sm font-semibold text-charcoal">
          {props.ride.riders.length} {props.ride.riders.length === 1 ? "rider" : "riders"}
        </p>
        <Show when={!props.ride.locked}>
          <button type="button" class={textButton} aria-expanded={editing()} onClick={() => setEditing(!editing())}>
            {editing() ? "Done" : "Who's riding"}
          </button>
        </Show>
      </div>

      <Show when={editing() && !props.ride.locked}>
        <fieldset class="mt-2 rounded-xl bg-cream/60 p-2 ring-1 ring-charcoal/10">
          <legend class="sr-only">Who's riding</legend>
          <div class="grid grid-cols-2 gap-1">
            <For each={props.roster}>
              {(person) => {
                const riding = () => props.ride.riders.includes(person.id);
                return (
                  <label class={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-charcoal hover:bg-charcoal/5`}>
                    <input
                      type="checkbox"
                      checked={riding()}
                      disabled={props.busy}
                      onChange={(e) => props.actions.setRider(person.id, e.currentTarget.checked)}
                      class="h-5 w-5 accent-teal"
                    />
                    {person.id === props.me ? `${person.name} (you)` : person.name}
                  </label>
                );
              }}
            </For>
          </div>
        </fieldset>
      </Show>

      <Show when={props.ride.riders.length > 0}>
        {/* Which cars */}
        <div class="mt-4">
          <p class="text-sm text-charcoal">
            <span class="font-black">{describePlan(props.ride.plan)}</span>
            <Show
              when={props.ride.customPlan}
              fallback={<span class="text-charcoal/75"> · cheapest for {props.ride.riders.length}</span>}
            >
              <span class="text-charcoal/75"> · picked by the group</span>
            </Show>
          </p>
          <Show when={!props.ride.locked && props.ride.options.length > 1}>
            <div role="radiogroup" aria-label="Cars" class="mt-2 flex flex-wrap gap-1.5">
              <For each={props.ride.options}>
                {(option) => {
                  const chosen = () => formatPlan(option) === formatPlan(props.ride.plan);
                  const isCheapest = () => formatPlan(option) === formatPlan(cheapest());
                  const extra = () => Math.round((costOf(option) / costOf(cheapest()) - 1) * 100);
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={chosen()}
                      disabled={props.busy}
                      onClick={() => !chosen() && props.actions.choosePlan(isCheapest() ? null : option)}
                      class={`min-h-11 rounded-full px-3 text-xs font-semibold ring-1 transition-colors ${focusRing}
                              ${chosen() ? "bg-charcoal text-cream ring-charcoal" : "bg-cream/70 text-charcoal ring-charcoal/20 hover:bg-charcoal/5"}`}
                    >
                      {describePlan(option)}
                      <span class={chosen() ? "text-cream/80" : "text-charcoal/70"}>
                        {isCheapest() ? " · cheapest" : ` · ~${extra()}% more`}
                      </span>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>
          <Show when={props.ride.locked}>
            <p class="mt-1 text-xs text-charcoal/75">
              A car's booked, so the cars are set. Whoever booked it can give it up to change them.
            </p>
          </Show>
          <Show when={!props.ride.locked && props.ride.cars.length > 1}>
            <p class="mt-1 text-xs text-charcoal/75">Tap someone to move them to another car.</p>
          </Show>
        </div>

        <div class="mt-3 space-y-3">
          <For each={props.ride.cars}>
            {(car) => (
              <CarBox
                ride={props.ride}
                car={car}
                me={props.me}
                crew={props.crew}
                busy={props.busy}
                moving={moving()}
                setMoving={setMoving}
                actions={props.actions}
              />
            )}
          </For>
        </div>
      </Show>

      <Show when={!props.ride.locked}>
        <div class="mt-2 flex justify-end">
          <button
            type="button"
            class={textButton}
            disabled={props.busy}
            onClick={() => {
              if (confirm(`Remove the ride from ${from()} to ${to()}?`)) props.actions.remove();
            }}
          >
            Remove ride
          </button>
        </div>
      </Show>
    </article>
  );
}
