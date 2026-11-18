import { createAsync } from "@solidjs/router";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import {
  addRide,
  addRideCar,
  autoArrangeRide,
  bookRideCar,
  getRides,
  releaseRideCar,
  removeRide,
  removeRideCar,
  seatRideRider,
  setRideCarKind,
  setRideFare,
  setRideSettled,
  unseatRideRider,
} from "~/lib/api/rides";
import { findPlaces } from "~/lib/api/places";
import { usePhonePosition } from "~/lib/client/position";
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
  // For Lyft's pickup; asked for once the page is open.
  const phone = usePhonePosition();
  // A store, merged by id, so a ride or car keeps its identity across polls:
  // an open sheet, a half-typed fare or a drag in progress survives a refresh.
  const [state, setState] = createStore<{ rides: RideView[] | null }>({ rides: null });
  const [loadFailed, setLoadFailed] = createSignal(false);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const put = (fresh: RideView[]) => setState("rides", reconcile(fresh, { key: "id" }));

  // Bumped by every change, so a poll that started before one can't win.
  let version = 0;

  async function refresh() {
    if (busy() || document.visibilityState !== "visible") return;
    const asOf = version;
    try {
      const fresh = await getRides();
      if (asOf === version && !busy()) put(fresh);
      setLoadFailed(false);
    } catch (err) {
      console.error("[rides] couldn't load", err);
      if (!state.rides) setLoadFailed(true);
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

  async function perform(run: () => Promise<RideView[]>): Promise<boolean> {
    version++;
    setBusy(true);
    setError(null);
    try {
      put(await run());
      return true;
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't work. Try again.");
      // The server may have changed anyway (or someone else did); show the truth.
      try {
        put(await getRides());
      } catch {
        // keep what we have
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  /**
   * Runs a change; the server answers with every ride, fresh. Changes queue
   * up, so a seat tapped while the last one is saving isn't lost.
   */
  let queue: Promise<unknown> = Promise.resolve();
  function change(run: () => Promise<RideView[]>): Promise<boolean> {
    const result = queue.then(() => perform(run));
    queue = result.catch(() => {});
    return result;
  }

  // Rides by day ("" for whenever), the days as plain strings so the
  // sections stay put when the list refreshes.
  const byDay = createMemo(() => {
    const map = new Map<string, RideView[]>();
    for (const r of state.rides ?? []) {
      const d = r.departAt?.slice(0, 10) ?? "";
      map.set(d, [...(map.get(d) ?? []), r]);
    }
    return map;
  });
  const days = () => [...byDay().keys()];

  return (
    <div class="space-y-5">
      <Show when={error()}>
        <p role="alert" class="rounded-xl bg-orange/15 px-4 py-3 text-sm font-semibold text-charcoal ring-1 ring-orange/40">
          {error()}
        </p>
      </Show>

      <Show
        when={state.rides && me()}
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
        <RideTab rides={state.rides!} me={me()!.id} crew={crew()} />

        <NewRideForm
          busy={busy()}
          search={findPlaces}
          onCreate={(ride) => change(() => addRide({ ...ride, note: ride.note || undefined }))}
        />

        <Show
          when={days().length > 0}
          fallback={
            <div class="paper-card rounded-xl px-5 py-8 text-center">
              <h2 class="text-base font-black text-charcoal">No rides yet</h2>
              <p class="mt-1.5 text-sm text-charcoal/75">
                Add one with where you're headed, then drag the crew into the seats.
              </p>
            </div>
          }
        >
          <For each={days()}>
            {(day) => (
              <section aria-label={day ? rideDay(day) : "Whenever"} class="space-y-3">
                <h2 class="text-sm font-black uppercase tracking-wide text-charcoal/75">{day ? rideDay(day) : "Whenever"}</h2>
                <For each={byDay().get(day) ?? []}>
                  {(ride) => (
                    <RideCard
                      ride={ride}
                      me={me()!.id}
                      roster={roster() ?? []}
                      crew={crew()}
                      busy={busy()}
                      pickup={phone.position()}
                      positionState={phone.state()}
                      actions={{
                        seat: (g, car, seat) => void change(() => seatRideRider(ride.id, g, car, seat)),
                        unseat: (g) => void change(() => unseatRideRider(ride.id, g)),
                        addCar: (kind) => void change(() => addRideCar(ride.id, kind)),
                        removeCar: (car) => void change(() => removeRideCar(ride.id, car)),
                        setKind: (car, kind) => void change(() => setRideCarKind(ride.id, car, kind)),
                        autoArrange: () => void change(() => autoArrangeRide(ride.id)),
                        remove: () => void change(() => removeRide(ride.id)),
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
