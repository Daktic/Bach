import type { GuestWithoutFlight } from "~/lib/types";

interface Props {
  guest: GuestWithoutFlight;
}

/** Another guest who hasn't added a flight yet (FL-5). */
export function NoFlightCard(props: Props) {
  return (
    <div class="paper-card flex items-center justify-between gap-3 rounded-xl px-4 py-3">
      <p class="min-w-0 truncate text-base font-bold text-charcoal">{props.guest.guestName}</p>
      <p class="shrink-0 text-xs text-charcoal/75">No flight yet</p>
    </div>
  );
}
