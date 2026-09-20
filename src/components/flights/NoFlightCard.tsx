import type { GuestWithoutFlight } from "~/lib/types";

interface Props {
  guest: GuestWithoutFlight;
}

export function NoFlightCard(props: Props) {
  return (
    <div class="paper-card rounded-xl p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-base font-bold text-charcoal">{props.guest.guestName}</p>
          <p class="text-xs text-charcoal/50 mt-0.5">No flight added yet</p>
        </div>
        <a
          href="https://www.google.com/flights"
          target="_blank"
          rel="noopener noreferrer"
          class="shrink-0 rounded-lg bg-orange px-3 py-1.5 text-xs font-bold text-cream"
        >
          Find a flight
        </a>
      </div>
    </div>
  );
}
