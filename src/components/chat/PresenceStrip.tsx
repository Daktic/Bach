import { createMemo, For, Show } from "solid-js";
import { RingAvatar } from "~/components/crew/RingAvatar";
import type { ChatPerson } from "./ChatAvatar";

// Who has the app open right now (ADR 0011), in the same circles as the
// "Who's here" bar on Flights: a teal ring and dot when they're in the app,
// a faded circle when they're not. The viewer comes first, as "You".

const isOnline = (id: string, meId: string | undefined, online: ReadonlySet<string>) =>
  id === meId || online.has(id);

/** "3 / 10 online", for the bar's header. */
export function OnlineCount(props: { people: ChatPerson[]; meId: string | undefined; online: ReadonlySet<string> }) {
  const count = () => props.people.filter((p) => isOnline(p.id, props.meId, props.online)).length;
  return (
    <p class="flex items-center gap-1.5 text-xs font-semibold text-charcoal/80">
      <span class="h-2.5 w-2.5 rounded-full bg-teal ring-1 ring-charcoal/25" aria-hidden="true" />
      {count()} / {props.people.length} online
    </p>
  );
}

export function PresenceStrip(props: { people: ChatPerson[]; meId: string | undefined; online: ReadonlySet<string> }) {
  const ordered = createMemo(() => [
    ...props.people.filter((p) => p.id === props.meId),
    ...props.people.filter((p) => p.id !== props.meId),
  ]);

  return (
    // The row scrolls sideways, never the page. `relative` matters: without it
    // the screen-reader text under each name (absolutely positioned) belongs
    // to the sticky bar, escapes this scroller, and widens the whole page, so
    // phones zoom out.
    <div class="relative -mx-1 overflow-x-auto px-1 pb-0.5">
      <ul class="flex w-max gap-3" aria-label="Who has the app open">
        <For each={ordered()}>
          {(person) => {
            const here = () => isOnline(person.id, props.meId, props.online);
            const name = () => (person.id === props.meId ? "You" : person.name);
            return (
              <li class="flex w-11 flex-col items-center gap-1" title={`${name()}: ${here() ? "online" : "offline"}`}>
                <div class="relative">
                  <RingAvatar
                    size="sm"
                    initials={person.initials}
                    photo={person.image}
                    ring={here() ? "border-teal" : "border-charcoal/15"}
                    faded={!here()}
                  />
                  <Show when={here()}>
                    <span
                      aria-hidden="true"
                      class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-cream bg-teal"
                    />
                  </Show>
                </div>
                <span
                  class={`max-w-full truncate text-[10px] leading-3 ${
                    person.id === props.meId ? "font-bold text-charcoal" : "font-semibold text-charcoal/80"
                  }`}
                >
                  {name()}
                  <span class="sr-only">{here() ? ", online" : ", offline"}</span>
                </span>
              </li>
            );
          }}
        </For>
      </ul>
    </div>
  );
}
