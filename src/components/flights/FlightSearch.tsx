import { createSignal, For, Show } from "solid-js";
import { findNearbyAirports, resolveBookingUrl, searchFlightOffers } from "~/lib/api/serpapi";
import type { FlightOffer, NearbyAirport, PriceInsights } from "~/lib/api/serpapi";
import { DEFAULT_INBOUND_DATE, DEFAULT_OUTBOUND_DATE, DESTINATION_AIRPORT } from "~/lib/config";
import { SEARCH_AIRLINES } from "~/lib/flight-api";
import { formatCalendarDate, formatWallClock } from "~/lib/zoned-time";
import { arrivalDayOffset, formatDayOffset } from "./flight-format";
import { AlertIcon } from "./icons";

const shortDate = (date: string) => formatCalendarDate(date, { month: "short", day: "numeric" });

const IATA_RE = /^[A-Z]{3}$/;

/** "1 airport", "5 airports". */
const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

// ─── Icons ────────────────────────────────────────────────────────────────────

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-4 h-4">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

// The only sign the card opens another site, so it needs 3:1.
function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-3.5 h-3.5 text-charcoal/75 shrink-0">
      <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8l-3.528-3.536-5.656 5.658-1.415-1.415 5.657-5.657L13 3h8z" />
    </svg>
  );
}

// ─── Flight result card ───────────────────────────────────────────────────────

function FlightResultCard(props: { offer: FlightOffer }) {
  const [booking, setBooking] = createSignal(false);
  const o = () => props.offer;
  const dayOffset = () => arrivalDayOffset(o().departsAt, o().arrivesAt);

  // Phones block window.open after an await, so the tab opens during the tap
  // and is pointed at the airline once the direct link resolves. Without a
  // token the link just opens the fallback search.
  async function handleBook(e: MouseEvent) {
    const offer = props.offer;
    if (!offer.bookingToken) return;
    e.preventDefault();
    if (booking()) return;
    setBooking(true);

    const tab = window.open("", "_blank");
    if (tab) {
      tab.opener = null;
      try {
        tab.document.title = "Opening booking…";
        tab.document.body.textContent = "Opening the booking site…";
      } catch {
        // Cosmetic only.
      }
    }

    try {
      const url = (await resolveBookingUrl(offer.bookingToken).catch(() => null)) ?? offer.bookingUrl;
      if (!tab) window.location.assign(url); // popups blocked outright
      else if (!tab.closed) tab.location.href = url;
    } finally {
      setBooking(false);
    }
  }

  return (
    <a
      href={o().bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleBook}
      aria-busy={booking()}
      class="paper-card rounded-xl p-4 flex items-center gap-3 min-h-11
             hover:-translate-y-px active:scale-[0.99] transition-all select-none"
    >
      {/* Price */}
      <div class="shrink-0 text-center w-14">
        <p class="text-xl font-black text-charcoal leading-none">${o().price}</p>
        <p class="text-[10px] text-charcoal/75 mt-0.5">RT · USD</p>
      </div>

      <div class="w-px self-stretch bg-charcoal/10" />

      {/* Flight details: each time is local to its airport */}
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-charcoal/75 truncate">
          {o().airlineName} · {o().flightNumber}
        </p>
        <div class="flex items-baseline gap-2 mt-1">
          <span class="text-base font-black text-charcoal">{o().origin}</span>
          <span class="text-charcoal/25 text-xs">→</span>
          <span class="text-base font-black text-charcoal">{o().destination}</span>
        </div>
        <p class="text-xs text-charcoal/75 mt-0.5">
          {formatWallClock(o().departsAt)} → {formatWallClock(o().arrivesAt)}
          <Show when={dayOffset() !== 0}>
            <span class="ml-0.5 align-super text-[9px] font-bold" title="Lands on a different day">
              {formatDayOffset(dayOffset())}
            </span>
          </Show>
          {" "}· {o().duration}
          <Show
            when={o().stops === 0}
            fallback={<span class="ml-1.5">· {o().stops} stop{o().stops > 1 ? "s" : ""}</span>}
          >
            <span class="ml-1.5 font-semibold text-charcoal">· Non-stop</span>
          </Show>
        </p>
      </div>

      <Show when={booking()} fallback={<ExternalIcon />}>
        <span class="text-[10px] text-charcoal shrink-0">loading…</span>
      </Show>
    </a>
  );
}

