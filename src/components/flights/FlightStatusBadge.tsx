import type { FlightStatus } from "~/lib/types";

interface Props {
  status: FlightStatus;
}

const config: Record<FlightStatus, { label: string; classes: string; pulse: boolean }> = {
  in_air:   { label: "In the air",  classes: "bg-teal/15 text-teal",           pulse: true  },
  boarding: { label: "Boarding",    classes: "bg-orange/15 text-orange",        pulse: true  },
  upcoming: { label: "Upcoming",    classes: "bg-charcoal/8 text-charcoal/60",  pulse: false },
  delayed:  { label: "Delayed",     classes: "bg-orange/20 text-orange",        pulse: false },
  landed:   { label: "Landed",      classes: "bg-charcoal/8 text-charcoal/40",  pulse: false },
};

export function FlightStatusBadge(props: Props) {
  const c = () => config[props.status];

  return (
    <span class={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c().classes}`}>
      {c().pulse && (
        <span class="relative flex h-1.5 w-1.5">
          <span class="absolute inline-flex h-full w-full rounded-full bg-current animate-ripple opacity-75" />
          <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {c().label}
    </span>
  );
}
