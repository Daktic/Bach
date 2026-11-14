import type { GuestWithoutFlight } from "~/lib/types";
import { CarIcon } from "./icons";

interface Props {
  guest: GuestWithoutFlight;
}

/** Another guest who's driving in rather than flying (FL-9). */
export function DrivingCard(props: Props) {
  return (
    <div class="paper-card flex items-center justify-between gap-3 rounded-xl px-4 py-3">
      <p class="min-w-0 truncate text-base font-bold text-charcoal">{props.guest.guestName}</p>
      <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange/10 px-2.5 py-0.5 text-xs font-semibold text-charcoal/80">
        <CarIcon class="h-3.5 w-3.5 text-orange" />
        Driving in
      </span>
    </div>
  );
}
