import { createSignal, For, onCleanup, Show } from "solid-js";
import { TRIP_DAYS } from "~/lib/config";
import { suggestedDestinations, type RideDestination } from "~/lib/ride-places";
import { Sheet } from "./Sheet";
import { focusRing, primaryButton, rideDay, secondaryButton, textButton } from "./ui";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-xl border border-charcoal/20 bg-cream px-3 text-base text-charcoal " +
  "focus:outline-2 focus:outline-charcoal";
const labelClass = "block text-xs font-semibold text-charcoal/75";
const rowClass = `flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left text-sm font-semibold text-charcoal
                  hover:bg-charcoal/5 disabled:opacity-50 ${focusRing}`;

export interface NewRideInput {
  destination: RideDestination;
  day: string;
  time: string;
  note: string;
}

/** How long typing pauses before a search goes out. */
const DEBOUNCE_MS = 400;

/**
 * Adds a ride: first "Where to?" (search, or one of the trip's spots), then
 * an optional time and note. The pickup is never asked for; the apps use the
 * booker's phone when they tap.
 */
export function NewRideForm(props: {
  busy: boolean;
  search: (query: string) => Promise<RideDestination[]>;
  onCreate: (ride: NewRideInput) => Promise<boolean>;
}) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<RideDestination[] | null>(null);
  const [searching, setSearching] = createSignal(false);
  const [searchError, setSearchError] = createSignal<string | null>(null);
  const [destination, setDestination] = createSignal<RideDestination | null>(null);
  const [timed, setTimed] = createSignal(false);
  const [day, setDay] = createSignal<string>(TRIP_DAYS[0]);
  const [time, setTime] = createSignal("");
  const [note, setNote] = createSignal("");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;
  onCleanup(() => clearTimeout(timer));

  function reset() {
    setQuery("");
    setResults(null);
    setSearchError(null);
    setDestination(null);
    setTimed(false);
    setTime("");
    setNote("");
  }

  function onType(value: string) {
    setQuery(value);
    clearTimeout(timer);
    setSearchError(null);
    if (value.trim().length < 3) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer = setTimeout(async () => {
      const mine = ++latest;
      try {
        const found = await props.search(value.trim());
        if (mine !== latest) return;
        setResults(found);
      } catch (err) {
        if (mine !== latest) return;
        setResults([]);
        setSearchError(err instanceof Error && err.message ? err.message : "Search didn't work. Try again.");
      } finally {
        if (mine === latest) setSearching(false);
      }
    }, DEBOUNCE_MS);
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const dest = destination();
    if (!dest) return;
    const withTime = timed() && time() !== "";
    const ok = await props.onCreate({ destination: dest, day: withTime ? day() : "", time: withTime ? time() : "", note: note() });
    if (ok) {
      setOpen(false);
      reset();
    }
  }

  const close = () => {
    setOpen(false);
    reset();
  };

  return (
    <>
      <button type="button" class={`${primaryButton} w-full`} onClick={() => setOpen(true)}>
        Add a ride
      </button>
      <Sheet open={open()} title={destination() ? "New ride" : "Where to?"} onClose={close}>
        <Show
          when={destination()}
          fallback={
            <div>
              <label class="sr-only" for="ride-search">Search for a place</label>
              <input
                id="ride-search"
                type="search"
                autofocus
                autocomplete="off"
                enterkeyhint="search"
                placeholder="Bar, restaurant, address…"
                value={query()}
                onInput={(e) => onType(e.currentTarget.value)}
                class={`${fieldClass} mt-0`}
              />
              <p class="mt-1.5 text-xs text-charcoal/75">
                Pickup is wherever the booker's phone is when they tap Uber or Lyft.
              </p>
              <Show when={searchError()}>
                <p role="alert" class="mt-2 text-sm font-semibold text-charcoal">{searchError()}</p>
              </Show>
              <Show
                when={results()}
                fallback={
                  <Show
                    when={query().trim().length < 3}
                    fallback={<p class="mt-3 text-sm text-charcoal/75" role="status">Searching…</p>}
                  >
                    <h4 class="mt-4 text-xs font-black uppercase tracking-wide text-charcoal/75">Trip spots</h4>
                    <PlaceList places={suggestedDestinations} onPick={setDestination} />
                  </Show>
                }
              >
                {(found) => (
                  <Show
                    when={found().length > 0}
                    fallback={<p class="mt-3 text-sm text-charcoal/75" role="status">Nothing found. Try the street address.</p>}
                  >
                    <h4 class="mt-4 text-xs font-black uppercase tracking-wide text-charcoal/75">
                      {searching() ? "Searching…" : "Results"}
                    </h4>
                    <PlaceList places={found()} onPick={setDestination} />
                  </Show>
                )}
              </Show>
            </div>
          }
        >
          {(dest) => (
            <form onSubmit={submit} class="space-y-3">
              <div class="flex items-start justify-between gap-3 rounded-xl bg-charcoal/5 px-3 py-2.5">
                <div class="min-w-0">
                  <p class="font-black text-charcoal">{dest().name}</p>
                  <Show when={dest().address}>
                    <p class="truncate text-xs text-charcoal/75">{dest().address}</p>
                  </Show>
                </div>
                <button type="button" class={textButton} onClick={() => setDestination(null)}>
                  Change
                </button>
              </div>

              <Show
                when={timed()}
                fallback={
                  <button type="button" class={textButton} onClick={() => setTimed(true)}>
                    + Set a time (otherwise it's whenever)
                  </button>
                }
              >
                <div class="grid grid-cols-2 gap-3">
                  <label class={labelClass}>
                    Day
                    <select class={fieldClass} value={day()} onChange={(e) => setDay(e.currentTarget.value)}>
                      <For each={TRIP_DAYS}>{(d) => <option value={d}>{rideDay(d)}</option>}</For>
                    </select>
                  </label>
                  <label class={labelClass}>
                    Time (Arizona)
                    <input type="time" class={fieldClass} value={time()} onInput={(e) => setTime(e.currentTarget.value)} />
                  </label>
                </div>
              </Show>

              <label class={labelClass}>
                Note (optional)
                <input
                  class={fieldClass}
                  maxlength={120}
                  placeholder="e.g. meet out front by the valet"
                  value={note()}
                  onInput={(e) => setNote(e.currentTarget.value)}
                />
              </label>

              <div class="flex gap-2">
                <button type="submit" class={`${primaryButton} flex-1`} disabled={props.busy}>
                  Add ride
                </button>
                <button type="button" class={secondaryButton} onClick={close}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Show>
      </Sheet>
    </>
  );
}

function PlaceList(props: { places: RideDestination[]; onPick: (d: RideDestination) => void }) {
  return (
    <ul class="mt-1">
      <For each={props.places}>
        {(place) => (
          <li>
            <button type="button" class={rowClass} onClick={() => props.onPick(place)}>
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/25 text-charcoal" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
              </span>
              <span class="min-w-0">
                <span class="block truncate">{place.name}</span>
                <Show when={place.address}>
                  <span class="block truncate text-xs font-normal text-charcoal/75">{place.address}</span>
                </Show>
              </span>
            </button>
          </li>
        )}
      </For>
    </ul>
  );
}
