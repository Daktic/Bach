import { Show } from "solid-js";
import type { FlightStatus } from "~/lib/types";

interface Props {
  status: FlightStatus;
}

// Teal and orange are too light for small text on cream, so the label is
// charcoal and the colour goes on the tint and the dot.
const config: Record<FlightStatus, { label: string; classes: string; dot?: string; pulse?: boolean }> = {
  in_air:   { label: "In the air",  classes: "bg-teal/15 text-charcoal",        dot: "bg-teal",   pulse: true },
  layover:  { label: "Layover",     classes: "bg-orange/15 text-charcoal",      dot: "bg-orange" },
  boarding: { label: "Boarding",    classes: "bg-orange/15 text-charcoal",      dot: "bg-orange", pulse: true },
  upcoming: { label: "Upcoming",    classes: "bg-charcoal/8 text-charcoal/80" },
  delayed:  { label: "Delayed",     classes: "bg-orange/20 text-charcoal",      dot: "bg-orange" },
  landed:   { label: "Landed",      classes: "bg-charcoal/8 text-charcoal/80" },
};

export function FlightStatusBadge(props: Props) {
  const c = () => config[props.status];

  return (
    <span class={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c().classes}`}>
      <Show when={c().dot}>
        <span class="relative flex h-1.5 w-1.5" aria-hidden="true">
          <Show when={c().pulse}>
            <span class={`absolute inline-flex h-full w-full rounded-full animate-ripple opacity-75 ${c().dot}`} />
          </Show>
          <span class={`relative inline-flex h-1.5 w-1.5 rounded-full ${c().dot}`} />
        </span>
      </Show>
      {c().label}
    </span>
  );
}
