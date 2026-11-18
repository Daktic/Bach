import { formatActivityTime } from "~/lib/activity-time";
import type { CrewMemberView } from "~/lib/types";
import { formatCalendarDate } from "~/lib/zoned-time";

// Shared bits for the rides page (ADR 0012).

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal";

export const primaryButton =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-charcoal px-4 text-sm font-semibold
   text-cream transition-transform active:scale-[0.98] disabled:opacity-50 ${focusRing}`;

export const secondaryButton =
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-charcoal/20 bg-cream/60 px-4
   text-sm font-semibold text-charcoal transition-transform active:scale-[0.98] hover:bg-charcoal/5
   disabled:opacity-50 ${focusRing}`;

export const textButton =
  `inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-charcoal/75 underline
   underline-offset-2 hover:text-charcoal disabled:opacity-50 ${focusRing}`;

/** Looks guests up by id; falls back to the id for someone off the roster. */
export type CrewLookup = (id: string) => { name: string; initials: string; image?: string };

export function crewLookup(crew: readonly CrewMemberView[] | undefined): CrewLookup {
  const byId = new Map((crew ?? []).map((c) => [c.id, c]));
  return (id) => byId.get(id) ?? { name: id, initials: id.slice(0, 2).toUpperCase() };
}

/** "Thu, Apr 8" from "2027-04-08T15:00". */
export const rideDay = (departAt: string) =>
  formatCalendarDate(departAt.slice(0, 10), { weekday: "short", month: "short", day: "numeric" });

/** "3:00 PM" from "2027-04-08T15:00" (Arizona time, never shifted). */
export const rideTime = (departAt: string) => formatActivityTime(departAt.slice(11, 16));

/** "Kyle", "Kyle and Matt", "Kyle, Matt and Phil". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** A small round photo or initials, beside a name that's always written out. */
export function Face(props: { initials: string; image?: string; class?: string }) {
  return (
    <span
      aria-hidden="true"
      class={`paper-card inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full
              ring-1 ring-charcoal/15 ${props.class ?? ""}`}
    >
      {props.image ? (
        <img src={props.image} alt="" referrerpolicy="no-referrer" class="h-full w-full object-cover" />
      ) : (
        <span class="select-none text-[10px] font-bold text-charcoal/75">{props.initials}</span>
      )}
    </span>
  );
}