// ─── Price insights banner ────────────────────────────────────────────────────

// The dot carries the colour: teal and orange are too light for small text.
const LEVEL_CONFIG = {
  low:     { label: "Lower than usual",  dot: "bg-teal"        },
  typical: { label: "Typical price",     dot: "bg-charcoal/30" },
  high:    { label: "Higher than usual", dot: "bg-orange"      },
} as const;

function PriceInsightsBanner(props: { insights: PriceInsights }) {
  const level = () => {
    const l = props.insights.priceLevel?.toLowerCase();
    if (l === "low")  return LEVEL_CONFIG.low;
    if (l === "high") return LEVEL_CONFIG.high;
    return LEVEL_CONFIG.typical;
  };

  const hasRange = () => props.insights.typicalRangeLow > 0;

  return (
    <div class="flex items-center justify-between gap-3 rounded-xl bg-charcoal/4 px-3 py-2.5">
      <div class="flex items-center gap-2">
        <span class={`w-2 h-2 rounded-full shrink-0 ${level().dot}`} />
        <span class="text-xs font-semibold text-charcoal/80">{level().label}</span>
      </div>
      <Show when={hasRange()}>
        <span class="text-[10px] font-medium text-charcoal/80">
          Typical ${props.insights.typicalRangeLow}–${props.insights.typicalRangeHigh}
        </span>
      </Show>
    </div>
  );
}

// ─── Chips ────────────────────────────────────────────────────────────────────

// Selected chips get a charcoal edge: the teal fill alone is under 3:1 on paper.
const chipCls = (selected: boolean) =>
  `inline-flex min-h-11 items-center px-3.5 rounded-full text-xs font-bold transition-all border
   ${selected
     ? "bg-teal text-charcoal border-charcoal"
     : "border-charcoal/20 text-charcoal/75 hover:border-teal/50 hover:text-charcoal"
   }`;

function AirportChip(props: {
  airport: NearbyAirport;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onSelect}
      aria-pressed={props.selected}
      class={chipCls(props.selected)}
    >
      {props.airport.code}
      {/* Same colour as the code; the lighter weight sets it apart. */}
      <span class="ml-1 font-normal">
        {props.airport.city}
      </span>
    </button>
  );
}

