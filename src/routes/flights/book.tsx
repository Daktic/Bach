import { clientOnly } from "@solidjs/start";
import { For } from "solid-js";
import { findAirport } from "~/lib/airports";
import { DEFAULT_INBOUND_DATE, DEFAULT_OUTBOUND_DATE, DESTINATION_AIRPORT } from "~/lib/config";
import { formatCalendarDate } from "~/lib/zoned-time";

const FlightSearch = clientOnly(() =>
  import("~/components/flights/FlightSearch").then(m => ({ default: m.FlightSearch }))
);

const AIRPORT_NAME = findAirport(DESTINATION_AIRPORT)?.name ?? DESTINATION_AIRPORT;
// "Phoenix Sky Harbor" fits the heading on one line at 375 px.
const AIRPORT_HEADING = AIRPORT_NAME.replace(/\s+Intl\.?$/, "");

const tripDate = (date: string) =>
  formatCalendarDate(date, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

// Expedia wants MM/DD/YYYY.
const [inYear, inMonth, inDay] = DEFAULT_INBOUND_DATE.split("-");
const EXPEDIA_DATE = encodeURIComponent(`${inMonth}/${inDay}/${inYear}`);

const BOOKING_LINKS = [
  {
    label: "Google Flights",
    description: "Compare prices across all airlines",
    href: `https://www.google.com/travel/flights#flt=.${DESTINATION_AIRPORT}.${DEFAULT_INBOUND_DATE}*${DESTINATION_AIRPORT}..${DEFAULT_OUTBOUND_DATE}`,
    icon: "G",
    accent: "bg-white border border-charcoal/15 text-charcoal",
  },
  {
    label: "Kayak",
    description: "Set a price alert — get notified when fares drop",
    href: `https://www.kayak.com/flights/ANY-${DESTINATION_AIRPORT}/${DEFAULT_INBOUND_DATE}`,
    icon: "K",
    accent: "bg-[#FF690F] text-white",
  },
  {
    label: "Expedia",
    description: "Bundle with a rental car if you need one",
    href: `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from%3A(anywhere)%2Cto%3A${DESTINATION_AIRPORT}%2Cdeparture%3A${EXPEDIA_DATE}&passengers=adults%3A1`,
    icon: "E",
    accent: "bg-[#00355F] text-white",
  },
];

// The only sign the card opens another site, so it needs 3:1.
function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-3.5 h-3.5 text-charcoal/75 shrink-0">
      <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8l-3.528-3.536-5.656 5.658-1.415-1.415 5.657-5.657L13 3h8z" />
    </svg>
  );
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <div class="flex justify-between items-baseline gap-4 py-2.5 border-b border-charcoal/8 last:border-0">
      <span class="shrink-0 text-xs font-semibold uppercase tracking-wider text-charcoal/75">
        {props.label}
      </span>
      <span class="text-right text-sm font-bold text-charcoal">{props.value}</span>
    </div>
  );
}

/** Roughly the search's height, so the page doesn't jump when it loads. */
function SearchPlaceholder() {
  return (
    <section class="space-y-4" aria-hidden="true">
      <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">
        Find flights to {DESTINATION_AIRPORT}
      </p>
      <div class="paper-card rounded-xl h-80" />
    </section>
  );
}

export default function BookFlightPage() {
  return (
    <div class="mx-auto max-w-lg px-4 py-6 space-y-6">

      {/* Back */}
      <a
        href="/flights"
        class="-ml-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-xs font-semibold text-charcoal/75 hover:text-charcoal transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="w-3.5 h-3.5">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        Back to flights
      </a>

      {/* Header */}
      <div>
        <p class="text-xs font-bold uppercase tracking-widest text-charcoal/75 mb-1">
          Destination
        </p>
        <h1 class="text-3xl font-black text-charcoal leading-tight">{AIRPORT_HEADING}</h1>
        <p class="text-base font-semibold text-charcoal/80 mt-0.5">{DESTINATION_AIRPORT} · Scottsdale, AZ</p>
      </div>

      {/* Live flight search */}
      <FlightSearch fallback={<SearchPlaceholder />} />

      {/* Trip info */}
      <div class="paper-card rounded-xl px-4 py-1">
        <InfoRow label="Fly in"         value={tripDate(DEFAULT_INBOUND_DATE)} />
        <InfoRow label="Fly out"        value={tripDate(DEFAULT_OUTBOUND_DATE)} />
        <InfoRow label="Airport"        value={`${AIRPORT_NAME} (${DESTINATION_AIRPORT})`} />
        <InfoRow label="Drive to venue" value="~15 min" />
      </div>

      {/* Airport heads up */}
      <div class="rounded-xl bg-teal/10 border border-teal/25 px-4 py-3">
        <p class="text-xs font-semibold text-charcoal/80">
          Fly into <span class="font-black text-charcoal">{DESTINATION_AIRPORT}</span> — non-stops from most US cities,
          15 min to the house. Avoid Tucson (TUS) and Flagstaff (FLG) — both are 90+ min away.
        </p>
      </div>

      {/* Search links */}
      <section>
        <h2 class="text-xs font-semibold uppercase tracking-widest text-charcoal/75 mb-3">
          Search flights
        </h2>
        <div class="space-y-3">
          <For each={BOOKING_LINKS}>
            {(link) => (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                class="paper-card rounded-xl p-4 flex items-center gap-4 hover:-translate-y-px active:scale-[0.98] transition-all"
              >
                <div class={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${link.accent}`}>
                  {link.icon}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-charcoal">{link.label}</p>
                  <p class="text-xs text-charcoal/75 mt-0.5">{link.description}</p>
                </div>
                <ExternalIcon />
              </a>
            )}
          </For>
        </div>
      </section>

      {/* Once booked reminder. Flights saved on /me stay on that phone until
          they sync (FL-2), so don't promise the crew will see them yet. */}
      <div class="rounded-xl bg-orange/10 border border-orange/20 px-4 pt-3 pb-1">
        <p class="text-xs font-semibold text-charcoal/80">
          Once you book, add your flight on your profile. For now it's saved on your phone only,
          so text the organiser your flight number too.
        </p>
        <a
          href="/me#flight-section"
          class="-ml-2 inline-flex min-h-11 items-center px-2 text-xs font-bold text-charcoal underline decoration-orange decoration-2 underline-offset-2"
        >
          Add your flight
        </a>
      </div>

    </div>
  );
}
