import { createSignal, For, Show } from "solid-js";
import { findNearbyAirports, resolveBookingUrl, searchFlightOffers } from "~/lib/api/amadeus";
import type { FlightOffer, NearbyAirport, PriceInsights } from "~/lib/api/amadeus";

const TRIP_DATE   = "2027-04-08";
const RETURN_DATE = "2027-04-12";

// ─── Airline options ──────────────────────────────────────────────────────────

const AIRLINES = [
  { code: "AA", name: "American"  },
  { code: "AS", name: "Alaska"    },
  { code: "B6", name: "JetBlue"   },
  { code: "DL", name: "Delta"     },
  { code: "F9", name: "Frontier"  },
  { code: "G4", name: "Allegiant" },
  { code: "NK", name: "Spirit"    },
  { code: "UA", name: "United"    },
  { code: "WN", name: "Southwest" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5 text-charcoal/30 shrink-0">
      <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8l-3.528-3.536-5.656 5.658-1.415-1.415 5.657-5.657L13 3h8z" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ─── Flight result card ───────────────────────────────────────────────────────

function FlightResultCard(props: { offer: FlightOffer }) {
  const [booking, setBooking] = createSignal(false);
  const o = props.offer;

  async function handleBook(e: MouseEvent) {
    e.preventDefault();
    if (booking()) return;
    setBooking(true);
    try {
      const url = await resolveBookingUrl(o.bookingToken);
      window.open(url ?? o.bookingUrl, "_blank", "noopener,noreferrer");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleBook}
      onKeyDown={(e) => e.key === "Enter" && handleBook(e as any)}
      class="paper-card rounded-xl p-4 flex items-center gap-3
             hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer
             select-none"
    >
      {/* Price */}
      <div class="shrink-0 text-center w-14">
        <p class="text-xl font-black text-charcoal leading-none">${o.price}</p>
        <p class="text-[10px] text-charcoal/40 mt-0.5">RT · USD</p>
      </div>

      <div class="w-px self-stretch bg-charcoal/10" />

      {/* Flight details */}
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-charcoal/50 truncate">
          {o.airlineName} · {o.flightNumber}
        </p>
        <div class="flex items-baseline gap-2 mt-1">
          <span class="text-base font-black text-charcoal">{o.origin}</span>
          <span class="text-charcoal/25 text-xs">→</span>
          <span class="text-base font-black text-charcoal">{o.destination}</span>
        </div>
        <p class="text-xs text-charcoal/45 mt-0.5">
          {fmtTime(o.departsAt)} → {fmtTime(o.arrivesAt)} · {o.duration}
          {o.stops === 0
            ? <span class="ml-1.5 text-teal font-semibold">· Non-stop</span>
            : <span class="ml-1.5 text-charcoal/40">· {o.stops} stop{o.stops > 1 ? "s" : ""}</span>
          }
        </p>
      </div>

      <Show when={booking()} fallback={<ExternalIcon />}>
        <span class="text-[10px] text-charcoal/35 shrink-0 animate-pulse">loading…</span>
      </Show>
    </div>
  );
}

// ─── Price insights banner ────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  low:     { label: "Lower than usual",  dot: "bg-teal",        text: "text-teal"        },
  typical: { label: "Typical price",     dot: "bg-charcoal/30", text: "text-charcoal/50" },
  high:    { label: "Higher than usual", dot: "bg-orange",      text: "text-orange"      },
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
    <div class="flex items-center justify-between rounded-xl bg-charcoal/4 px-3 py-2.5">
      <div class="flex items-center gap-2">
        <span class={`w-2 h-2 rounded-full shrink-0 ${level().dot}`} />
        <span class={`text-xs font-semibold ${level().text}`}>{level().label}</span>
      </div>
      <Show when={hasRange()}>
        <span class="text-[10px] font-medium text-charcoal/65">
          Typical ${props.insights.typicalRangeLow}–${props.insights.typicalRangeHigh}
        </span>
      </Show>
    </div>
  );
}

// ─── Airport chip ─────────────────────────────────────────────────────────────

