import { createAsync } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { createStore } from "solid-js/store";
import { hasNoArrivalPlan, nextTravelStatus } from "~/components/flights/flight-board";
import { CarIcon, CheckIcon, HomeIcon, PlaneIcon } from "~/components/flights/icons";
import { getCrew } from "~/lib/api/crew";
import { loadMyProfile, onMyProfileChange } from "~/lib/client/my-profile";
import { EMPTY_TRAVEL, loadMyTravel, onMyTravelChange, type MyTravel } from "~/lib/client/my-travel";
import { meQuery } from "~/lib/queries";
import { ServerTransport } from "~/lib/status/server-transport";
import type { StatusTransport } from "~/lib/status/types";
import type { CrewMemberView, TravelStatus } from "~/lib/types";

// One transport per page load; this module only runs in the browser
// (clientOnly). Statuses are saved to the database and polled (FL-8).
const transport: StatusTransport = new ServerTransport();

// Badge glyphs are charcoal: teal and orange are too light to read as small
// marks on cream, so the colour goes on the ring and the badge border.
const STATUS_CONFIG: Record<TravelStatus, { ring: string; badge: string; label: string }> = {
  home:    { ring: "border-charcoal/25", badge: "border-charcoal/40 bg-cream text-charcoal/70", label: "Home"    },
  car:     { ring: "border-orange",      badge: "border-orange bg-cream text-charcoal",          label: "Driving" },
  plane:   { ring: "border-teal",        badge: "border-teal bg-cream text-charcoal",            label: "Flying"  },
  // Filled, so "Arrived" can't be mistaken for "Flying" at a glance.
  arrived: { ring: "border-teal",        badge: "border-teal bg-teal text-charcoal",             label: "Arrived" },
};

const NO_FLIGHT = { ring: "border-charcoal/15", label: "No flight" };

function StatusIcon(props: { status: TravelStatus }) {
  return (
    <Switch>
      <Match when={props.status === "home"}><HomeIcon class="h-3.5 w-3.5" /></Match>
      <Match when={props.status === "car"}><CarIcon class="h-3.5 w-3.5" /></Match>
      <Match when={props.status === "plane"}><PlaneIcon class="h-3.5 w-3.5" /></Match>
      <Match when={props.status === "arrived"}><CheckIcon class="h-3.5 w-3.5" /></Match>
    </Switch>
  );
}

/**
 * Decorative: the name and status are always written out next to it. A guest
 * with no flight gets a faded circle, never faded text.
 */
function AvatarCircle(props: {
  initials: string;
  photo?: string | null;
  status: TravelStatus;
  noFlight: boolean;
  showBadge: boolean;
}) {
  const [broken, setBroken] = createSignal(false);
  const ring = () => (props.noFlight ? NO_FLIGHT.ring : STATUS_CONFIG[props.status].ring);

  return (
    <div class="relative" aria-hidden="true">
      <div
        class={`paper-card flex h-12 w-12 items-center justify-center overflow-hidden rounded-full
                border-[3px] transition-colors duration-300 ${ring()} ${props.noFlight ? "opacity-40" : ""}`}
      >
        <Show
          when={props.photo && !broken()}
          fallback={<span class="select-none text-xs font-bold text-charcoal/75">{props.initials}</span>}
        >
          <img
            src={props.photo!}
            alt=""
            referrerpolicy="no-referrer"
            onError={() => setBroken(true)}
            class="h-full w-full object-cover"
          />
        </Show>
      </div>

      <Show when={props.showBadge}>
        <div
          class={`absolute -bottom-[11px] left-1/2 flex h-[22px] w-[22px] -translate-x-1/2
                  items-center justify-center rounded-full border-[1.5px]
                  transition-colors duration-300 ${STATUS_CONFIG[props.status].badge}`}
        >
          <StatusIcon status={props.status} />
        </div>
      </Show>
    </div>
  );
}

/** Two short lines under an avatar: who, then their status in words (FL-7). */
function Caption(props: { name: string; nameClass: string; status: string }) {
  return (
    <span class="flex w-full flex-col items-center gap-0.5 pt-1.5 text-[10px] leading-3">
      <span class={`max-w-full truncate ${props.nameClass}`}>{props.name}</span>
      <span class="max-w-full truncate text-charcoal/75">{props.status}</span>
    </span>
  );
}

function readMyTravel(guestId: string): MyTravel {
  try {
    return loadMyTravel(guestId);
  } catch {
    return EMPTY_TRAVEL; // storage blocked
  }
}

