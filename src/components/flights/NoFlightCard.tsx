import type { GuestWithoutFlight } from "~/lib/types";

interface Props {
  guest: GuestWithoutFlight;
}

export function NoFlightCard(props: Props) {
  return (
    <div class="paper-card rounded-xl p-4 opacity-60">
      <p class="text-base font-bold text-charcoal">{props.guest.guestName}</p>
      <p class="text-xs text-charcoal/50 mt-0.5">No flight provided</p>
    </div>
  );
}