function AirlineChip(props: {
  name: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onToggle}
      aria-pressed={props.selected}
      class={chipCls(props.selected)}
    >
      {props.name}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type SearchState = "idle" | "locating" | "searching" | "results" | "error";

export function FlightSearch() {
  const [manualInput,      setManualInput    ] = createSignal("");
  const [selectedCode,     setSelectedCode   ] = createSignal("");
  const [nearbyAirports,   setNearbyAirports ] = createSignal<NearbyAirport[]>([]);
  const [selectedAirlines, setSelectedAirlines] = createSignal<Set<string>>(new Set());
  const [offers,           setOffers         ] = createSignal<FlightOffer[]>([]);
  const [insights,         setInsights       ] = createSignal<PriceInsights | null>(null);
  const [state,            setState          ] = createSignal<SearchState>("idle");
  const [errorMsg,         setErrorMsg       ] = createSignal("");
  // The airport the results are for; the input may have changed since.
  const [searchedCode,     setSearchedCode   ] = createSignal("");
  // Read out by screen readers: search progress, results, what "Locate me" found.
  const [announcement,     setAnnouncement   ] = createSignal("");

  let inputEl: HTMLInputElement | undefined;
  let resultsEl: HTMLDivElement | undefined;
  // Bumped whenever the guest acts after tapping "Locate me". A location that
  // arrives for an older run is stale and must not replace their choice.
  let locateRun = 0;

  const origin = () => selectedCode() || manualInput().trim().toUpperCase();
  const canSearch = () => IATA_RE.test(origin()) && state() !== "searching";

  function toggleAirline(code: string) {
    setSelectedAirlines(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function showError(message: string) {
    setErrorMsg(message);
    setAnnouncement(""); // the role="alert" message is read out instead
    setState("error");
  }

  /** The guest typed or picked an airport: drop old results and any pending locate. */
  function airportChanged() {
    locateRun++;
    if (state() === "searching") return;
    setState("idle");
    setAnnouncement("");
  }

  function handleFindLocation() {
    if (!navigator.geolocation) {
      showError("Geolocation isn't supported by your browser.");
      return;
    }
    const run = ++locateRun;
    const isCurrent = () => run === locateRun && state() === "locating";
    setState("locating");
    setAnnouncement("Finding airports near you…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!isCurrent()) return;
        try {
          const airports = await findNearbyAirports(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          if (!isCurrent()) return;
          const nearest = airports[0];
          if (!nearest) {
            showError("No airports found near you. Enter your airport code manually.");
            return;
          }
          setNearbyAirports(airports);
          setSelectedCode(nearest.code);
          setManualInput("");
          setState("idle");
          setAnnouncement(`${count(airports.length, "airport")} near you. ${nearest.code} selected.`);
        } catch {
          if (isCurrent()) showError("Couldn't fetch nearby airports. Enter your airport code manually.");
        }
      },
      (err) => {
        if (!isCurrent()) return;
        showError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Enter your departure airport manually."
            : "Couldn't find your location. Enter your departure airport manually.",
        );
      },
      // A fix from the last few minutes is close enough, and "Finding…" must
      // not hang if the phone never gets one.
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  /** Results start under the fold on a phone: bring them up once they render. */
  function revealResults() {
    requestAnimationFrame(() => {
      if (!resultsEl || resultsEl.getBoundingClientRect().top < window.innerHeight * 0.6) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultsEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  async function handleSearch() {
    if (!canSearch()) return;
    const code = origin();
    locateRun++; // a location arriving now mustn't swap the airport under the results
    // Close the phone keyboard; it would cover the results. Only on touch
    // screens: on a desktop, blurring would drop keyboard focus to <body>.
    if (inputEl && document.activeElement === inputEl && window.matchMedia("(pointer: coarse)").matches) {
      inputEl.blur();
    }
    setSearchedCode(code);
    setState("searching");
    setAnnouncement(`Searching flights from ${code}…`);
    setOffers([]);
    setInsights(null);
    try {
      // The server searches to PHX for the trip dates; we pick origin and airlines.
      const { offers: results, insights: pi } = await searchFlightOffers(code, [...selectedAirlines()]);
      setOffers(results);
      setInsights(pi);
      setState("results");
      setAnnouncement(
        results.length > 0
          ? `${count(results.length, "round trip")} found from ${code}.`
          : `No flights found from ${code}.`,
      );
      revealResults();
    } catch (e) {
      showError(e instanceof Error && e.message ? e.message : "Flight search failed. Try the links below.");
    }
  }

  return (
    <section class="space-y-4">
      {/* Screen reader updates; absolutely positioned, so it never adds a gap. */}
      <p class="sr-only" aria-live="polite">
        {announcement()}
      </p>

      <div class="flex items-baseline justify-between gap-2">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">
          Find flights to {DESTINATION_AIRPORT}
        </h2>
        <p class="text-[10px] text-charcoal/75">
          {shortDate(DEFAULT_INBOUND_DATE)} → {shortDate(DEFAULT_OUTBOUND_DATE)} · round trip
        </p>
      </div>

      <div class="paper-card rounded-xl p-4 space-y-3">

        {/* Airport input row */}
        <div class="flex gap-2">
          <input
            ref={inputEl}
            type="text"
            aria-label="Departure airport code"
            placeholder="Airport, e.g. JFK"
            value={manualInput()}
            onInput={(e) => {
              setManualInput(e.currentTarget.value);
              setSelectedCode("");
              airportChanged();
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            maxLength={3}
            autocomplete="off"
            autocapitalize="characters"
            autocorrect="off"
            enterkeyhint="search"
            spellcheck={false}
            class="min-w-0 flex-1 min-h-11 rounded-xl border border-charcoal/15 bg-white/60
                   px-3 text-base font-medium text-charcoal uppercase
                   placeholder:normal-case placeholder:text-charcoal/35
                   focus:outline-2 focus:outline-offset-2 focus:outline-charcoal
                   focus:ring-2 focus:ring-teal/40 focus:border-teal/50
                   transition-all"
          />
          <button
            type="button"
            onClick={handleFindLocation}
            disabled={state() === "locating" || state() === "searching"}
            class="shrink-0 min-h-11 rounded-xl border border-charcoal/15 px-3
                   flex items-center gap-1.5 text-xs font-semibold text-charcoal/75
                   hover:border-teal/50 hover:text-charcoal disabled:opacity-40
                   transition-all"
          >
            <LocationIcon />
            <Show when={state() === "locating"} fallback="Locate me">
              Finding…
            </Show>
          </button>
        </div>

        {/* Nearby airport chips */}
        <Show when={nearbyAirports().length > 0}>
          <div class="flex flex-wrap gap-2">
            <For each={nearbyAirports()}>
              {(ap) => (
                <AirportChip
                  airport={ap}
                  selected={selectedCode() === ap.code}
                  onSelect={() => {
                    setSelectedCode(ap.code);
                    setManualInput("");
                    airportChanged();
                  }}
                />
              )}
            </For>
          </div>
        </Show>

        {/* Airline filter */}
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-wider text-charcoal/75 mb-2">
            Airlines — tap to filter
          </p>
          <div class="flex flex-wrap gap-2">
            <For each={SEARCH_AIRLINES}>
              {(al) => (
                <AirlineChip
                  name={al.name}
                  selected={selectedAirlines().has(al.code)}
                  onToggle={() => toggleAirline(al.code)}
                />
              )}
            </For>
          </div>
        </div>

        {/* Search button */}
        <button
          type="button"
          onClick={handleSearch}
          disabled={!canSearch()}
          class="w-full min-h-11 rounded-xl bg-charcoal text-sm font-bold text-cream
                 disabled:opacity-35 hover:bg-charcoal/85
                 active:scale-[0.98] transition-all"
        >
          {state() === "searching" ? "Searching…" : "Search flights"}
        </button>

        {/* Error: charcoal with an orange marker, since orange is too light for small text. */}
        <Show when={state() === "error"}>
          <p role="alert" class="flex items-start justify-center gap-1.5 text-xs font-semibold text-charcoal/80">
            <AlertIcon class="mt-px h-3.5 w-3.5 shrink-0 text-orange" />
            <span>{errorMsg()}</span>
          </p>
        </Show>
      </div>

      {/* Results */}
      <Show when={state() === "results"}>
        <div ref={resultsEl} class="scroll-mt-20">
          <Show
            when={offers().length > 0}
            fallback={
              <p class="text-sm text-center text-charcoal/75 py-4">
                No flights found from{" "}
                <span class="font-bold">{searchedCode()}</span> on {shortDate(DEFAULT_INBOUND_DATE)}.
                Try a nearby airport or use the search links below.
              </p>
            }
          >
            <div class="space-y-3">
              <Show when={insights()}>
                {(pi) => <PriceInsightsBanner insights={pi()} />}
              </Show>
              <For each={offers()}>
                {(offer) => <FlightResultCard offer={offer} />}
              </For>
              <p class="text-xs text-charcoal/75 text-center">
                Round-trip prices from Google Flights · local times · tap to book
              </p>
            </div>
          </Show>
        </div>
      </Show>
    </section>
  );
}
