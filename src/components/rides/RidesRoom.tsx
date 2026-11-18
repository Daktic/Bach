import { createAsync } from "@solidjs/router";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import {
  addRide,
  bookRideCar,
  chooseRidePlan,
  getRides,
  moveRideRider,
  releaseRideCar,
  removeRide,
  setRideFare,
  setRideRider,
  setRideSettled,
} from "~/lib/api/rides";
import { crewQuery, meQuery } from "~/lib/queries";
import type { RideView } from "~/lib/rides";
import { NewRideForm } from "./NewRideForm";
import { RideCard } from "./RideCard";
import { RideTab } from "./RideTab";
import { crewLookup, primaryButton, rideDay } from "./ui";

/** How often an open page picks up everyone else's changes. */
const POLL_MS = 15_000;

/** The rides page, in the browser only: it polls while it's on screen. */
export function RidesRoom() {
  const me = createAsync(() => meQuery());
  const roster = createAsync(() => crewQuery());
  const crew = createMemo(() => crewLookup(roster()));
  const [rides, setRides] = createSignal<RideView[] | null>(null);
  const [loadFailed, setLoadFailed] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function refresh() {
    if (busy() || document.visibilityState !== "visible") return;
    try {
      setRides(await getRides());
      setLoadFailed(false);
    } catch (err) {
      console.error("[rides] couldn't load", err);
      if (!rides()) setLoadFailed(true);
    }
  }

  onMount(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    onCleanup(() => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    });
  });

  /** Runs a change; the server answers with every ride, fresh. */
  async function change(run: () => Promise<RideView[]>): Promise<boolean> {
    if (busy()) return false;
    setBusy(true);
    setError(null);
    try {
      setRides(await run());
      return true;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't work. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const days = createMemo(() => {
    const byDay = new Map<string, RideView[]>();
    for (const r of rides() ?? []) {
      const d = r.departAt.slice(0, 10);
      byDay.set(d, [...(byDay.get(d) ?? []), r]);
    }
    return [...byDay];
  });

  return (
    <div class="space-y-5">
      <Show when={error()}>
        <p role="alert" class="rounded-xl bg-orange/15 px-4 py-3 text-sm font-semibold text-charcoal ring-1 ring-orange/40">
          {error()}
        </p>
      </Show>

      <Show
        when={rides() && me()}
        fallback={
          <Show
            when={loadFailed()}
            fallback={
              <div class="space-y-4" aria-busy="true">
                <span class="sr-only">Loading rides…</span>
                <div aria-hidden="true" class="paper-card h-11 animate-pulse rounded-xl" />
                <div aria-hidden="true" class="paper-card h-64 animate-pulse rounded-2xl" />
              </div>
            }
          >
            <div class="paper-card rounded-xl px-5 py-8 text-center">
              <h2 class="text-base font-black text-charcoal">Couldn't load rides</h2>
              <p class="mt-1.5 text-sm text-charcoal/75">Check your connection and try again.</p>
              <button type="button" class={`${primaryButton} mt-5`} onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          </Show>
        }
      >
        <RideTab rides={rides()!} me={me()!.id} crew={crew()} />

        <NewRideForm
          busy={busy()}
          onCreate={(ride) => change(() => addRide({ ...ride, note: ride.note || undefined }))}
        />

        <Show
          when={days().length > 0}
          fallback={
            <div class="paper-card rounded-xl px-5 py-8 text-center">
              <h2 class="text-base font-black text-charcoal">No rides yet</h2>
              <p class="mt-1.5 text-sm text-charcoal/75">
                Add one, put the crew in it, and Bach works out the cheapest cars.
              </p>
            </div>
          }
        >
          <For each={days()}>
            {([day, list]) => (
              <section aria-label={rideDay(day)} class="space-y-3">
                <h2 class="text-sm font-black uppercase tracking-wide text-charcoal/75">{rideDay(day)}</h2>
                <For each={list}>
                  {(ride) => (
                    <RideCard
                      ride={ride}
                      me={me()!.id}
                      roster={roster() ?? []}
                      crew={crew()}
                      busy={busy()}
                      actions={{
                        setRider: (g, inRide) => void change(() => setRideRider(ride.id, g, inRide)),
                        choosePlan: (plan) => void change(() => chooseRidePlan(ride.id, plan)),
                        remove: () => void change(() => removeRide(ride.id)),
                        move: (g, car) => void change(() => moveRideRider(ride.id, g, car)),
                        book: (car, provider) => void change(() => bookRideCar(ride.id, car, provider)),
                        release: (car) => void change(() => releaseRideCar(ride.id, car)),
                        setFare: (car, cents) => void change(() => setRideFare(ride.id, car, cents)),
                        setSettled: (car, g, s) => void change(() => setRideSettled(ride.id, car, g, s)),
                      }}
                    />
                  )}
                </For>
              </section>
            )}
          </For>
        </Show>
      </Show>
    </div>
  );
}