function AirportChip(props: {
  airport: NearbyAirport;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onSelect}
      class={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border
              ${props.selected
                ? "bg-teal text-charcoal border-teal"
                : "border-charcoal/20 text-charcoal/60 hover:border-teal/50 hover:text-charcoal"
              }`}
    >
      {props.airport.code}
      <span class={`ml-1 font-normal ${props.selected ? "text-charcoal/70" : "text-charcoal/35"}`}>
        {props.airport.city}
      </span>
    </button>
  );
}

// ─── Airline chip ─────────────────────────────────────────────────────────────

function AirlineChip(props: {
  code: string;
  name: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onToggle}
      class={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border
              ${props.selected
                ? "bg-teal text-charcoal border-teal"
                : "border-charcoal/20 text-charcoal/60 hover:border-teal/50 hover:text-charcoal"
              }`}
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

  const origin = () => selectedCode() || manualInput().trim().toUpperCase().slice(0, 4);

  function toggleAirline(code: string) {
    setSelectedAirlines(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  async function handleFindLocation() {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation isn't supported by your browser.");
      setState("error");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const airports = await findNearbyAirports(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          setNearbyAirports(airports);
          if (airports[0]) {
            setSelectedCode(airports[0].code);
            setManualInput("");
          }
          setState("idle");
        } catch {
          setErrorMsg("Couldn't fetch nearby airports. Enter your airport code manually.");
          setState("error");
        }
      },
      () => {
        setErrorMsg("Location access denied. Enter your departure airport manually.");
        setState("error");
      },
    );
  }

  async function handleSearch() {
    const code = origin();
    if (!code || code.length < 3) return;
    setState("searching");
    setOffers([]);
    setInsights(null);
    try {
      const airlineCodes = [...selectedAirlines()];
      const { offers: results, insights: pi } = await searchFlightOffers(code, TRIP_DATE, RETURN_DATE, "PHX", airlineCodes);
      setOffers(results);
      setInsights(pi);
      setState("results");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Flight search failed. Try the links below.");
      setState("error");
    }
  }

  return (
    <section class="space-y-4">
      <div class="flex items-baseline justify-between">
        <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/40">
          Find flights to PHX
        </p>
        <p class="text-[10px] text-charcoal/35">Apr 8 → Apr 12 · round trip</p>
      </div>

      <div class="paper-card rounded-xl p-4 space-y-3">

        {/* Airport input row */}
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Departure airport (e.g. JFK)"
            value={manualInput()}
            onInput={(e) => {
              setManualInput(e.currentTarget.value);
              setSelectedCode("");
              if (state() === "results" || state() === "error") setState("idle");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            maxLength={4}
            spellcheck={false}
            class="flex-1 rounded-xl border border-charcoal/15 bg-white/60
                   px-3 py-2.5 text-sm font-medium text-charcoal uppercase
                   placeholder:normal-case placeholder:text-charcoal/35
                   focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal/50
                   transition-all"
          />
          <button
            type="button"
            onClick={handleFindLocation}
            disabled={state() === "locating"}
            title="Find my location"
            class="shrink-0 rounded-xl border border-charcoal/15 px-3
                   flex items-center gap-1.5 text-xs font-semibold text-charcoal/55
                   hover:border-teal/50 hover:text-teal disabled:opacity-40
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
                    if (state() === "results" || state() === "error") setState("idle");
                  }}
                />
              )}
            </For>
          </div>
        </Show>

        {/* Airline filter */}
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-wider text-charcoal/35 mb-2">
            Airlines — tap to filter
          </p>
          <div class="flex flex-wrap gap-2">
            <For each={AIRLINES}>
              {(al) => (
                <AirlineChip
                  code={al.code}
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
          disabled={!origin() || origin().length < 3 || state() === "searching"}
          class="w-full rounded-xl bg-charcoal py-2.5 text-sm font-bold text-cream
                 disabled:opacity-35 hover:bg-charcoal/85
                 active:scale-[0.98] transition-all"
        >
          {state() === "searching" ? "Searching…" : "Search flights"}
        </button>

        {/* Error */}
        <Show when={state() === "error"}>
          <p class="text-xs font-semibold text-orange text-center">{errorMsg()}</p>
        </Show>
      </div>

      {/* Results */}
      <Show when={state() === "results"}>
        <Show
          when={offers().length > 0}
          fallback={
            <p class="text-sm text-center text-charcoal/45 py-4">
              No flights found from{" "}
              <span class="font-bold">{origin()}</span> on Apr 8.
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
            <p class="text-[10px] text-charcoal/30 text-center">
              Round-trip prices from Google Flights · tap to book direct
            </p>
          </div>
        </Show>
      </Show>
    </section>
  );
}