export function CrewStatusBar() {
  const crew = createAsync(() => getCrew());
  const me = createAsync(() => meQuery());

  // Statuses heard on the transport since load; the server's value until then.
  const [live, setLive] = createStore<Record<string, TravelStatus>>({});
  const [myTravel, setMyTravel] = createSignal<MyTravel>(EMPTY_TRAVEL);
  const [myPhoto, setMyPhoto] = createSignal<string | null>(null);

  onMount(() => {
    onCleanup(transport.subscribe(({ guestId, status }) => setLive(guestId, status)));
  });

  // What the viewer saved on /me counts for their own avatar (FL-9).
  createEffect(() => {
    const viewer = me();
    if (!viewer) return;
    setMyTravel(readMyTravel(viewer.id));
    const applyPhoto = () => setMyPhoto(loadMyProfile(viewer.id).avatarDataUrl ?? viewer.image);
    applyPhoto();
    onCleanup(onMyProfileChange(viewer.id, applyPhoto));
    onCleanup(onMyTravelChange(viewer.id, () => setMyTravel(readMyTravel(viewer.id))));
  });

  const isMe = (m: CrewMemberView) => m.id === me()?.id;
  const statusOf = (m: CrewMemberView): TravelStatus => live[m.id] ?? m.status;
  const noFlight = (m: CrewMemberView) => hasNoArrivalPlan(m, isMe(m) ? myTravel() : undefined);

  // The viewer first, so they can find their own avatar.
  const members = createMemo(() => {
    const list = crew() ?? [];
    return [...list.filter(isMe), ...list.filter((m) => !isMe(m))];
  });
  const arrived = () => members().filter((m) => statusOf(m) === "arrived").length;
  const meInCrew = () => members().some(isMe);

  // FL-8: only the viewer's own status can change, and only from this button.
  function cycleMyStatus(m: CrewMemberView) {
    if (!isMe(m)) return;
    void transport.publish(m.id, nextTravelStatus(statusOf(m)));
  }

  return (
    <div class="mx-auto max-w-lg px-4 pt-4">
      <div class="paper-card rounded-xl px-4 py-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-charcoal/75">
            Who's here
          </h2>
          <p class="flex items-center gap-1.5 text-xs font-semibold text-charcoal/80">
            {/* A small copy of the "Arrived" badge. */}
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-teal text-charcoal" aria-hidden="true">
              <CheckIcon class="h-3 w-3" />
            </span>
            {arrived()} / {members().length} arrived
          </p>
        </div>

        {/* The row scrolls sideways inside the card, never the page. */}
        <div class="relative -mx-1 overflow-x-auto px-1 pb-3">
          <ul class="flex w-max gap-3">
            <For each={members()}>
              {(m) => {
                const label = () => (noFlight(m) ? NO_FLIGHT.label : STATUS_CONFIG[statusOf(m)].label);
                return (
                  <li class="w-14">
                    <Show
                      when={isMe(m)}
                      fallback={
                        <div class="flex flex-col items-center gap-2" title={`${m.name}: ${label()}`}>
                          <AvatarCircle
                            initials={m.initials}
                            photo={m.image}
                            status={statusOf(m)}
                            noFlight={noFlight(m)}
                            showBadge={!noFlight(m)}
                          />
                          <Caption name={m.name} nameClass="font-semibold text-charcoal/80" status={label()} />
                        </div>
                      }
                    >
                      <button
                        type="button"
                        onClick={() => cycleMyStatus(m)}
                        aria-label={`Your status: ${STATUS_CONFIG[statusOf(m)].label}. Tap to change.`}
                        class="flex min-h-11 w-full flex-col items-center gap-2 rounded-xl
                               transition active:scale-95 focus-visible:outline-none
                               focus-visible:ring-2 focus-visible:ring-charcoal"
                      >
                        {/* The viewer's badge always shows, so a tap has visible feedback. */}
                        <AvatarCircle
                          initials={m.initials}
                          photo={myPhoto()}
                          status={statusOf(m)}
                          noFlight={noFlight(m)}
                          showBadge
                        />
                        <Caption name="You" nameClass="font-bold text-charcoal" status={STATUS_CONFIG[statusOf(m)].label} />
                      </button>
                    </Show>
                  </li>
                );
              }}
            </For>
          </ul>
        </div>

        <Show when={meInCrew()}>
          <p class="text-xs text-charcoal/75">
            Tap your avatar to update your status. The crew sees it too.
          </p>
        </Show>
      </div>
    </div>
  );
}
