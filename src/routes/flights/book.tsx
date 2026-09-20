// Fly-in destination: Phoenix Sky Harbor (PHX) — ~15 min from Scottsdale
// Trip window: arrive Apr 7–8, depart Apr 12–13

const DESTINATION = "PHX";
const ARRIVE_DATE = "2027-04-08";
const DEPART_DATE = "2027-04-12";

const BOOKING_LINKS = [
  {
    label: "Google Flights",
    description: "Fastest way to compare prices across all airlines",
    href: `https://www.google.com/travel/flights#flt=.${DESTINATION}.${ARRIVE_DATE}*${DESTINATION}..${DEPART_DATE}`,
    icon: "G",
    accent: "bg-white border border-charcoal/15 text-charcoal",
  },
  {
    label: "Kayak",
    description: "Set a price alert and get notified when fares drop",
    href: `https://www.kayak.com/flights/ANY-${DESTINATION}/${ARRIVE_DATE}`,
    icon: "K",
    accent: "bg-[#FF690F] text-white",
  },
  {
    label: "Expedia",
    description: "Bundle with a rental car if you need one",
    href: `https://www.expedia.com/Flights-Search?trip=oneway&leg1=from%3A(anywhere)%2Cto%3A${DESTINATION}%2Cdeparture%3A04%2F08%2F2027&passengers=adults%3A1`,
    icon: "E",
    accent: "bg-[#00355F] text-white",
  },
];

function InfoRow(props: { label: string; value: string }) {
  return (
    <div class="flex justify-between items-baseline py-2.5 border-b border-charcoal/8 last:border-0">
      <span class="text-xs font-semibold uppercase tracking-wider text-charcoal/40">
        {props.label}
      </span>
      <span class="text-sm font-bold text-charcoal">{props.value}</span>
    </div>
  );
}

export default function BookFlightPage() {
  return (
    <div class="mx-auto max-w-lg px-4 py-6 space-y-6">

      {/* Back */}
      <a href="/flights" class="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/50 hover:text-charcoal transition-colors">
        <svg viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        Back to flights
      </a>

      {/* Header */}
      <div>
        <p class="text-xs font-bold uppercase tracking-widest text-charcoal/40 mb-1">
          Destination
        </p>
        <h1 class="text-3xl font-black text-charcoal leading-tight">
          Phoenix Sky Harbor
        </h1>
        <p class="text-base font-semibold text-teal mt-0.5">PHX · Scottsdale, AZ</p>
      </div>

      {/* Trip info */}
      <div class="paper-card rounded-xl px-4 py-1">
        <InfoRow label="Fly in"  value="Apr 7 – 8, 2027" />
        <InfoRow label="Fly out" value="Apr 12 – 13, 2027" />
        <InfoRow label="Airport" value="Phoenix Sky Harbor (PHX)" />
        <InfoRow label="Distance to venue" value="~15 min drive" />
      </div>

      {/* Heads up */}
      <div class="rounded-xl bg-teal/10 border border-teal/25 px-4 py-3">
        <p class="text-xs font-semibold text-charcoal/70">
          Fly into <span class="text-teal font-bold">PHX</span> — it's the closest major airport
          to Scottsdale and has non-stops from most US cities.
          Avoid Tucson (TUS) and Flagstaff (FLG) — both are 90+ min away.
        </p>
      </div>

      {/* Booking links */}
      <section>
        <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/40 mb-3">
          Search flights
        </p>
        <div class="space-y-3">
          {BOOKING_LINKS.map(link => (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              class="paper-card rounded-xl p-4 flex items-center gap-4 hover:opacity-80 active:scale-[0.98] transition-all block"
            >
              <div class={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${link.accent}`}>
                {link.icon}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-charcoal">{link.label}</p>
                <p class="text-xs text-charcoal/50 mt-0.5">{link.description}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-charcoal/25 shrink-0">
                <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8l-3.528-3.536-5.656 5.658-1.415-1.415 5.657-5.657L13 3h8z" />
              </svg>
            </a>
          ))}
        </div>
      </section>

      {/* Once booked */}
      <div class="rounded-xl bg-orange/10 border border-orange/20 px-4 py-3">
        <p class="text-xs font-semibold text-charcoal/70">
          Once you book, add your flight number in the tracker so the crew knows when you land.
        </p>
      </div>

    </div>
  );
}
