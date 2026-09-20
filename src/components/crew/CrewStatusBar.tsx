import { For, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { crew } from "~/lib/data/crew";
import { MockTransport } from "~/lib/status/mock-transport";
import type { TravelStatus } from "~/lib/status/types";
import type { CrewMember } from "~/lib/data/crew";

// Module-level singleton — this module is only ever loaded client-side via
// clientOnly(), so the transport is safe as a browser-only singleton.
// Swap MockTransport for SSETransport / PusherTransport here when ready.
const transport = new MockTransport();

const STATUS_CYCLE: TravelStatus[] = ["home", "car", "plane", "arrived"];

const STATUS_CONFIG: Record<TravelStatus, { ring: string; badge: string; label: string }> = {
  home:    { ring: "border-charcoal/25", badge: "border-charcoal/25 text-charcoal/40", label: "Home"    },
  car:     { ring: "border-orange",      badge: "border-orange text-orange",           label: "Driving" },
  plane:   { ring: "border-teal",        badge: "border-teal text-teal",               label: "Flying"  },
  arrived: { ring: "border-teal",        badge: "border-teal text-teal",               label: "Here!"   },
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-2.5 h-2.5">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-2.5 h-2.5">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-2.5 h-2.5">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" class="w-2.5 h-2.5">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function StatusIcon(props: { status: TravelStatus }) {
  switch (props.status) {
    case "home":    return <HomeIcon />;
    case "car":     return <CarIcon />;
    case "plane":   return <PlaneIcon />;
    case "arrived": return <CheckIcon />;
  }
}

function AvatarBadge(props: {
  member: CrewMember;
  status: TravelStatus;
  onClick: () => void;
}) {
  const cfg = () => STATUS_CONFIG[props.status];

  return (
    <button
      type="button"
      onClick={props.onClick}
      class="flex flex-col items-center gap-2 focus:outline-none group"
      title={`${props.member.name} — ${cfg().label}`}
    >
      <div class="relative">
        {/* Avatar ring */}
        <div
          class={`w-12 h-12 rounded-full border-[3px] ${cfg().ring}
                  paper-card flex items-center justify-center
                  transition-colors duration-300
                  group-active:scale-95 transition-transform`}
        >
          <span class="text-xs font-bold text-charcoal/70 select-none">
            {props.member.initials}
          </span>
        </div>

        {/* Status badge — sits at 6 o'clock, half inside / half outside the ring */}
        <div
          class={`absolute -bottom-[9px] left-1/2 -translate-x-1/2
                  w-[18px] h-[18px] rounded-full
                  border-[1.5px] ${cfg().badge}
                  bg-cream flex items-center justify-center
                  transition-colors duration-300`}
        >
          <StatusIcon status={props.status} />
        </div>
      </div>

      {/* Name */}
      <span class="text-[10px] font-medium text-charcoal/50 leading-none pt-1">
        {props.member.name}
      </span>
    </button>
  );
}

function arrivedCount(statuses: Record<string, TravelStatus>) {
  return Object.values(statuses).filter(s => s === "arrived").length;
}

export function CrewStatusBar() {
  const initial = Object.fromEntries(crew.map(m => [m.id, m.initialStatus]));
  const [statuses, setStatuses] = createStore<Record<string, TravelStatus>>(initial);

  const unsubscribe = transport.subscribe(({ guestId, status }) => {
    setStatuses(guestId, status);
  });
  onCleanup(unsubscribe);

  function cycle(member: CrewMember) {
    const current = statuses[member.id];
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    transport.publish(member.id, next);
  }

  return (
    <div class="mx-auto max-w-lg px-4 pt-4">
      <div class="paper-card rounded-xl px-4 py-4">
        <div class="flex items-center justify-between mb-4">
          <p class="text-xs font-semibold uppercase tracking-widest text-charcoal/40">
            Who's here
          </p>
          <p class="text-xs font-semibold text-teal">
            {arrivedCount(statuses)} / {crew.length} arrived
          </p>
        </div>

        {/* Scrollable avatar row */}
        <div class="overflow-x-auto -mx-1 px-1 pb-3">
          <div class="flex gap-4 w-max">
            <For each={crew}>{(member) =>
              <AvatarBadge
                member={member}
                status={statuses[member.id]}
                onClick={() => cycle(member)}
              />
            }</For>
          </div>
        </div>
      </div>
    </div>
  );
}
